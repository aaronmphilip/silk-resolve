/**
 * POST /api/voice/vapi-llm — custom LLM endpoint for Vapi
 *
 * Runtime: Edge (Vercel Edge — no response buffering)
 *
 * Vapi sends stream:true and expects OpenAI SSE format:
 *   data: {"choices":[{"delta":{"role":"assistant"}}]}   ← role FIRST
 *   data: {"choices":[{"delta":{"content":"Hi!"}}]}      ← content
 *   data: {"choices":[{"delta":{},"finish_reason":"stop"}]}
 *   data: [DONE]
 *
 * We call Gemini generateContent (non-streaming), get the full text,
 * then format it as SSE for Vapi. Simple, reliable, correct.
 */
import { NextRequest } from "next/server";
import { stripAll, withSilkTone, tensionToTone } from "@/lib/voice-emotion";

export const runtime = "edge";

interface OAIMessage { role: "system" | "user" | "assistant"; content: string }
interface GeminiTurn { role: "user" | "model"; parts: [{ text: string }] }
interface VapiReq   { messages: OAIMessage[]; call?: { id: string } }

// ── Config ────────────────────────────────────────────────────────────────────
function getConfig() {
  return {
    apiKey:      process.env.GEMINI_API_KEY ?? "",
    silkEnabled: !!(process.env.SILK_API_KEY?.trim()),
  };
}

// ── Build Gemini conversation turns ───────────────────────────────────────────
// Gemini requires strict user/model alternation starting and ending with user.
function buildContents(messages: OAIMessage[]): GeminiTurn[] {
  const turns = messages.filter(m => m.role !== "system").slice(-8);
  const contents: GeminiTurn[] = [];

  for (const msg of turns) {
    const role = msg.role === "assistant" ? "model" : "user";
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      // Merge consecutive same-role messages
      contents[contents.length - 1].parts[0].text += " " + msg.content;
    } else {
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Strip leading model turns (Gemini must start with user)
  while (contents.length > 0 && contents[0].role === "model") contents.shift();
  // Strip trailing model turns (last must be user, we're asking for model's reply)
  while (contents.length > 0 && contents[contents.length - 1].role === "model") contents.pop();

  return contents;
}

// ── SSE response (always — Vapi sends stream:true) ────────────────────────────
// Order matters: role → content → finish → [DONE]
function toSSE(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  const lines = [
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] })}`,
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: text }, index: 0, finish_reason: null }] })}`,
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] })}`,
    `data: [DONE]`,
    "",
  ].join("\n\n");

  return new Response(lines, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { messages } = await req.json() as VapiReq;
  const { apiKey, silkEnabled } = getConfig();

  if (!apiKey) {
    return toSSE("I'm having a technical issue. Please try again shortly.");
  }

  const systemContent = messages.find(m => m.role === "system")?.content ?? "";
  const contents      = buildContents(messages);

  if (contents.length === 0) {
    return toSSE("I'm here to help. What would you like to know?");
  }

  // ── Call Gemini (non-streaming) ───────────────────────────────────────────
  let text = "";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // system_instruction is the right way to anchor knowledge in Gemini —
          // NOT stuffed into contents[0] as a text blob.
          system_instruction: {
            parts: [{
              text: systemContent ||
                "You are a helpful voice assistant. Reply in 1–3 spoken sentences. Plain speech only — no markdown, bullets, or lists.",
            }],
          },
          contents,
          generationConfig: { maxOutputTokens: 150, temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[vapi-llm] Gemini HTTP ${res.status}:`, err);
      return toSSE("One moment — I'm with you.");
    }

    type GResp = {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message: string };
    };
    const data = await res.json() as GResp;

    if (data.error) {
      console.error("[vapi-llm] Gemini error:", data.error.message);
      return toSSE("One moment — I'm with you.");
    }

    text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!text) {
      console.error("[vapi-llm] Gemini returned empty candidates:", JSON.stringify(data));
      return toSSE("I'm here to help — could you say that again?");
    }
  } catch (err) {
    console.error("[vapi-llm] fetch error:", err);
    return toSSE("One moment — I'm with you.");
  }

  // Apply SILK tone prefix if configured, otherwise strip any LLM-generated markers
  const spoken = silkEnabled
    ? withSilkTone(tensionToTone(0), stripAll(text))
    : stripAll(text);

  return toSSE(spoken);
}
