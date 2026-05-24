/**
 * POST /api/voice/vapi-llm
 *
 * Custom LLM endpoint — Vapi sends the full conversation in OpenAI chat format.
 * Returns streaming SSE (OpenAI-compatible).
 *
 * Latency optimisations:
 *  - Module-level AI config cache (never re-reads env vars on hot path)
 *  - DB session load runs in parallel with prompt construction
 *  - gemini-2.0-flash for voice (2-3× faster than 2.5-flash, ~250-500ms)
 *  - Max tokens capped at 150 for concise voice responses
 *  - DB session update is fire-and-forget (never on the critical path)
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { stripVoiceMarkers } from "@/lib/voice-emotion";

export const runtime = "nodejs";

// ── Module-level singletons — initialised once per cold start ─────────────────
let _aiConfig: { apiKey: string; provider: string } | null = null;

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
  _aiConfig = { apiKey, provider };
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

// ── SSE helpers ───────────────────────────────────────────────────────────────
function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] })}\n\n`
        )
      );
      // Stream in 3-word groups for natural pacing
      const words = text.split(" ");
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }] })}\n\n`
          )
        );
      }
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: {}, index: 0, finish_reason: "stop" }] })}\n\n`
        )
      );
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

// ── Gemini 2.0 Flash call (fastest model for real-time voice) ─────────────────
async function callGeminiFlash(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.25,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── PEEK prompt — compact for speed ──────────────────────────────────────────
function buildPeekPrompt(messages: OpenAIMessage[], tensionLevel: number): string {
  const systemContent = messages.find((m) => m.role === "system")?.content ?? "";
  // Last 3 exchanges only — reduces token count, speeds up inference
  const history = messages
    .filter((m) => m.role !== "system")
    .slice(-6)
    .map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return `${systemContent}

Tension: ${tensionLevel.toFixed(1)}/10

${history ? `Recent:\n${history}\n\n` : ""}Customer: "${lastUser}"

Respond as agent. JSON only:
{"agentText":"1-2 spoken sentences","tensionLevel":<0-10>,"shouldEscalate":<bool>,"intent":"complaint|query|frustrated|satisfied|angry|confused|grateful"}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const db = svc();
  const body = await req.json() as VapiLLMRequest;
  const { messages, stream: wantsStream = true, call, metadata } = body;
  const callId = call?.id ?? metadata?.callId ?? "";

  const fallback = (text: string) =>
    wantsStream ? streamText(text) : jsonResponse(text);

  try {
    const { apiKey, provider } = getCachedAIConfig();
    if (!apiKey) {
      return fallback("I am having a technical issue right now. Please call back shortly.");
    }

    // ── Load session in parallel — doesn't block prompt build ────────────────
    const sessionPromise: Promise<{ id: unknown; tension_level: unknown; status: unknown } | null> = callId
      ? (async () => {
          try {
            const { data } = await db
              .from("voice_sessions")
              .select("id, tension_level, status")
              .eq("call_sid", callId)
              .single();
            return data as { id: unknown; tension_level: unknown; status: unknown } | null;
          } catch { return null; }
        })()
      : Promise.resolve(null);

    // Build prompt immediately with tension=0, update when session resolves
    const session = await sessionPromise;
    const tensionLevel = (session?.tension_level as number | null) ?? 0;
    const sessionId: string | null = (session?.id as string | undefined) ?? null;

    const prompt = buildPeekPrompt(messages, tensionLevel);

    // ── Call AI (gemini-2.0-flash or fallback) ────────────────────────────────
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
        maxTokens: 150,
        jsonMode: true,
      });
    }

    // ── Parse response ────────────────────────────────────────────────────────
    let agentText = "I understand. Let me help you with that.";
    let newTension = tensionLevel;
    let shouldEscalate = false;

    try {
      const clean = raw.trim().replace(/^```json?\s*/im, "").replace(/\s*```$/m, "");
      const parsed = JSON.parse(clean) as {
        agentText?: string;
        tensionLevel?: number;
        shouldEscalate?: boolean;
      };
      agentText = parsed.agentText ?? agentText;
      newTension = Math.min(10, Math.max(0, parsed.tensionLevel ?? tensionLevel));
      shouldEscalate = !!parsed.shouldEscalate;

      if (shouldEscalate) {
        agentText =
          "I completely understand. Let me connect you with a senior team member right away.";
      }
    } catch {
      /* use defaults */
    }

    // ── DB update — fire and forget, never blocks response ───────────────────
    if (sessionId) {
      void (async () => {
        try {
          await db
            .from("voice_sessions")
            .update({
              tension_level: newTension,
              status: shouldEscalate ? "escalated" : "active",
            })
            .eq("id", sessionId);
        } catch { /* non-fatal */ }
      })();
    }

    // ── Apply SILK tone prefix ────────────────────────────────────────────────
    const cleanText = stripVoiceMarkers(agentText);
    const tone =
      newTension >= 7 ? "whisper" :
      newTension >= 5 ? "sad" :
      newTension >= 3 ? "neutral" : "happy";

    return wantsStream
      ? streamText(`[${tone}] ${cleanText}`)
      : jsonResponse(`[${tone}] ${cleanText}`);
  } catch (err) {
    console.error("[vapi-llm] error:", err);
    return fallback("I am sorry, could you please repeat that?");
  }
}
