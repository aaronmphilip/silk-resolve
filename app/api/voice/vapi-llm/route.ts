/**
 * POST /api/voice/vapi-llm
 *
 * Custom LLM endpoint — Vapi sends the full conversation in OpenAI chat format.
 * Returns streaming SSE (OpenAI-compatible).
 *
 * Pipeline:
 *  1. Load session (tension, status) in parallel with prompt build
 *  2. Call gemini-2.0-flash with compact PEEK + SILK prosody prompt
 *  3. Parse: agentText, tensionLevel, intent, shouldEscalate
 *  4. composeSilkUtterance() → [tone] <prosody> text
 *  5. Fire-and-forget DB update (never on critical path)
 *  6. Stream back to Vapi
 *
 * Latency budget: ~250–450ms (gemini-2.0-flash + parallel DB + fire-and-forget)
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  composeSilkUtterance,
  silkSystemPromptBlock,
  type CallIntent,
  stripAll,
} from "@/lib/voice-emotion";

export const runtime = "nodejs";

// ── Module-level cache (one cold start per serverless instance) ──────────────
let _aiConfig: { apiKey: string; provider: string; silkEnabled: boolean } | null = null;

function getCachedAIConfig() {
  if (_aiConfig) return _aiConfig;
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    "";
  const provider = process.env.GEMINI_API_KEY
    ? "gemini"
    : process.env.OPENAI_API_KEY
    ? "openai"
    : "anthropic";
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
  max_tokens?: number;
  temperature?: number;
  call?: { id: string; customer?: { number: string } };
  metadata?: { agentId?: string; callId?: string };
}

interface PeekResponse {
  agentText: string;
  tensionLevel: number;
  shouldEscalate: boolean;
  intent: CallIntent;
}

// ── SSE streaming ─────────────────────────────────────────────────────────────
function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      // Role header
      enqueue({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] });

      // Stream in 4-word chunks — natural pacing for TTS
      const words = text.split(" ").filter(Boolean);
      for (let i = 0; i < words.length; i += 4) {
        const chunk = words.slice(i, i + 4).join(" ") + (i + 4 < words.length ? " " : "");
        enqueue({ id, object: "chat.completion.chunk", choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }] });
      }

      // Stop signal
      enqueue({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function jsonResponse(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  return Response.json({
    id,
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

// ── Gemini 2.0 Flash (fastest model, ~250ms p50) ──────────────────────────────
async function callGeminiFlash(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 180,       // slightly more room for prosody markers
        temperature: 0.3,           // slightly more creative for natural variance
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── PEEK + SILK prompt ────────────────────────────────────────────────────────
function buildPeekPrompt(
  messages: OpenAIMessage[],
  tension: number
): string {
  const systemContent = messages.find((m) => m.role === "system")?.content ?? "";
  const history = messages
    .filter((m) => m.role !== "system")
    .slice(-6)  // last 3 exchanges only
    .map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  // Tension-band context hint for the LLM
  const tensionHint =
    tension <= 2   ? "caller is calm — you can be warm and natural" :
    tension <= 4   ? "mild concern — stay friendly but focused" :
    tension <= 6   ? "elevated tension — lead with empathy, be concrete" :
    tension <= 8   ? "high tension — whisper-calm, every word counts" :
                     "critical — offer to escalate immediately";

  return `${systemContent}

${silkSystemPromptBlock()}

Current tension: ${tension.toFixed(1)}/10 — ${tensionHint}
${history ? `\nRecent:\n${history}` : ""}

Customer: "${lastUser}"

Respond as agent. Return ONLY valid JSON:
{
  "agentText": "1-2 spoken sentences. Embed at most one <prosody_marker> naturally.",
  "tensionLevel": <0.0-10.0>,
  "shouldEscalate": <true|false>,
  "intent": "complaint|query|frustrated|satisfied|angry|confused|grateful|neutral"
}`;
}

// ── Parse LLM response ────────────────────────────────────────────────────────
function parsePeekResponse(raw: string, fallbackTension: number): PeekResponse {
  try {
    const clean = raw.trim().replace(/^```json?\s*/im, "").replace(/\s*```$/m, "");
    const parsed = JSON.parse(clean) as Partial<PeekResponse>;
    return {
      agentText:     typeof parsed.agentText === "string" ? parsed.agentText : "",
      tensionLevel:  Math.min(10, Math.max(0, Number(parsed.tensionLevel ?? fallbackTension))),
      shouldEscalate: !!parsed.shouldEscalate,
      intent:        parsed.intent ?? "neutral",
    };
  } catch {
    return { agentText: "", tensionLevel: fallbackTension, shouldEscalate: false, intent: "neutral" };
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

  if (!apiKey) {
    return fallback("I'm having a technical issue right now. Please call back shortly.");
  }

  try {
    // ── Load session in parallel — never blocks prompt build ─────────────────
    const sessionPromise: Promise<{
      id: string;
      tension_level: number;
      status: string;
    } | null> = callId
      ? (async () => {
          try {
            const { data } = await db
              .from("voice_sessions")
              .select("id, tension_level, status")
              .eq("call_sid", callId)
              .single();
            return data as { id: string; tension_level: number; status: string } | null;
          } catch { return null; }
        })()
      : Promise.resolve(null);

    const session = await sessionPromise;
    const tension  = Number(session?.tension_level ?? 0);
    const sessionId = session?.id ?? null;

    // ── Call AI ───────────────────────────────────────────────────────────────
    const prompt = buildPeekPrompt(messages, tension);
    let raw = "";

    if (provider === "gemini") {
      raw = await callGeminiFlash(apiKey, prompt);
    } else {
      const { callAI } = await import("@/lib/ai");
      raw = await callAI({
        provider: provider as "openai" | "anthropic",
        apiKey,
        system: "",
        user: prompt,
        maxTokens: 180,
        jsonMode: true,
      });
    }

    // ── Parse + compose SILK utterance ───────────────────────────────────────
    const parsed = parsePeekResponse(raw, tension);
    let { agentText, tensionLevel: newTension, shouldEscalate, intent } = parsed;

    if (shouldEscalate) {
      // Fixed escalation phrase — no prosody, just clarity
      agentText = "I completely understand. <pause> Let me connect you with our senior team right now.";
      newTension = Math.max(newTension, 8);
    }

    if (!agentText.trim()) {
      agentText = "I understand. Let me help you with that.";
    }

    // composeSilkUtterance: adds [tone] prefix + prosody strategy
    const finalUtterance = composeSilkUtterance(
      agentText,
      newTension,
      intent,
      silkEnabled
    );

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

    return wantsStream ? streamText(finalUtterance) : jsonResponse(finalUtterance);
  } catch (err) {
    console.error("[vapi-llm] error:", err);
    return fallback("I'm sorry, could you please repeat that?");
  }
}
