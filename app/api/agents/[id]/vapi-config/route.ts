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
import { withSilkTone, stripAll } from "@/lib/voice-emotion";

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

  // Try service client first (bypasses RLS). If SUPABASE_SERVICE_ROLE_KEY isn't
  // set in env, fall back to the anon client — migration 015 grants anon read.
  let agent = null;
  {
    const svcResult = await createServiceClient()
      .from("agents")
      .select("id, name, client, description, status, system_prompt, first_message, llm_model")
      .eq("id", id)
      .single();
    if (svcResult.data) {
      agent = svcResult.data;
    } else {
      // Fallback: anon key (works when migration 015 RLS policy is applied)
      const anonResult = await createClient()
        .from("agents")
        .select("id, name, client, description, status, system_prompt, first_message, llm_model")
        .eq("id", id)
        .single();
      agent = anonResult.data ?? null;
    }
  }

  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

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
    `You are ${agent.name}, a helpful voice assistant for ${agent.client || "this company"}. ${agent.description ? `The agent handles: ${agent.description}.` : ""} Be concise, accurate, and friendly.`;

  const voicePrompt = `${basePrompt}

VOICE CALL RULES:
- Reply in plain spoken sentences. NO markdown, bullets, headers, or lists — ever.
- Short questions: 1–2 sentences. Detailed questions (pricing, process, coverage): 2–3 sentences.
- Use natural contractions and spoken numbers (say "three hundred" not "300").
- You may add ONE natural prosody cue inside your response: <laugh> for warmth, <hmm> for thinking, <sigh> for empathy, <pause> for emphasis, <breathe> before longer answers.
- NEVER say goodbye or farewell unless the caller explicitly says goodbye first.
- If you cannot answer something account-specific, say "I'll connect you with a specialist who can look that up — they'll reach out within 2 hours" and keep the conversation going.`;

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
      timeoutSeconds: 10,
      model: agent.llm_model?.replace("gemini-2.5-flash", "gemini-2.0-flash") || "gemini-2.0-flash",
      messages: [{ role: "system", content: voicePrompt }],
      temperature: 0.25,
      maxTokens: 90,
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
      smartFormat: false,  // disabling saves ~40ms per transcription
      numerals: true,
      endpointing: 300,    // was 100 — 300ms prevents premature cutoff ("repeat that")
    },
    silenceTimeoutSeconds: 30,
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
      callDirection: (agent as { call_direction?: string }).call_direction ?? "inbound",
    },
  });
}
