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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { agentId } = await req.json() as { agentId: string };
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  // Load agent
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("id, tenant_id, name, system_prompt, first_message, llm_model, silk_voice_id")
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

  const systemPrompt = agent.system_prompt ||
    `You are ${agent.name}, a helpful voice assistant. Be concise and warm.`;
  const demoVoicePrompt = `${systemPrompt}

LIVE DEMO REFUND FLOW:
- If the customer mentions a refund, return, charge, damaged item, wrong item, or cancellation, ask for the order ID or registered phone last four digits.
- Demo lookup records include SR-1001 / phone ending 4321 for an eligible refund, SR-1002 / 7788 for senior review, and SR-1003 / 9090 for an already-refunded order.
- Verify the item, purchase date, delivered date, amount, and payment method before initiating a refund.
- Ask the reason for refund, then confirm the refund reference and expected 3 to 5 business day timeline.
- Keep every voice response short, direct, and spoken naturally.`;
  const firstMessage = cleanSpokenText(
    agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`
  );

  // Voice priority: SILK (Rumik) → Vapi built-in PlayHT
  const voice = silk.apiKey
    ? {
        provider: "custom-voice",
        server: { url: `${origin}/api/voice/silk-tts`, timeoutSeconds: 10 },
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
      model: agent.llm_model || "gemini-2.5-flash",
      messages: [{ role: "system", content: demoVoicePrompt }],
      temperature: 0.7,
      maxTokens: 250,
    },
    voice,
    firstMessage,
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: false,
    customerJoinTimeoutSeconds: 60,
    endCallMessage: "Thank you. Goodbye!",
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
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
    await createServiceClient().from("voice_sessions").upsert({
      call_sid:       call.id,
      tenant_id:      agent.tenant_id,
      agent_id:       agent.id,
      caller_phone:   "web-call",
      platform_phone: "web",
      messages:       [{ role: "agent", content: firstMessage, ts: new Date().toISOString() }],
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
