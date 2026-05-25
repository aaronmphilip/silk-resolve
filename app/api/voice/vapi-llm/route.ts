/**
 * POST /api/voice/vapi-llm
 *
 * Vapi custom LLM endpoint. It must answer fast. If the upstream model stalls,
 * Vapi fills the silence with useless fallback speech, so this route first tries
 * a deterministic answer from the agent's saved system prompt for company facts.
 */
import { NextRequest } from "next/server";
import { stripAll, tensionToTone, withSilkTone } from "@/lib/voice-emotion";

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
const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_OUTPUT_TOKENS = 90;

function getConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
    silkEnabled: Boolean(process.env.SILK_API_KEY?.trim()),
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

  if (/\b(plan|plans|price|pricing|cost|premium|monthly|cover|coverage|insured|policy)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^plans\b/i), 4);
    if (answer) return answer;
  }

  if (/\b(claim|claims|cashless|reimbursement|hospital|pre-?auth|emergency)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^claims?\s+process\b/i), 4);
    if (answer) return answer;
  }

  if (/\b(contact|phone|email|support|chat|call|number)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^customer\s+support\b/i), 4);
    if (answer) return answer;
  }

  if (/\b(who are you|company|about|what is|what do you|nova|brand)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^about\b/i), 4);
    if (answer) return answer;
  }

  if (/\b(add family|family member|dependent|renew|pre-existing|preexisting|waiting period)\b/.test(text)) {
    const answer = compactAnswer(sectionLines(systemPrompt, /^common\s+questions\b/i), 4);
    if (answer) return answer;
  }

  return scoredPromptAnswer(systemPrompt, userText);
}

function voiceText(text: string, silkEnabled: boolean): string {
  const clean = stripAll(text).replace(/\s+/g, " ").trim();
  if (!clean) return "I can help with that. Could you say the question again?";
  return silkEnabled ? withSilkTone(tensionToTone(0), clean) : clean;
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

function reply(text: string, wantsStream: boolean, model: string, silkEnabled: boolean): Response {
  const spoken = voiceText(text, silkEnabled);
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
        generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 },
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
}): Response {
  const { apiKey, model, systemContent, contents, fallback, silkEnabled } = args;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const id = `chatcmpl-${Date.now()}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedText = false;
      let buffer = "";

      function enqueue(text: string) {
        const clean = text.replace(/\s+/g, " ");
        if (!clean.trim()) return;

        if (!emittedText) {
          emittedText = true;
          controller.enqueue(encoder.encode(sseChunk(id, { content: silkEnabled ? `[${tensionToTone(0)}] ${clean}` : clean }, null)));
          return;
        }

        controller.enqueue(encoder.encode(sseChunk(id, { content: clean }, null)));
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
              generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS, temperature: 0.2 },
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
              enqueue(text);
            } catch {}
          }
        }

        if (!emittedText) enqueue(fallback || "I can help with that. Could you say the question again?");
      } catch (err) {
        console.error("[vapi-llm] Gemini stream failed:", err);
        enqueue(fallback || "I can help with the company information I have. Could you ask that once more?");
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
  const requestedModel = body.model?.replace("gemini-2.5-flash", DEFAULT_MODEL) || DEFAULT_MODEL;
  const model = requestedModel.startsWith("gemini-") ? requestedModel : DEFAULT_MODEL;
  const wantsStream = body.stream !== false;
  const { apiKey, silkEnabled } = getConfig();

  const systemContent = messages.find((message) => message.role === "system")?.content ?? "";
  const lastUser = lastUserText(messages);
  const promptAnswer = answerFromSystemPrompt(systemContent, lastUser);

  // Company/site knowledge should not wait on Gemini. This is the path that
  // fixes the fake website agent answering from the saved agent prompt.
  if (promptAnswer) {
    return reply(promptAnswer, wantsStream, model, silkEnabled);
  }

  if (!apiKey) {
    return reply(
      promptAnswer || "I can answer from the company information I have. Please ask about plans, claims, coverage, or support.",
      wantsStream,
      model,
      silkEnabled
    );
  }

  const contents = buildContents(messages);
  if (contents.length === 0) {
    return reply("I'm here to help. What would you like to know?", wantsStream, model, silkEnabled);
  }

  if (wantsStream) {
    return streamGemini({
      apiKey,
      model,
      systemContent,
      contents,
      fallback: promptAnswer,
      silkEnabled,
    });
  }

  try {
    const text = await callGemini({ apiKey, model, systemContent, contents });
    return reply(text || promptAnswer, wantsStream, model, silkEnabled);
  } catch (err) {
    console.error("[vapi-llm] upstream failed:", err);
    return reply(
      promptAnswer || "I can help with the company information I have. Could you ask that once more, a little more specifically?",
      wantsStream,
      model,
      silkEnabled
    );
  }
}
