/**
 * POST /api/voice/vapi-llm
 *
 * Vapi calls this endpoint as an OpenAI-compatible custom LLM. Keep this route
 * fast and deterministic: if it throws or returns malformed SSE, Vapi ends the
 * live call.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import {
  buildDemoVoiceReply,
  type DemoChatMessage,
  type DemoVoiceReply,
} from "@/lib/demo-refunds";
import { stripTags } from "@/lib/twiml";

export const runtime = "nodejs";
export const maxDuration = 30;

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface VapiLLMRequest {
  model?: string;
  messages?: unknown;
  stream?: boolean;
  call?: {
    id?: string;
    customer?: { number?: string };
  };
  callId?: string;
}

interface VoiceSession {
  id: string;
  tension_level: number | null;
  turn_count: number | null;
  messages: unknown;
}

function svc(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  return "";
}

function normalizeMessages(input: unknown): OpenAIMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw): OpenAIMessage | null => {
      if (!raw || typeof raw !== "object") return null;

      const record = raw as { role?: unknown; content?: unknown; message?: unknown; text?: unknown };
      const roleValue = typeof record.role === "string" ? record.role.toLowerCase() : "user";
      const role: OpenAIMessage["role"] =
        roleValue === "system" ? "system" :
        roleValue === "assistant" || roleValue === "agent" || roleValue === "bot" ? "assistant" :
        "user";

      const content =
        contentToText(record.content) ||
        contentToText(record.message) ||
        contentToText(record.text);

      if (!content) return null;
      return { role, content };
    })
    .filter((message): message is OpenAIMessage => Boolean(message));
}

function toDemoMessages(messages: OpenAIMessage[]): DemoChatMessage[] {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
}

function normalizeStoredMessages(input: unknown): DemoChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw): DemoChatMessage | null => {
      if (!raw || typeof raw !== "object") return null;
      const record = raw as { role?: unknown; content?: unknown };
      const content = contentToText(record.content);
      if (!content) return null;

      const rawRole = typeof record.role === "string" ? record.role.toLowerCase() : "user";
      const role = rawRole === "agent" || rawRole === "assistant" || rawRole === "bot"
        ? "assistant"
        : rawRole === "system" ? "system" : "user";
      if (role === "system") return null;

      return { role, content };
    })
    .filter((message): message is DemoChatMessage => Boolean(message));
}

function mergeDemoMessages(stored: DemoChatMessage[], incoming: DemoChatMessage[]): DemoChatMessage[] {
  const merged: DemoChatMessage[] = [];

  for (const message of [...stored, ...incoming]) {
    const previous = merged[merged.length - 1];
    if (previous?.role === message.role && previous.content === message.content) continue;
    merged.push(message);
  }

  return merged.slice(-40);
}

function lastUserMessage(messages: OpenAIMessage[]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function formatSseChunk(id: string, created: number, model: string, delta: Record<string, string>, finishReason: string | null) {
  return `data: ${JSON.stringify({
    id,
    object: "chat.completion.chunk",
    created,
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

function streamText(text: string, model = "silk-resolve-demo"): Response {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const safeText = text.trim() || "I understand. Please tell me a little more so I can help.";

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(formatSseChunk(id, created, model, { role: "assistant" }, null)));

      const chunks = safeText.match(/.{1,48}(?:\s|$)/g) ?? [safeText];
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(formatSseChunk(id, created, model, { content: chunk }, null)));
      }

      controller.enqueue(encoder.encode(formatSseChunk(id, created, model, {}, "stop")));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function jsonResponse(text: string, model = "silk-resolve-demo"): Response {
  const safeText = text.trim() || "I understand. Please tell me a little more so I can help.";

  return Response.json({
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: safeText },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  });
}

async function loadSession(db: SupabaseClient | null, callId: string): Promise<VoiceSession | null> {
  if (!db || !callId) return null;

  try {
    const { data } = await db
      .from("voice_sessions")
      .select("id, tension_level, turn_count, messages")
      .eq("call_sid", callId)
      .maybeSingle();

    return data as VoiceSession | null;
  } catch (err) {
    console.error("[vapi-llm] session lookup failed:", err);
    return null;
  }
}

function appendSessionMessages(existing: unknown, userText: string, reply: DemoVoiceReply) {
  const now = new Date().toISOString();
  const messages = Array.isArray(existing) ? [...existing] : [];
  const last = messages[messages.length - 1] as { role?: unknown; content?: unknown } | undefined;

  if (userText && !(last?.role === "user" && last?.content === userText)) {
    messages.push({ role: "user", content: userText, ts: now });
  }

  messages.push({
    role: "agent",
    content: reply.text,
    ts: now,
    meta: {
      intent: reply.intent,
      action: reply.action,
      orderId: reply.orderId,
      resolution: reply.resolution,
    },
  });

  return messages.slice(-80);
}

async function persistSessionTurn(
  db: SupabaseClient | null,
  session: VoiceSession | null,
  userText: string,
  reply: DemoVoiceReply
) {
  if (!db || !session) return;

  try {
    const nextMessages = appendSessionMessages(session.messages, userText, reply);
    const nextTurnCount = (session.turn_count ?? 0) + 1;

    await db
      .from("voice_sessions")
      .update({
        messages: nextMessages,
        turn_count: nextTurnCount,
        tension_level: reply.tensionLevel,
        status: reply.status,
        resolution: reply.resolution ?? null,
      })
      .eq("id", session.id);
  } catch (err) {
    console.error("[vapi-llm] session update failed:", err);
  }
}

function withSaneVoiceText(text: string): string {
  return stripTags(text).replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  let wantsStream = true;
  let model = "silk-resolve-demo";

  try {
    const body = (await req.json().catch(() => ({}))) as VapiLLMRequest;
    wantsStream = body.stream !== false;
    model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : model;

    const messages = normalizeMessages(body.messages);
    const callId = body.call?.id || body.callId || "";
    const db = svc();
    const session = await loadSession(db, callId);

    const demoMessages = mergeDemoMessages(
      normalizeStoredMessages(session?.messages),
      toDemoMessages(messages)
    );
    const reply = buildDemoVoiceReply(demoMessages, session?.tension_level ?? 0);
    const voiceText = withSaneVoiceText(reply.text);

    await persistSessionTurn(db, session, lastUserMessage(messages), reply);

    return wantsStream ? streamText(voiceText, model) : jsonResponse(voiceText, model);
  } catch (err) {
    console.error("[vapi-llm] fatal fallback:", err);
    const text = "I heard you. Please repeat the order ID or the issue, and I will continue from there.";
    return wantsStream ? streamText(text, model) : jsonResponse(text, model);
  }
}
