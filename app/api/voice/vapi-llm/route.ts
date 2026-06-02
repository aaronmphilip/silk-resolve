/**
 * POST /api/voice/vapi-llm
 *
 * Vapi custom LLM endpoint. It must answer fast. If the upstream model stalls,
 * Vapi fills the silence with useless fallback speech, so this route first tries
 * a deterministic answer from the agent's saved system prompt for company facts.
 */
import { NextRequest } from "next/server";
import { stripAll, tensionToTone, withSilkTone, type SilkTone } from "@/lib/voice-emotion";
import { answerNovaCareQuestion, cachedMugaAudioForText } from "@/lib/novacare-knowledge";

export const runtime = "nodejs";
export const maxDuration = 30;

interface OAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GeminiTurn {
  role: "user" | "model";
  parts: [{ text: string }];
}

interface VapiReq {
  model?: string;
  messages?: OAIMessage[];
  stream?: boolean;
}

const GEMINI_TIMEOUT_MS = 5_500;
// Default to gemini-2.5-flash-lite: the fastest FREE model on this account —
// measured ~800ms server-side TTFT vs ~1.2s (2.5-flash) and ~1.65s (flash-latest);
// 2.0-flash is 429 "limit: 0". geminiGenerationConfig() disables its thinking stage
// so first-token latency stays low for voice. Override via GEMINI_MODEL if needed.
const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
const MAX_OUTPUT_TOKENS = 90;

// Gemini 2.5/3 models "think" before answering by default, adding 2–4s of dead
// air before the first token — fatal for a voice call. thinkingBudget:0 disables
// it so replies stream immediately. 2.0-flash has no thinking stage, so we skip it.
function geminiGenerationConfig(model: string): Record<string, unknown> {
  const config: Record<string, unknown> = { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 };
  if (/gemini-(?:2\.5|3)/i.test(model)) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  return config;
}
const OUT_OF_SCOPE_RESPONSE =
  "I don't have that information in this support script. I can help with NovaCare plans, claims, coverage, support, or network hospitals.";

function getConfig(req: NextRequest) {
  const silkDisabled = ["0", "false", "off", "no"].includes(
    process.env.SILK_VAPI_VOICE?.trim().toLowerCase() ?? ""
  );
  const requestedVoice = req.nextUrl.searchParams.get("voice") === "vapi" ? "vapi" : "silk";
  const clientLeadEnabled = req.nextUrl.searchParams.get("clientLead") === "1";
  const localClientEnabled = req.nextUrl.searchParams.get("local") === "1";
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    silkEnabled: requestedVoice === "silk" && Boolean(process.env.SILK_API_KEY?.trim()) && !silkDisabled,
    clientLeadEnabled,
    localClientEnabled,
  };
}

function normalizeMessages(input: unknown): OAIMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw): OAIMessage | null => {
      if (!raw || typeof raw !== "object") return null;
      const item = raw as { role?: unknown; content?: unknown; message?: unknown; text?: unknown };
      const roleText = typeof item.role === "string" ? item.role.toLowerCase() : "user";
      const role: OAIMessage["role"] =
        roleText === "system" ? "system" :
        roleText === "assistant" || roleText === "agent" || roleText === "bot" ? "assistant" :
        "user";
      const content =
        typeof item.content === "string" ? item.content :
        typeof item.message === "string" ? item.message :
        typeof item.text === "string" ? item.text :
        "";
      return content.trim() ? { role, content: content.trim() } : null;
    })
    .filter((message): message is OAIMessage => Boolean(message));
}

function lastUserText(messages: OAIMessage[]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function buildContents(messages: OAIMessage[]): GeminiTurn[] {
  const turns = messages.filter((message) => message.role !== "system").slice(-8);
  const contents: GeminiTurn[] = [];

  for (const message of turns) {
    const role = message.role === "assistant" ? "model" : "user";
    const previous = contents[contents.length - 1];
    if (previous?.role === role) {
      previous.parts[0].text += ` ${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

  while (contents.length > 0 && contents[0].role === "model") contents.shift();
  while (contents.length > 0 && contents[contents.length - 1].role === "model") contents.pop();
  return contents;
}

function cleanPromptLine(line: string): string {
  return line
    .replace(/â|â€”/g, "—")
    .replace(/â/g, "–")
    .replace(/â¹/g, "₹")
    .replace(/^[-*\d.)\s]+/, "")
    .replace(/\{\{\s*preferred_address\s*\}\}/gi, "you")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, "you")
    .replace(/\s+/g, " ")
    .trim();
}

function isHeading(line: string): boolean {
  const text = line.trim();
  return /^[A-Z][A-Z0-9 '&/().-]{2,}:?$/.test(text) && text.length <= 80;
}

function sectionLines(systemPrompt: string, headingPattern: RegExp): string[] {
  const lines = systemPrompt.split(/\r?\n/);
  const start = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (start < 0) return [];

  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (out.length > 0 && isHeading(line)) break;
    const clean = cleanPromptLine(line);
    if (clean) out.push(clean);
    if (out.length >= 5) break;
  }
  return out;
}

function compactAnswer(lines: string[], maxLines = 3): string {
  return lines
    .filter(Boolean)
    .slice(0, maxLines)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function speakable(text: string): string {
  return text
    .replace(/â|â€”/g, "—")
    .replace(/â/g, "–")
    .replace(/â¹/g, "₹")
    .replace(/₹\s*([\d,]+)\s*\/\s*month/gi, "$1 rupees per month")
    .replace(/₹\s*([\d,]+)/g, "$1 rupees")
    .replace(/[—–]/g, ", ")
    .replace(/\+/g, " plus ")
    .replace(/\bOPD\b/g, "O P D")
    .replace(/\bICU\b/g, "I C U")
    .replace(/\bIRDAI\b/g, "I R D A I")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpeechText(text: string): string {
  return speakable(text)
    .replace(/Ã¢Â€Â”|Ã¢â‚¬â€|â€”|—/g, ", ")
    .replace(/Ã¢Â€Â“|â€“|–/g, ", ")
    .replace(/Ã¢Â‚Â¹|â‚¹|₹/g, "Rs ")
    .replace(/\bRs\.?\s*499\s*(?:\/\s*(?:month|mo)|per month)?/gi, "four hundred ninety nine rupees per month")
    .replace(/\bRs\.?\s*899\s*(?:\/\s*(?:month|mo)|per month)?/gi, "eight hundred ninety nine rupees per month")
    .replace(/\bRs\.?\s*1,?499\s*(?:\/\s*(?:month|mo)|per month)?/gi, "one thousand four hundred ninety nine rupees per month")
    .replace(/\b499\s+rupees\s+per\s+month\b/gi, "four hundred ninety nine rupees per month")
    .replace(/\b899\s+rupees\s+per\s+month\b/gi, "eight hundred ninety nine rupees per month")
    .replace(/\b1,?499\s+rupees\s+per\s+month\b/gi, "one thousand four hundred ninety nine rupees per month")
    .replace(/\b3\s*lakh\b/gi, "three lakh")
    .replace(/\b5\s*lakh\b/gi, "five lakh")
    .replace(/\b10\s*lakh\b/gi, "ten lakh")
    .replace(/\b10,?000\+?\b/g, "over ten thousand")
    .replace(/\b2\.4\s*million\b/gi, "two point four million")
    .replace(/\b98\.2\s*%/g, "ninety eight point two percent")
    .replace(/\b24\s*\/\s*7\b/g, "twenty four seven")
    .replace(/\b30-day\b/gi, "thirty day")
    .replace(/\b30\s+minutes\b/gi, "thirty minutes")
    .replace(/\b7\s+working\s+days\b/gi, "seven working days")
    .replace(/\b2-year\b/gi, "two year")
    .replace(/\bOPD\b/g, "O P D")
    .replace(/\bICU\b/g, "I C U")
    .replace(/\bIRDAI\b/g, "I R D A I")
    .replace(/\biOS\b/g, "i O S")
    .replace(/support@novacare\.in/gi, "support at novacare dot in")
    .replace(/1800-668-2273/g, "one eight zero zero, six six eight, two two seven three")
    .replace(/\s+/g, " ")
    .trim();
}

function planSummary(lines: string[]): string {
  const plans = lines
    .map((line) => line.split(/\s+(?:[—–-]|â€”)\s+/).map((part) => part.trim()).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .slice(0, 3)
    .map((parts) => `${parts[0]} is ${parts[1]}`);

  if (plans.length === 0) return "";
  return `${plans.join(". ")}. Which plan should I compare for you?`;
}

function firstMatchingLine(lines: string[], pattern: RegExp): string {
  return lines.find((line) => pattern.test(line)) ?? "";
}

function specificNovaCareScriptAnswer(userText: string): string {
  const text = userText.toLowerCase();

  if (/\b(e\s*-?\s*card|ecard)\b/.test(text) && /\b(cannot|can't|cant|lost|missing|find|forgot|don't have|dont have|not showing)\b/.test(text)) {
    return "I don't have the exact e-card recovery steps in this support script. For admission, keep your policy ID and government ID ready, and use NovaCare live chat or the emergency helpline for help before treatment.";
  }

  if (/\b(opd|outpatient)\b/.test(text)) {
    return "This support script does not define O P D. It only says NovaCare Standard includes O P D up to ten thousand rupees per year, and Premium includes O P D up to twenty five thousand rupees per year.";
  }

  if (/\bcritical illness|critical rider|illness rider|rider\b/.test(text)) {
    return "This support script does not define the critical illness rider or list the illnesses. It only says NovaCare Premium includes a critical illness rider.";
  }

  if (/\b(room eligibility|private room|room eligible|room rent|private-room)\b/.test(text)) {
    return "This support script does not define private-room eligibility or room rent rules. It only says NovaCare Premium includes private-room eligibility.";
  }

  if (/\b(android|ios|iphone|app)\b/.test(text) && /\b(use|available|download|phone|mobile|install|login|access)\b/.test(text)) {
    return "Yes. The support script says the NovaCare app is available on i O S and Android. It also says the app supports reimbursement uploads, renewal settings, and adding dependents.";
  }

  if (
    /\b(delay|delays|faster|fast|speed|reduce|avoid)\b/.test(text) &&
    /\b(admission|preauth|pre-auth|cashless|hospital)\b/.test(text)
  ) {
    return "To reduce admission delays, use a NovaCare network hospital, show your e-card early, and keep your policy ID, government ID, diagnosis note, and admission request ready. The normal cashless pre-auth target is thirty minutes after the hospital sends the request.";
  }

  if (/\b(prepare|ready|carry|keep)\b/.test(text) && /\b(doctor|admission|hospital|visit)\b/.test(text)) {
    return "Before a hospital visit, keep your NovaCare policy ID, e-card, government ID, diagnosis note, and admission request ready. For cashless treatment, confirm the hospital is in the NovaCare network in the app.";
  }

  return "";
}

function queryTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && ![
      "what",
      "tell",
      "about",
      "your",
      "does",
      "have",
      "with",
      "answer",
      "short",
      "sentence",
      "please",
      "could",
      "would",
      "people",
      "health",
      "insurance",
      "should",
      "cannot",
      "cant",
      "have",
      "novacare",
      "customer",
    ].includes(token));
}

function scoredPromptAnswer(systemPrompt: string, userText: string): string {
  const tokens = queryTokens(userText);
  if (tokens.length === 0) return "";

  const knowledgePrompt = systemPrompt.split(/\bVOICE CALL RULES:/i)[0] ?? systemPrompt;
  const instructionLine = /^(you are|reply|short questions|detailed questions|use natural|you may add|never|if you cannot|be concise|no markdown|your role|voice call rules)\b/i;

  const candidates = knowledgePrompt
    .split(/\r?\n/)
    .map(cleanPromptLine)
    .filter((line) => line.length >= 18 && !instructionLine.test(line));

  const scored = candidates
    .map((line) => ({
      line,
      score: tokens.reduce((score, token) => score + (line.toLowerCase().includes(token) ? 1 : 0), 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestScore = scored[0]?.score ?? 0;
  if (bestScore < 2) return "";

  const scoredLines = scored
    .filter((item) => item.score === bestScore)
    .slice(0, 2)
    .map((item) => item.line);

  return compactAnswer(scoredLines, 2);
}

function answerFromSystemPrompt(systemPrompt: string, userText: string): string {
  const text = userText.toLowerCase();
  if (!systemPrompt.trim()) return "";

  if (/\bnovacare\b/i.test(systemPrompt)) {
    const specificAnswer = specificNovaCareScriptAnswer(userText);
    if (specificAnswer) return specificAnswer;

    const novaCareAnswer = answerNovaCareQuestion(userText);
    if (novaCareAnswer) return novaCareAnswer;
  }

  if (/\b(plan|plans|price|pricing|cost|premium|monthly|cover|coverage|insured|benefit|limit)\b/.test(text)) {
    const lines = sectionLines(systemPrompt, /^plans\b/i);
    const answer = planSummary(lines) || compactAnswer(lines, 2);
    if (answer) return answer;
  }

  if (/\b(claim|claims|cashless|reimbursement|hospital|pre-?auth|emergency)\b/.test(text)) {
    const lines = sectionLines(systemPrompt, /^claims?\s+process\b/i);
    const cashless = firstMatchingLine(lines, /\bcashless\b/i);
    const reimbursement = firstMatchingLine(lines, /\breimbursement\b/i);
    const answer = compactAnswer([cashless, reimbursement].filter(Boolean), 2) || compactAnswer(lines, 2);
    if (answer) return answer;
  }

  if (/\b(contact|phone|email|support|chat|call|number)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^customer\s+support\b/i), 2);
    if (answer) return answer;
  }

  if (/\b(who are you|company|about|what is|what do you|nova|brand)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^about\b/i), 2);
    if (answer) return answer;
  }

  if (/\b(add family|family member|dependent|renew|pre-existing|preexisting|waiting period)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^common\s+questions\b/i), 2);
    if (answer) return answer;
  }

  return scoredPromptAnswer(systemPrompt, userText);
}

function geminiSystemInstruction(systemContent: string): string {
  const base = systemContent ||
    "You are a helpful voice assistant. Reply in 1 to 3 plain spoken sentences. No markdown.";

  return `${base}

STRICT ANSWER SELECTION:
- Answer the caller's exact question first.
- Do not mention plan names, prices, or coverage amounts unless the caller asks about plans, prices, coverage, or limits.
- Do not paste unrelated facts from the script just because they share generic words like health or insurance.
- Do not invent app screens, recovery flows, benefit definitions, or operational steps that are not stated in the script.
- If the exact detail is not in the script, say you do not have that exact detail in this support script, then offer the closest supported next step.
- Keep the answer to one or two spoken sentences.`;
}

function estimateTension(userText: string): number {
  const text = userText.toLowerCase();
  if (/\b(angry|furious|terrible|worst|useless|scam|fraud|cheated|complaint|cancel)\b/.test(text)) return 7;
  if (/\b(frustrated|upset|not happy|problem|issue|wrong|again|repeat)\b/.test(text)) return 5;
  if (/\b(confused|don't understand|dont understand|what do you mean|help)\b/.test(text)) return 3;
  return 1;
}

function toneFor(userText: string, answer: string): SilkTone {
  const text = userText.toLowerCase();
  const response = answer.toLowerCase();
  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated)\b/.test(text)) return "sad";
  if (/\b(frustrated|upset|problem|issue|wrong|not happy|complaint)\b/.test(text)) return "sad";
  if (/\b(thanks|thank you|great|nice|good)\b/.test(text) || /\bapproved|covered|available|yes\b/.test(response)) return "happy";
  if (/\b(compare|price|coverage|claim|hospital|network|how|what|which|again|repeat)\b/.test(text)) return "neutral";
  return tensionToTone(estimateTension(userText));
}

function humanizeForVoice(answer: string, userText: string): string {
  const clean = answer.trim();
  const text = userText.toLowerCase();
  if (!clean) return clean;

  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated|not happy|frustrated|upset)\b/.test(text)) {
    if (/^(i understand|i get|that sounds|sorry)/i.test(clean)) return clean;
    return `I understand. ${clean}`;
  }

  if (/\b(again|repeat|say that)\b/.test(text)) {
    if (/^sure[,.]/i.test(clean)) return clean;
    return `Sure. ${clean}`;
  }

  if (/\b(thanks|thank you)\b/.test(text)) {
    return "Glad to help. What else would you like me to check?";
  }

  return clean;
}

function voiceText(text: string, silkEnabled: boolean, userText: string): string {
  const clean = normalizeSpeechText(stripAll(text)).trim();
  if (!clean) return OUT_OF_SCOPE_RESPONSE;
  const human = humanizeForVoice(clean, userText);
  return silkEnabled ? withSilkTone(toneFor(userText, human), human) : human;
}

function fastLeadFor(userText: string, answer: string): string {
  const cleanAnswer = stripAll(answer).trim();
  if (!cleanAnswer) return "";
  if (cachedMugaAudioForText(cleanAnswer)) return "";
  if (/^(sure|yes|no|okay|ok|got it|glad|i understand|i can help|let me)\b[,.!]?/i.test(cleanAnswer)) return "";

  const text = userText.toLowerCase();
  if (/\b(thanks|thank you)\b/.test(text)) return "";
  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated|not happy|frustrated|upset|complaint)\b/.test(text)) {
    return "I understand.";
  }
  return "Let me check that.";
}

function browserHandledPlaceholder(userText: string): string {
  const text = userText.toLowerCase();
  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated|not happy|frustrated|upset|complaint)\b/.test(text)) {
    return "I understand.";
  }
  return "Got it.";
}

function stripLeadingFastLead(text: string, lead: string): string {
  const cleanLead = stripAll(lead).trim();
  if (!cleanLead) return text;
  const escaped = cleanLead.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return text.replace(new RegExp(`^\\s*${escaped}\\s*[,.;:!?-]*\\s*`, "i"), "").trim();
}

function splitTonePrefix(text: string): { prefix: string; rest: string } {
  const match = text.match(/^\s*\[(neutral|happy|sad|excited|angry|whisper)\]\s*/i);
  if (!match) return { prefix: "", rest: text };
  return { prefix: match[0].trim() + " ", rest: text.slice(match[0].length).trim() };
}

function toSSE(text: string, fastLead = ""): Response {
  const id = `chatcmpl-${Date.now()}`;
  const { prefix, rest } = splitTonePrefix(text);
  const dedupedRest = fastLead ? stripLeadingFastLead(rest, fastLead) : rest;
  const lines = [
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] })}`,
    ...(fastLead ? [
      `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: `${prefix}${fastLead}` }, index: 0, finish_reason: null }] })}`,
      ...(dedupedRest ? [`data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: ` ${dedupedRest}` }, index: 0, finish_reason: null }] })}`] : []),
    ] : [
      `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: text }, index: 0, finish_reason: null }] })}`,
    ]),
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] })}`,
    "data: [DONE]",
    "",
  ].join("\n\n");

  return new Response(lines, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function sseChunk(id: string, delta: Record<string, string>, finishReason: string | null): string {
  return `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    choices: [{ delta, index: 0, finish_reason: finishReason }],
  })}\n\n`;
}

function toJSON(text: string, model: string): Response {
  return Response.json({
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

function reply(
  text: string,
  wantsStream: boolean,
  model: string,
  silkEnabled: boolean,
  userText: string,
  clientLeadEnabled: boolean
): Response {
  const spoken = voiceText(text, silkEnabled, userText);
  const lead = silkEnabled && !clientLeadEnabled ? fastLeadFor(userText, spoken) : "";
  return wantsStream ? toSSE(spoken, lead) : toJSON(spoken, model);
}

async function callGemini(args: {
  apiKey: string;
  model: string;
  systemContent: string;
  contents: GeminiTurn[];
}): Promise<string> {
  const { apiKey, model, systemContent, contents } = args;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: geminiSystemInstruction(systemContent) }],
        },
        contents,
        generationConfig: geminiGenerationConfig(model),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${err.slice(0, 160)}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (data.error?.message) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

function streamGemini(args: {
  apiKey: string;
  model: string;
  systemContent: string;
  contents: GeminiTurn[];
  fallback: string;
  silkEnabled: boolean;
  userText: string;
  clientLeadEnabled: boolean;
}): Response {
  const { apiKey, model, systemContent, contents, fallback, silkEnabled, userText, clientLeadEnabled } = args;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const id = `chatcmpl-${Date.now()}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedText = false;
      let emittedAnswerText = false;
      let buffer = "";   // SSE line buffer
      let pending = "";  // raw model text not yet emitted as a complete sentence
      const startedAt = Date.now();
      let firstChunkAt = 0;
      const lead = silkEnabled && !clientLeadEnabled ? fastLeadFor(userText, "response") : "";

      // Emit one speakable segment. We normalize a COMPLETE sentence at a time:
      // normalizing per raw token stripped inter-token spaces and merged words
      // ("four" + " hundred" -> "fourhundred") and broke multi-word number fixes.
      function emitSegment(raw: string, isLead = false) {
        let clean = normalizeSpeechText(raw);
        if (!isLead && lead) clean = stripLeadingFastLead(clean, lead);
        if (!clean.trim()) return;
        if (!isLead) emittedAnswerText = true;

        if (!emittedText) {
          emittedText = true;
          firstChunkAt = Date.now();
          controller.enqueue(encoder.encode(sseChunk(id, { content: silkEnabled ? withSilkTone(toneFor(userText, clean), clean) : clean }, null)));
          return;
        }

        // Lead with a space so concatenated deltas keep sentence separation.
        controller.enqueue(encoder.encode(sseChunk(id, { content: ` ${clean}` }, null)));
      }

      // Flush every COMPLETE sentence in `pending`. A sentence counts as complete
      // only once trailing whitespace has arrived, so we never split "3.5" or an
      // abbreviation mid-number. `force` flushes the trailing remainder at stream end.
      function flushPending(force: boolean) {
        // The FIRST chunk should leave for TTS as early as possible so the agent
        // starts speaking sooner. Emit on the first complete sentence, else the
        // first clause break (>=15 chars), else once ~40 chars have built up —
        // whichever comes first. Later chunks stay sentence-buffered for smoother
        // prosody and to keep multi-word number normalization intact.
        if (!emittedAnswerText) {
          const early =
            pending.match(/^[\s\S]*?[.!?]+\s/) ||
            pending.match(/^[\s\S]{15,}?[,;:—–]\s/) ||
            pending.match(/^[\s\S]{40,}?\s/);
          if (early) {
            emitSegment(early[0]);
            pending = pending.slice(early[0].length);
          }
        }
        let match: RegExpMatchArray | null;
        while ((match = pending.match(/^[\s\S]*?[.!?]+\s/))) {
          emitSegment(match[0]);
          pending = pending.slice(match[0].length);
        }
        if (force && pending.trim()) {
          emitSegment(pending);
          pending = "";
        }
      }

      try {
        controller.enqueue(encoder.encode(sseChunk(id, { role: "assistant" }, null)));
        if (lead) emitSegment(lead, true);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: geminiSystemInstruction(systemContent) }],
              },
              contents,
              generationConfig: geminiGenerationConfig(model),
            }),
          }
        );

        if (!response.ok || !response.body) {
          const err = await response.text().catch(() => "");
          throw new Error(`Gemini stream HTTP ${response.status}: ${err.slice(0, 160)}`);
        }

        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const data = JSON.parse(payload) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              const text = data.candidates?.[0]?.content?.parts
                ?.map((part) => part.text ?? "")
                .join("") ?? "";
              if (text) {
                pending += text;
                flushPending(false);
              }
            } catch {}
          }
        }

        flushPending(true);
        if (!emittedAnswerText) emitSegment(fallback || OUT_OF_SCOPE_RESPONSE);
        console.log(`[vapi-llm] gemini stream first-chunk=${firstChunkAt ? firstChunkAt - startedAt : -1}ms total=${Date.now() - startedAt}ms`);
      } catch (err) {
        console.error("[vapi-llm] Gemini stream failed:", err);
        flushPending(true);
        if (!emittedAnswerText) emitSegment(fallback || OUT_OF_SCOPE_RESPONSE);
      } finally {
        controller.enqueue(encoder.encode(sseChunk(id, {}, "stop")));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as VapiReq;
  const messages = normalizeMessages(body.messages);
  // The server picks the model from env (GEMINI_MODEL), not the client request —
  // this guarantees the thinking-disable config matches the model we actually call.
  const model = DEFAULT_MODEL.startsWith("gemini-") ? DEFAULT_MODEL : "gemini-2.5-flash-lite";
  const wantsStream = body.stream !== false;
  const { apiKey, silkEnabled, clientLeadEnabled, localClientEnabled } = getConfig(req);

  const systemContent = messages.find((message) => message.role === "system")?.content ?? "";
  const lastUser = lastUserText(messages);
  const promptAnswer = answerFromSystemPrompt(systemContent, lastUser);

  // The web client can handle fast local MUGA playback itself. In that mode the
  // Vapi call still needs a tiny response to keep the turn healthy, but it should
  // not trigger a duplicate full MUGA generation in the background.
  if (clientLeadEnabled && !localClientEnabled) {
    return reply(browserHandledPlaceholder(lastUser), wantsStream, model, silkEnabled, lastUser, clientLeadEnabled);
  }

  // Company/site knowledge should not wait on Gemini. This is the path that
  // fixes the fake website agent answering from the saved agent prompt.
  if (promptAnswer) {
    return reply(promptAnswer, wantsStream, model, silkEnabled, lastUser, clientLeadEnabled);
  }

  if (!apiKey) {
    return reply(
      promptAnswer || OUT_OF_SCOPE_RESPONSE,
      wantsStream,
      model,
      silkEnabled,
      lastUser,
      clientLeadEnabled
    );
  }

  const contents = buildContents(messages);
  if (contents.length === 0) {
    return reply(
      "I'm here to help. What would you like to know?",
      wantsStream,
      model,
      silkEnabled,
      lastUser,
      clientLeadEnabled
    );
  }

  if (wantsStream) {
    return streamGemini({
      apiKey,
      model,
      systemContent,
      contents,
      fallback: promptAnswer,
      silkEnabled,
      userText: lastUser,
      clientLeadEnabled,
    });
  }

  try {
    const text = await callGemini({ apiKey, model, systemContent, contents });
    return reply(text || promptAnswer, wantsStream, model, silkEnabled, lastUser, clientLeadEnabled);
  } catch (err) {
    console.error("[vapi-llm] upstream failed:", err);
    return reply(
      promptAnswer || OUT_OF_SCOPE_RESPONSE,
      wantsStream,
      model,
      silkEnabled,
      lastUser,
      clientLeadEnabled
    );
  }
}

export async function GET(req: NextRequest) {
  const { silkEnabled } = getConfig(req);
  return Response.json(
    { ok: true, silkEnabled, model: DEFAULT_MODEL.startsWith("gemini-") ? DEFAULT_MODEL : "gemini-2.5-flash-lite" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
