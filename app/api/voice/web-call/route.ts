/**
 * POST /api/voice/web-call
 *
 * Creates a Vapi web call server-side using the PUBLIC web key,
 * then returns the Daily.co room URL to the browser.
 *
 * The browser never sees the private key — it only gets the room URL
 * which expires after the call ends.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPlatformAIConfig, getPlatformVoiceConfig } from "@/lib/platform";
import { stripAll, withSilkTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";

function cleanSpokenText(text: string): string {
  return text
    .replace(/\{\{\s*caller_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*preferred_address\s*\}\}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const auth = createClient();
  const { data: { user } } = await auth.auth.getUser();

  const { agentId, visitorId } = await req.json() as { agentId: string; visitorId?: string };
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  // Always use service client — bypasses RLS for widget/public calls
  const { data: agent, error: agentErr } = await createServiceClient()
    .from("agents")
    .select("id, tenant_id, name, client, description, status, system_prompt, first_message, llm_model, silk_voice_id")
    .eq("id", agentId)
    .single();

  if (agentErr || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const [{ vapi, silk }, aiConfig] = await Promise.all([
    getPlatformVoiceConfig(),
    getPlatformAIConfig(),
  ]);
  const webCallKey = vapi.publicKey;

  if (!webCallKey) {
    return NextResponse.json(
      { error: "Vapi web calls require VAPI_PUBLIC_KEY. /call/web rejects private/server keys." },
      { status: 400 }
    );
  }
  if (vapi.privateKey && vapi.privateKey === webCallKey) {
    return NextResponse.json(
      { error: "Vapi public and private keys are identical. Web calls require VAPI_PUBLIC_KEY, not the private/server key." },
      { status: 400 }
    );
  }

  // Derive server origin from the request for the serverUrl webhook.
  // Vercel sends x-forwarded-proto=https; local dev may be localhost or 127.0.0.1.
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]")).toLowerCase()
    : host.split(":")[0]?.toLowerCase();
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const proto = forwardedProto || (isLocalHost ? "http" : "https");
  const origin = `${proto}://${host}`;

  const baseVoicePrompt = agent.system_prompt ||
    `You are ${agent.name}, a helpful voice assistant for ${agent.client || "this company"}. ${agent.description ? `The agent handles: ${agent.description}.` : ""} Be concise, accurate, and friendly.`;
  const voicePrompt = `${baseVoicePrompt}

VOICE CALL RULES:
- Reply in plain spoken sentences. NO markdown, bullets, headers, or lists — ever.
- Short questions: 1–2 sentences. Detailed questions (pricing, process, coverage): 2–3 sentences.
- Use natural contractions and spoken numbers (say "three hundred" not "300").
- You may add ONE natural prosody cue inside your response: <laugh> for warmth, <hmm> for thinking, <sigh> for empathy, <pause> for emphasis, <breathe> before longer answers.
- NEVER say goodbye or farewell unless the caller explicitly says goodbye first.
- If you cannot answer something account-specific, say "I'll connect you with a specialist who can look that up — they'll reach out within 2 hours" and keep the conversation going.`;
  const firstMessage = cleanSpokenText(
    agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`
  );

  // Voice priority: SILK (Rumik) → Vapi built-in PlayHT
  const voice = silk.apiKey
    ? {
        provider: "custom-voice",
        server: { url: `${origin}/api/voice/silk-tts`, timeoutSeconds: 20 },
        fallbackPlan: {
          voices: [{ provider: "playht", voiceId: "jennifer" }],
        },
      }
    : { provider: "playht", voiceId: "jennifer" };

  // Build the assistant config — same shape as before but sent to Vapi's REST API
  const assistantConfig = {
    name: agent.name,
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm`,
      timeoutSeconds: 10,
      model: agent.llm_model?.replace("gemini-2.5-flash", "gemini-2.0-flash") || "gemini-2.0-flash",
      messages: [{ role: "system", content: voicePrompt }],
      temperature: 0.2,
      maxTokens: 150,
    },
    voice,
    firstMessage: silk.apiKey ? withSilkTone("happy", firstMessage) : stripAll(firstMessage),
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: false,
    customerJoinTimeoutSeconds: 60,
    endCallPhrases: [],
    endCallMessage: "",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
      smartFormat: true,
      numerals: true,
      endpointing: 150,
    },
    serverUrl: `${origin}/api/voice/vapi-events`,
    serverMessages: ["end-of-call-report", "status-update", "tool-calls"],
    clientMessages: ["transcript", "hang", "speech-update", "metadata"],
    metadata: { agentId: agent.id, aiProvider: aiConfig.provider },
  };

  // Create the web call via Vapi REST API using the PUBLIC web key.
  // Vapi's /call/web endpoint is public-scoped; private/server keys are rejected here.
  const vapiRes = await fetch("https://api.vapi.ai/call/web", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${webCallKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assistant: assistantConfig }),
  });

  if (!vapiRes.ok) {
    const err = await vapiRes.json().catch(() => ({})) as { message?: string; error?: string };
    const msg = err.message ?? err.error ?? `Vapi API error ${vapiRes.status}`;
    console.error(`[web-call] Vapi rejected web-call request — ${vapiRes.status}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: vapiRes.status });
  }

  const call = await vapiRes.json() as { id: string; webCallUrl: string };
  if (!call.id || !call.webCallUrl) {
    console.error("[web-call] Vapi returned an incomplete web call payload");
    return NextResponse.json({ error: "Vapi did not return a usable web call URL." }, { status: 502 });
  }

  try {
    const safeVisitorId = typeof visitorId === "string"
      ? visitorId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)
      : "";

    await createServiceClient().from("voice_sessions").upsert({
      call_sid:       call.id,
      tenant_id:      agent.tenant_id,
      agent_id:       agent.id,
      caller_phone:   safeVisitorId ? `web:${safeVisitorId}` : user ? "web-dashboard" : "web-guest",
      platform_phone: user ? "web-dashboard" : "web-public",
      messages:       [{
        role: "agent",
        content: firstMessage,
        ts: new Date().toISOString(),
        meta: { silkTone: "happy", emotion: "welcoming", voiceScore: 90 },
      }],
      tension_level:  0,
      turn_count:     0,
      status:         "active",
    }, { onConflict: "call_sid", ignoreDuplicates: true });
  } catch (err) {
    console.error("[web-call] failed to create local voice session:", err);
  }

  return NextResponse.json({
    callId: call.id,
    roomUrl: call.webCallUrl,
  });
}
