/**
 * POST /api/voice/vapi-llm
 *
 * Custom LLM endpoint — Vapi sends the full conversation in OpenAI chat format
 * and we return a streaming SSE response (OpenAI-compatible).
 *
 * This is where PEEK analysis runs, SILK tags are applied internally,
 * and escalation logic fires.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { getPlatformAIConfig } from "@/lib/platform";
import { callAI, extractJSON } from "@/lib/ai";
import { stripTags } from "@/lib/twiml";
import type { AgentScript } from "@/lib/types";

export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

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
  call?: {
    id: string;
    customer?: { number: string };
  };
}

/** Stream text back as OpenAI-compatible SSE */
function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;

  const stream = new ReadableStream({
    start(controller) {
      // Role delta first
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }] })}\n\n`
        )
      );

      // Stream word by word for natural feel
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = i < words.length - 1 ? words[i] + " " : words[i];
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ id, object: "chat.completion.chunk", choices: [{ delta: { content: chunk }, index: 0, finish_reason: null }] })}\n\n`
          )
        );
      }

      // Stop signal
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
      "Connection": "keep-alive",
    },
  });
}

/** Return non-streaming JSON response (fallback) */
function jsonResponse(text: string): Response {
  const id = `chatcmpl-${Date.now()}`;
  return Response.json({
    id,
    object: "chat.completion",
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

/** Build PEEK + agent response prompt from conversation history */
function buildPeekPrompt(
  messages: OpenAIMessage[],
  tensionLevel: number
): { system: string; user: string } {
  // Extract last user message
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUser = userMessages[userMessages.length - 1]?.content ?? "";

  // Build conversation history string (last 4 exchanges)
  const history = messages
    .filter((m) => m.role !== "system")
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");

  const system = messages.find((m) => m.role === "system")?.content ?? "";

  const peekUser = `Conversation so far:
${history || "(call just started)"}

Customer just said: "${lastUser}"

Respond as the agent. Return JSON:
{
  "agentText": "what you say (1-3 sentences, plain text only — no markdown)",
  "intent": "one word: complaint|query|frustrated|satisfied|angry|confused|grateful",
  "tensionLevel": <0-10>,
  "arousal": <0-10>,
  "hiddenIntent": "what they really mean (optional)",
  "shouldEscalate": <true/false>,
  "escalationReason": "why (only if escalating)"
}`;

  return { system, user: peekUser };
}

export async function POST(req: NextRequest) {
  const db = svc();
  const body = await req.json() as VapiLLMRequest;

  const { messages, stream: wantsStream = true, call } = body;
  const callId    = call?.id ?? "";
  const fromPhone = call?.customer?.number ?? "";

  // Fallback response helper
  const fallback = (text: string) =>
    wantsStream ? streamText(text) : jsonResponse(text);

  try {
    const { provider, apiKey } = await getPlatformAIConfig();

    if (!apiKey) {
      return fallback("I'm sorry, I'm having technical difficulties right now. Please call back shortly.");
    }

    // Load session for current tension level
    let tensionLevel = 0;
    let sessionId: string | null = null;
    if (callId) {
      const { data: session } = await db
        .from("voice_sessions")
        .select("id, tension_level, turn_count, messages, script_id")
        .eq("call_sid", callId)
        .single();
      if (session) {
        tensionLevel = session.tension_level ?? 0;
        sessionId = session.id;
      }
    }

    // Build PEEK-aware prompt
    const { system, user } = buildPeekPrompt(messages, tensionLevel);

    // Call AI
    const raw = await callAI({
      provider,
      apiKey,
      system,
      user,
      maxTokens: 250,
      jsonMode: true,
    });

    let agentText = "I understand. Let me help you with that.";
    let newTension = tensionLevel;
    let intent = "unknown";
    let shouldEscalate = false;
    let hiddenIntent: string | undefined;

    try {
      const parsed = JSON.parse(extractJSON(raw));
      agentText       = parsed.agentText ?? agentText;
      newTension      = Math.min(10, Math.max(0, parsed.tensionLevel ?? tensionLevel));
      intent          = parsed.intent ?? intent;
      shouldEscalate  = !!parsed.shouldEscalate;
      hiddenIntent    = parsed.hiddenIntent;

      // Escalate override response
      if (shouldEscalate) {
        agentText = "I completely understand, and I want to make sure you get the best possible help. Let me connect you with a senior member of our team right away.";
      }
    } catch {
      // Use fallback text
    }

    // Update voice session asynchronously (non-blocking — fire and forget)
    if (sessionId) {
      void (async () => {
        try {
          await db.from("voice_sessions").update({
            tension_level: newTension,
            status:        shouldEscalate ? "escalated" : "active",
          }).eq("id", sessionId);
        } catch {}
      })();
    }

    // Strip SILK tags — ElevenLabs handles prosody naturally, no SSML needed
    const cleanText = stripTags(agentText);

    return wantsStream ? streamText(cleanText) : jsonResponse(cleanText);

  } catch (err) {
    console.error("[vapi-llm] error:", err);
    return fallback("I'm sorry, I had a momentary issue. Could you please repeat that?");
  }
}
