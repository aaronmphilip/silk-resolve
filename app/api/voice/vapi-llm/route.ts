/**
 * POST /api/voice/vapi-llm — true-streaming custom LLM for Vapi
 *
 * Architecture:
 *  - Gemini streaming API fires on first byte (~50-80ms TTFT)
 *  - Tokens piped directly to Vapi SSE — no wait for full response
 *  - Vapi starts TTS on the first natural sentence break
 *  - No JSON on the hot path — plain spoken text only
 *  - Tension/DB update runs async after stream closes (never on critical path)
 *
 * Perceived latency target: 300-500ms end-to-end (endpointing done → audio)
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { stripAll, withSilkTone, tensionToTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";

// ── Module-level cache ────────────────────────────────────────────────────────
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
interface VapiReq {
  messages: OAIMessage[];
  stream?: boolean;
  call?: { id: string };
  metadata?: { agentId?: string };
}

// ── Prompt — ultra-minimal per-turn (~50 tokens) ──────────────────────────────
// System prompt (in vapi-config) already has persona + SILK rules.
// Here we only add context + last utterance. No JSON. Plain speech only.
function buildPrompt(messages: OAIMessage[]): string {
  const system = messages.find(m => m.role === "system")?.content ?? "";
  const turns  = messages.filter(m => m.role !== "system").slice(-4);
  const last   = [...messages].reverse().find(m => m.role === "user")?.content ?? "";

  const ctx = turns.length > 1
    ? turns.slice(0, -1).map(m => `${m.role === "user" ? "C" : "A"}: ${m.content}`).join("\n") + "\n"
    : "";

  return `${system}

${ctx}C: ${last}

Reply in 1-2 spoken sentences. Output spoken text only — no labels, no JSON.`;
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

// ── True Gemini streaming → Vapi SSE pipe ─────────────────────────────────────
async function streamGemini(
  apiKey: string,
  prompt: string,
  silkEnabled: boolean,
  onComplete: (text: string) => void,
): Promise<Response> {
  const geminiStream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 80,
          temperature: 0.2,
          stopSequences: ["\n\n"],  // stop at double newline — keeps responses tight
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

            // Send role header on first token
            if (!headerSent) {
              controller.enqueue(sseRole(id));
              headerSent = true;
            }

            // Apply SILK tone prefix on first token if enabled
            // (strip any LLM-generated markers first, then prepend correct tone)
            if (accumulated === "" && silkEnabled) {
              const clean = stripAll(token);
              const tone  = tensionToTone(0); // default calm; tension updated async
              const prefixed = withSilkTone(tone, clean);
              accumulated += prefixed;
              controller.enqueue(sseChunk(id, prefixed));
            } else {
              accumulated += token;
              controller.enqueue(sseChunk(id, token));
            }
          }
        }

        // Flush remaining buffer
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
        controller.enqueue(sseDone(id));
        controller.close();
        onComplete(accumulated);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",  // disable nginx/proxy buffering
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
      const raw = await callAI({
        provider: provider as "openai" | "anthropic",
        apiKey, system: "", user: buildPrompt(messages), maxTokens: 80, jsonMode: false,
      });
      return fallback(stripAll(raw.trim()));
    } catch {
      return fallback("One moment — I'm with you.");
    }
  }

  try {
    const prompt = buildPrompt(messages);

    // After stream completes, fire async DB update (never on critical path)
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
            await db.from("voice_sessions").update({
              status: "active",
            }).eq("id", session.id);
          }
        } catch { /* non-fatal */ }
      })();

      // Log the spoken text length for debugging (remove in prod if noisy)
      void spokenText;
    }

    return await streamGemini(apiKey, prompt, silkEnabled, onComplete);
  } catch (err) {
    console.error("[vapi-llm]", err);
    return fallback("One moment — I'm with you.");
  }
}
