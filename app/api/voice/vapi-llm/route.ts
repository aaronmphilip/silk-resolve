/**
 * POST /api/voice/vapi-llm — custom LLM endpoint for Vapi
 *
 * Runtime: Edge (no Vercel response buffering — SSE flows immediately)
 *
 * Flow:
 *  1. Extract system prompt + conversation from Vapi's OpenAI-format request
 *  2. Call Gemini generateContent (non-streaming, simple + reliable)
 *  3. Stream the response back to Vapi as OpenAI SSE format
 *
 * Gemini system_instruction anchors all company knowledge on every turn.
 * Conversation history passed as proper user/model alternating turns.
 */
import { NextRequest } from "next/server";
import { stripAll, withSilkTone, tensionToTone } from "@/lib/voice-emotion";

export const runtime = "edge";

// ── Config (edge-safe — no module-level caching needed, reads env per request) ─
function cfg() {
  return {
    apiKey:      process.env.GEMINI_API_KEY ?? "",
    silkEnabled: !!(process.env.SILK_API_KEY?.trim()),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface OAIMessage { role: "system" | "user" | "assistant"; content: string }
interface GeminiTurn { role: "user" | "model"; parts: [{ text: string }] }
interface VapiReq {
  messages: OAIMessage[];
  call?: { id: string };
}

// ── Build proper Gemini conversation turns ────────────────────────────────────
// Gemini: strict user/model alternation, starts with user, ends with user.
function buildContents(messages: OAIMessage[]): GeminiTurn[] {
  const turns = messages
    .filter(m => m.role !== "system")
    .slice(-8);

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

  // Must start and end with user turn
  while (contents.length > 0 && contents[0].role === "model") contents.shift();
  while (contents.length > 0 && contents[contents.length - 1].role === "model") contents.pop();

  return contents;
}

// ── SSE helpers ───────────────────────────────────────────────────────────────
const enc = new TextEncoder();

function sseChunk(id: string, content: string) {
  return enc.encode(`data: ${JSON.stringify({
    id, object: "chat.completion.chunk",
    choices: [{ delta: { content }, index: 0, finish_reason: null }],
  })}\n\n`);
}

function sseDone(id: string) {
  return enc.encode(
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] })}\n\n` +
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] })}\n\n` +
    `data: [DONE]\n\n`
  );
}

function fallback(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  return Response.json({
    id, object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as VapiReq;
  const { messages } = body;
  const { apiKey, silkEnabled } = cfg();

  if (!apiKey) return fallback("I'm having a technical issue. Please try again shortly.");

  const systemContent = messages.find(m => m.role === "system")?.content ?? "";
  const contents = buildContents(messages);

  if (contents.length === 0) {
    return fallback("I'm here to help. What would you like to know?");
  }

  // Call Gemini (non-streaming — simple, reliable, proper error handling)
  let geminiText = "";
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: systemContent ||
                "You are a helpful voice assistant. Reply in 1–3 spoken sentences. Plain speech only.",
            }],
          },
          contents,
          generationConfig: { maxOutputTokens: 150, temperature: 0.2 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error(`[vapi-llm] Gemini ${geminiRes.status}:`, errText);
      return fallback("One moment — I'm with you.");
    }

    type GResp = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message: string } };
    const data = await geminiRes.json() as GResp;

    if (data.error) {
      console.error("[vapi-llm] Gemini error:", data.error.message);
      return fallback("One moment — I'm with you.");
    }

    geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch (err) {
    console.error("[vapi-llm] fetch error:", err);
    return fallback("One moment — I'm with you.");
  }

  if (!geminiText) {
    geminiText = "I'm here to help — could you say that again?";
  }

  // Apply SILK tone prefix if configured
  const spokenText = silkEnabled
    ? withSilkTone(tensionToTone(0), stripAll(geminiText))
    : stripAll(geminiText);

  // Stream to Vapi as SSE (Edge runtime — no Vercel buffering)
  const id = `chatcmpl-${Date.now()}`;
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(sseChunk(id, spokenText));
      controller.enqueue(sseDone(id));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
