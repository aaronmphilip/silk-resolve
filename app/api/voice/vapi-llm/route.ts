/**
 * POST /api/voice/vapi-llm — true-streaming custom LLM for Vapi
 *
 * Architecture:
 *  - Gemini system_instruction anchors the agent's knowledge on every turn
 *  - Conversation history passed as structured contents (user/model turns)
 *  - Streaming API fires on first byte (~50-80ms TTFT)
 *  - Tokens piped directly to Vapi SSE — no wait for full response
 *  - Empty-response guard prevents Vapi from ending the call silently
 *  - DB update runs async after stream closes (never on critical path)
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { stripAll, withSilkTone, tensionToTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";

// ── Module-level config cache ─────────────────────────────────────────────────
let _cfg: { apiKey: string; provider: string; silkEnabled: boolean } | null = null;
function cfg() {
  if (_cfg) return _cfg;
  _cfg = {
    apiKey:      process.env.GEMINI_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "",
    provider:    process.env.GEMINI_API_KEY ? "gemini" : process.env.OPENAI_API_KEY ? "openai" : "anthropic",
    silkEnabled: !!(process.env.SILK_API_KEY?.trim()),
  };
  return _cfg;
}

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface OAIMessage { role: "system" | "user" | "assistant"; content: string }
interface GeminiTurn { role: "user" | "model"; parts: [{ text: string }] }
interface VapiReq {
  messages: OAIMessage[];
  stream?: boolean;
  call?: { id: string };
  metadata?: { agentId?: string };
}

// ── Build Gemini-format conversation turns ────────────────────────────────────
// Gemini requires: strict user/model alternation, starts with user, ends with user.
// We take up to the last 8 non-system messages and enforce this contract.
function buildGeminiContents(messages: OAIMessage[]): GeminiTurn[] {
  const turns = messages
    .filter(m => m.role !== "system")
    .slice(-8);

  const contents: GeminiTurn[] = [];
  for (const msg of turns) {
    const role = msg.role === "assistant" ? "model" : "user";
    // Merge consecutive same-role messages (Vapi can produce these in edge cases)
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += " " + msg.content;
    } else {
      contents.push({ role, parts: [{ text: msg.content }] });
    }
  }

  // Strip leading model turns — Gemini requires user-first
  while (contents.length > 0 && contents[0].role === "model") contents.shift();
  // Strip trailing model turns — we need the user's last message to be last
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

function sseRole(id: string) {
  return enc.encode(`data: ${JSON.stringify({
    id, object: "chat.completion.chunk",
    choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }],
  })}\n\n`);
}

function sseDone(id: string) {
  return enc.encode(
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] })}\n\n` +
    `data: [DONE]\n\n`
  );
}

// ── Fallback (non-streaming) ──────────────────────────────────────────────────
function fallback(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  return Response.json({
    id, object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

// ── Gemini streaming → Vapi SSE pipe ──────────────────────────────────────────
async function streamGemini(
  apiKey: string,
  messages: OAIMessage[],
  silkEnabled: boolean,
  onComplete: (text: string) => void,
): Promise<Response> {
  const systemContent = messages.find(m => m.role === "system")?.content ?? "";
  const contents = buildGeminiContents(messages);

  if (contents.length === 0) {
    return fallback("I'm here to help. What would you like to know?");
  }

  // system_instruction anchors the agent's full knowledge + voice rules on every turn.
  // The system prompt from vapi-config already has the voice rules — use it as-is.
  const systemInstruction = systemContent ||
    "You are a helpful voice assistant. Reply in 1–3 spoken sentences. Plain speech only — no markdown, no lists.";

  const geminiStream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.2,
        },
      }),
    }
  );

  if (!geminiStream.ok || !geminiStream.body) {
    throw new Error(`Gemini ${geminiStream.status}`);
  }

  const id = `chatcmpl-${Date.now()}`;
  let accumulated = "";
  let headerSent  = false;

  const readable = new ReadableStream({
    async start(controller) {
      const reader  = geminiStream.body!.getReader();
      const decoder = new TextDecoder();
      let   buf     = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;

            let token = "";
            try {
              const parsed = JSON.parse(raw) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
              };
              token = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            } catch { continue; }

            if (!token) continue;

            if (!headerSent) {
              controller.enqueue(sseRole(id));
              headerSent = true;
            }

            // Apply SILK tone prefix on first token
            if (accumulated === "" && silkEnabled) {
              const clean    = stripAll(token);
              const tone     = tensionToTone(0);
              const prefixed = withSilkTone(tone, clean);
              accumulated += prefixed;
              controller.enqueue(sseChunk(id, prefixed));
            } else {
              accumulated += token;
              controller.enqueue(sseChunk(id, token));
            }
          }
        }

        // Flush any remaining buffer
        if (buf.startsWith("data: ")) {
          try {
            const last = JSON.parse(buf.slice(6).trim()) as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const t = last.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (t) {
              if (!headerSent) { controller.enqueue(sseRole(id)); headerSent = true; }
              accumulated += t;
              controller.enqueue(sseChunk(id, t));
            }
          } catch {}
        }
      } finally {
        if (!headerSent) controller.enqueue(sseRole(id));
        // Guard: never let Vapi receive an empty assistant turn — it ends the call
        if (!accumulated) {
          const safe = "I'm here to help — could you say that again?";
          controller.enqueue(sseChunk(id, safe));
          accumulated = safe;
        }
        controller.enqueue(sseDone(id));
        controller.close();
        onComplete(accumulated);
      }
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

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json() as VapiReq;
  const { messages, call } = body;
  const callId = call?.id ?? "";
  const { apiKey, provider, silkEnabled } = cfg();

  if (!apiKey) return fallback("I'm having a technical issue. Please try again shortly.");

  // Non-Gemini path (OpenAI / Anthropic) — simple non-streaming fallback
  if (provider !== "gemini") {
    try {
      const { callAI } = await import("@/lib/ai");
      const system  = messages.find(m => m.role === "system")?.content ?? "";
      const lastUser = [...messages].reverse().find(m => m.role === "user")?.content ?? "";
      const raw = await callAI({
        provider: provider as "openai" | "anthropic",
        apiKey, system, user: lastUser + "\n\nReply in 1-3 spoken sentences. Plain speech only.", maxTokens: 150, jsonMode: false,
      });
      return fallback(stripAll(raw.trim()));
    } catch {
      return fallback("One moment — I'm with you.");
    }
  }

  try {
    function onComplete(spokenText: string) {
      if (!callId) return;
      void (async () => {
        try {
          const db = svc();
          const { data: session } = await db
            .from("voice_sessions")
            .select("id")
            .eq("call_sid", callId)
            .single();
          if (session?.id) {
            await db.from("voice_sessions").update({ status: "active" }).eq("id", session.id);
          }
        } catch { /* non-fatal */ }
      })();
      void spokenText;
    }

    return await streamGemini(apiKey, messages, silkEnabled, onComplete);
  } catch (err) {
    console.error("[vapi-llm]", err);
    return fallback("One moment — I'm with you.");
  }
}
