/**
 * POST /api/voice/vapi-llm
 *
 * Latency-first custom LLM endpoint for Vapi.
 *
 * Optimisations vs previous version:
 *  - Gemini fires IMMEDIATELY — session load races in background, never blocks
 *  - Per-turn prompt is ~80 tokens (was ~500) — SILK block lives in system prompt only
 *  - Minimal JSON schema: {"r":"text","t":5.0} — 40-60 output tokens (was 180)
 *  - No responseMimeType enforcement — trust the prompt, skip the constrained sampler
 *  - maxOutputTokens: 90 — enough for 2 spoken sentences + JSON overhead
 *  - DB update still fire-and-forget, never on critical path
 *
 * Target latency: 150–300ms (gemini-2.0-flash at ~120ms p50 + network)
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  composeSilkUtterance,
  type CallIntent,
  stripAll,
} from "@/lib/voice-emotion";

export const runtime = "nodejs";

// ── Module-level cache ────────────────────────────────────────────────────────
let _aiConfig: { apiKey: string; provider: string; silkEnabled: boolean } | null = null;

function getCachedAIConfig() {
  if (_aiConfig) return _aiConfig;
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.ANTHROPIC_API_KEY ?? "";
  const provider = process.env.GEMINI_API_KEY ? "gemini"
    : process.env.OPENAI_API_KEY ? "openai" : "anthropic";
  const silkEnabled = !!(process.env.SILK_API_KEY?.trim());
  _aiConfig = { apiKey, provider, silkEnabled };
  return _aiConfig;
}

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
interface VapiLLMRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  call?: { id: string; customer?: { number: string } };
  metadata?: { agentId?: string; callId?: string };
}
interface PeekResponse {
  agentText: string;
  tensionLevel: number;
  shouldEscalate: boolean;
  intent: CallIntent;
}

// ── SSE stream ────────────────────────────────────────────────────────────────
function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;
  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      enqueue({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] });
      const words = text.split(" ").filter(Boolean);
      for (let i = 0; i < words.length; i += 6) {
        const chunk = words.slice(i, i + 6).join(" ") + (i + 6 < words.length ? " " : "");
        enqueue({ id, object: "chat.completion.chunk", choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }] });
      }
      enqueue({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

function jsonResponse(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  return Response.json({
    id, object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

// ── Gemini 2.0 Flash — latency-first config ───────────────────────────────────
async function callGeminiFlash(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 90,   // 2 spoken sentences + JSON = ~60 tokens
          temperature: 0.25,
          // No responseMimeType — constrained sampling adds ~80ms overhead
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Ultra-compact per-turn prompt (~80 tokens) ────────────────────────────────
// SILK block lives in the system prompt (vapi-config injects it once).
// Here we only pass context + minimal instruction.
function buildTurnPrompt(messages: OpenAIMessage[], tension: number): string {
  const system = messages.find(m => m.role === "system")?.content ?? "";
  const recent = messages
    .filter(m => m.role !== "system")
    .slice(-4)  // last 2 exchanges for context
    .map(m => `${m.role === "user" ? "C" : "A"}: ${m.content}`)
    .join("\n");
  const lastUser = [...messages].reverse().find(m => m.role === "user")?.content ?? "";

  const tensionHint =
    tension <= 3 ? "calm" : tension <= 6 ? "concerned" : "distressed";

  return `${system}

TENSION: ${tension.toFixed(1)}/10 (${tensionHint})
${recent ? `CONTEXT:\n${recent}\n` : ""}
CUSTOMER: ${lastUser}

Reply in JSON only — no other text:
{"r":"1-2 natural spoken sentences (prosody marker OK)","t":0.0,"e":false,"i":"neutral"}
Fields: r=response, t=new tension 0-10, e=escalate?, i=intent (complaint/query/frustrated/satisfied/angry/confused/grateful/neutral)`;
}

// ── Parse — loose (no strict JSON mode means we need robust parsing) ──────────
function parseTurnResponse(raw: string, fallbackTension: number): PeekResponse {
  try {
    const clean = raw.trim()
      .replace(/^```json?\s*/im, "").replace(/\s*```$/m, "")
      .replace(/^[^{]*({[\s\S]*})[^}]*$/, "$1"); // extract first {...}
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    return {
      agentText:     typeof parsed.r === "string" ? parsed.r : (typeof parsed.agentText === "string" ? parsed.agentText : ""),
      tensionLevel:  Math.min(10, Math.max(0, Number(parsed.t ?? parsed.tensionLevel ?? fallbackTension))),
      shouldEscalate: !!(parsed.e ?? parsed.shouldEscalate),
      intent:        (parsed.i as CallIntent) ?? (parsed.intent as CallIntent) ?? "neutral",
    };
  } catch {
    // Last resort: try to extract quoted text from response
    const match = raw.match(/"r"\s*:\s*"([^"]+)"/);
    return {
      agentText:    match ? match[1] : "",
      tensionLevel: fallbackTension,
      shouldEscalate: false,
      intent:       "neutral",
    };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const db = svc();
  const body = await req.json() as VapiLLMRequest;
  const { messages, stream: wantsStream = true, call, metadata } = body;
  const callId = call?.id ?? metadata?.callId ?? "";

  const { apiKey, provider, silkEnabled } = getCachedAIConfig();
  const fallback = (text: string) =>
    wantsStream ? streamText(text) : jsonResponse(text);

  if (!apiKey) return fallback("I'm having a technical issue. Please try again shortly.");

  try {
    // ── Session load races in background — Gemini fires immediately ──────────
    // Default tension = 0; session updates it if it loads in time.
    // This removes the serial DB → Gemini dependency that was adding 50–150ms.
    let tension = 0;
    let sessionId: string | null = null;

    const sessionRace = callId
      ? Promise.race([
          (async () => {
            const { data } = await db.from("voice_sessions")
              .select("id, tension_level")
              .eq("call_sid", callId)
              .single();
            return data as { id: string; tension_level: number } | null;
          })(),
          new Promise<null>(r => setTimeout(() => r(null), 80)), // 80ms cap
        ])
      : Promise.resolve(null);

    // Build prompt + call Gemini in parallel with session load
    const [sessionData, raw] = await Promise.all([
      sessionRace,
      callGeminiFlash(apiKey, buildTurnPrompt(messages, 0)), // use 0 as default
    ]);

    if (sessionData) {
      tension = Number(sessionData.tension_level ?? 0);
      sessionId = sessionData.id;
    }

    // ── Parse response ────────────────────────────────────────────────────────
    let { agentText, tensionLevel: newTension, shouldEscalate, intent } =
      parseTurnResponse(raw, tension);

    if (shouldEscalate) {
      agentText = "I completely understand. Let me connect you with our senior team right now.";
      newTension = Math.max(newTension, 8);
    }
    if (!agentText.trim()) {
      agentText = "I'm with you. Could you tell me a bit more about that?";
    }

    const finalUtterance = composeSilkUtterance(agentText, newTension, intent, silkEnabled);

    // ── DB update — fire and forget ──────────────────────────────────────────
    if (sessionId) {
      void (async () => {
        try {
          await db.from("voice_sessions").update({
            tension_level: newTension,
            status: shouldEscalate ? "escalated" : "active",
          }).eq("id", sessionId);
        } catch { /* non-fatal */ }
      })();
    }

    // Use a non-Gemini provider if configured
    if (provider !== "gemini") {
      const { callAI } = await import("@/lib/ai");
      const altRaw = await callAI({ provider: provider as "openai" | "anthropic", apiKey, system: "", user: buildTurnPrompt(messages, tension), maxTokens: 90, jsonMode: true });
      const altParsed = parseTurnResponse(altRaw, tension);
      const altText = altParsed.agentText || agentText;
      const altUtterance = composeSilkUtterance(altText, altParsed.tensionLevel, altParsed.intent, silkEnabled);
      return wantsStream ? streamText(altUtterance) : jsonResponse(altUtterance);
    }

    return wantsStream ? streamText(finalUtterance) : jsonResponse(finalUtterance);
  } catch (err) {
    console.error("[vapi-llm] error:", err);
    return fallback("One moment — I'm with you.");
  }
}
