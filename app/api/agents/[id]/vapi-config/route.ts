/**
 * GET /api/agents/[id]/vapi-config
 *
 * Returns a Vapi-compatible inline assistant config for browser / inbound calls.
 * Uses custom-llm so all LLM calls route through /api/voice/vapi-llm.
 * No API keys ever reach the browser.
 *
 * SILK MUGA prosody:
 *  - First message: [happy] tone always
 *  - Runtime responses: [tone] + <prosody> injected by vapi-llm → composeSilkUtterance
 *  - Falls back to PlayHT if SILK not configured
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPlatformAIConfig, getPlatformVoiceConfig } from "@/lib/platform";
import { silkSystemPromptBlock, withSilkTone, stripAll } from "@/lib/voice-emotion";

type Ctx = { params: Promise<{ id: string }> };

function deriveOrigin(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000")
    .split(",")[0].trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]")).toLowerCase()
    : host.split(":")[0]?.toLowerCase();
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const proto = forwardedProto || (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

function cleanSpokenText(text: string): string {
  return text
    .replace(/\{\{\s*caller_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*preferred_address\s*\}\}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();

  const db = user ? auth : createServiceClient();
  const agentQuery = user
    ? db.from("agents").select("id, name, status, system_prompt, first_message, llm_model, call_direction").eq("id", id).single()
    : db.from("agents").select("id, name, status, system_prompt, first_message, llm_model, call_direction").eq("id", id).in("status", ["live", "active"]).single();

  const { data: agent, error } = await agentQuery;
  if (error || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const [{ silk }, aiConfig] = await Promise.all([
    getPlatformVoiceConfig(),
    getPlatformAIConfig(),
  ]);

  const origin = deriveOrigin(req);

  // ── Voice provider ─────────────────────────────────────────────────────────
  const voice = silk.apiKey
    ? {
        provider: "custom-voice",
        server: { url: `${origin}/api/voice/silk-tts`, timeoutSeconds: 20 },
        fallbackPlan: { voices: [{ provider: "playht", voiceId: "jennifer" }] },
      }
    : { provider: "playht", voiceId: "jennifer" };

  // ── System prompt ──────────────────────────────────────────────────────────
  const basePrompt = agent.system_prompt ||
    `You are ${agent.name}, a helpful voice assistant. Be concise and friendly.`;

  const voicePrompt = `${basePrompt}

${silkSystemPromptBlock()}

CRITICAL VOICE RULES:
- This is a spoken voice call. NEVER use markdown, bullet points, or lists.
- Keep every response to 1–2 spoken sentences (max 30 words).
- Natural speech only: contractions, spoken numbers, human rhythm.
- Embed at most ONE prosody marker per response (<laugh>, <sigh>, <hmm>, <pause>, <breathe>).
- Do NOT include [tone] prefix — the SILK engine adds it automatically.`;

  // ── First message ──────────────────────────────────────────────────────────
  const rawFirst = cleanSpokenText(
    agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`
  );
  const spokenFirstMessage = silk.apiKey
    ? withSilkTone("happy", stripAll(rawFirst))
    : stripAll(rawFirst);

  return NextResponse.json({
    name: agent.name,
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm`,
      timeoutSeconds: 12,
      model: agent.llm_model?.replace("gemini-2.5-flash", "gemini-2.0-flash") || "gemini-2.0-flash",
      messages: [{ role: "system", content: voicePrompt }],
      temperature: 0.3,
      maxTokens: 180,
    },
    voice,
    firstMessage: spokenFirstMessage,
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: true,
    customerJoinTimeoutSeconds: 60,
    endCallPhrases: ["goodbye", "bye bye", "thank you bye"],
    endCallMessage: "",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
      smartFormat: true,
      numerals: true,
      endpointing: 100,
    },
    silenceTimeoutSeconds: 25,
    maxDurationSeconds: 1800,
    backchannelingEnabled: false,
    clientMessages: [
      "assistant.speechStarted",
      "transcript",
      "hang",
      "speech-update",
      "status-update",
      "metadata",
      "voice-input",
    ],
    serverMessages: ["end-of-call-report", "status-update", "tool-calls"],
    serverUrl: `${origin}/api/voice/vapi-events`,
    metadata: {
      agentId: agent.id,
      aiProvider: aiConfig.provider,
      callDirection: agent.call_direction ?? "inbound",
    },
  });
}
