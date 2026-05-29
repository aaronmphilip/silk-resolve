/**
 * POST /api/voice/vapi-llm
 *
 * Vapi custom LLM endpoint. It must answer fast. If the upstream model stalls,
 * Vapi fills the silence with useless fallback speech, so this route first tries
 * a deterministic answer from the agent's saved system prompt for company facts.
 */
import { NextRequest } from "next/server";
import { stripAll, tensionToTone, withSilkTone, type SilkTone } from "@/lib/voice-emotion";
import { answerNovaCareQuestion } from "@/lib/novacare-knowledge";

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
// gemini-2.0-flash has NO "thinking" stage → lowest first-token latency for voice.
// Override with GEMINI_MODEL if you set a 2.5/3 key (we disable thinking below).
const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
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
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    silkEnabled: requestedVoice === "silk" && Boolean(process.env.SILK_API_KEY?.trim()) && !silkDisabled,
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
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.line);

  return compactAnswer(scored, 2);
}

function answerFromSystemPrompt(systemPrompt: string, userText: string): string {
  const text = userText.toLowerCase();
  if (!systemPrompt.trim()) return "";

  if (/\bnovacare\b/i.test(systemPrompt)) {
    const novaCareAnswer = answerNovaCareQuestion(userText);
    if (novaCareAnswer) return novaCareAnswer;
  }

  if (/\b(plan|plans|price|pricing|cost|premium|monthly|cover|coverage|insured|policy)\b/.test(text)) {
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

function toSSE(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  const lines = [
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] })}`,
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: text }, index: 0, finish_reason: null }] })}`,
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

function reply(text: string, wantsStream: boolean, model: string, silkEnabled: boolean, userText: string): Response {
  const spoken = voiceText(text, silkEnabled, userText);
  return wantsStream ? toSSE(spoken) : toJSON(spoken, model);
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
          parts: [{
            text: systemContent ||
              "You are a helpful voice assistant. Reply in 1 to 3 plain spoken sentences. No markdown.",
          }],
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
}): Response {
  const { apiKey, model, systemContent, contents, fallback, silkEnabled, userText } = args;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const id = `chatcmpl-${Date.now()}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedText = false;
      let buffer = "";   // SSE line buffer
      let pending = "";  // raw model text not yet emitted as a complete sentence
      const startedAt = Date.now();
      let firstChunkAt = 0;

      // Emit one speakable segment. We normalize a COMPLETE sentence at a time:
      // normalizing per raw token stripped inter-token spaces and merged words
      // ("four" + " hundred" -> "fourhundred") and broke multi-word number fixes.
      function emitSegment(raw: string) {
        const clean = normalizeSpeechText(raw);
        if (!clean.trim()) return;

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

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: systemContent ||
                    "You are a helpful voice assistant. Reply in 1 to 2 plain spoken sentences. No markdown.",
                }],
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
        if (!emittedText) emitSegment(fallback || OUT_OF_SCOPE_RESPONSE);
        console.log(`[vapi-llm] gemini stream first-chunk=${firstChunkAt ? firstChunkAt - startedAt : -1}ms total=${Date.now() - startedAt}ms`);
      } catch (err) {
        console.error("[vapi-llm] Gemini stream failed:", err);
        flushPending(true);
        if (!emittedText) emitSegment(fallback || OUT_OF_SCOPE_RESPONSE);
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
  // TEMPORARY diagnostic: GET the real Gemini error without exposing the key.
  // Hit POST /api/voice/vapi-llm?debug=1 — returns key presence/length + Google's
  // raw response. Remove this block once the key is confirmed working.
  if (req.nextUrl.searchParams.get("debug") === "1") {
    const key = process.env.GEMINI_API_KEY?.trim() ?? "";
    const dbgModel = DEFAULT_MODEL.startsWith("gemini-") ? DEFAULT_MODEL : "gemini-2.0-flash";
    if (!key) {
      return Response.json({ debug: true, keyPresent: false, keyLength: 0, model: dbgModel, note: "GEMINI_API_KEY is empty/missing in this deployment's env." });
    }
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(dbgModel)}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }], generationConfig: geminiGenerationConfig(dbgModel) }),
        }
      );
      const text = await r.text();
      return Response.json({ debug: true, keyPresent: true, keyLength: key.length, model: dbgModel, httpStatus: r.status, ok: r.ok, body: text.slice(0, 500) });
    } catch (err) {
      return Response.json({ debug: true, keyPresent: true, keyLength: key.length, model: dbgModel, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const body = (await req.json().catch(() => ({}))) as VapiReq;
  const messages = normalizeMessages(body.messages);
  // The server picks the model from env (GEMINI_MODEL), not the client request —
  // this guarantees the thinking-disable config matches the model we actually call.
  const model = DEFAULT_MODEL.startsWith("gemini-") ? DEFAULT_MODEL : "gemini-2.0-flash";
  const wantsStream = body.stream !== false;
  const { apiKey, silkEnabled } = getConfig(req);

  const systemContent = messages.find((message) => message.role === "system")?.content ?? "";
  const lastUser = lastUserText(messages);
  const promptAnswer = answerFromSystemPrompt(systemContent, lastUser);

  // Company/site knowledge should not wait on Gemini. This is the path that
  // fixes the fake website agent answering from the saved agent prompt.
  if (promptAnswer) {
    return reply(promptAnswer, wantsStream, model, silkEnabled, lastUser);
  }

  if (!apiKey) {
    return reply(
      promptAnswer || OUT_OF_SCOPE_RESPONSE,
      wantsStream,
      model,
      silkEnabled,
      lastUser
    );
  }

  const contents = buildContents(messages);
  if (contents.length === 0) {
    return reply("I'm here to help. What would you like to know?", wantsStream, model, silkEnabled, lastUser);
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
    });
  }

  try {
    const text = await callGemini({ apiKey, model, systemContent, contents });
    return reply(text || promptAnswer, wantsStream, model, silkEnabled, lastUser);
  } catch (err) {
    console.error("[vapi-llm] upstream failed:", err);
    return reply(
      promptAnswer || OUT_OF_SCOPE_RESPONSE,
      wantsStream,
      model,
      silkEnabled,
      lastUser
    );
  }
}
