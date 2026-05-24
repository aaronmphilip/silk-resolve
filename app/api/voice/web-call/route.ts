/**
 * POST /api/voice/web-call
 *
 * Creates a Vapi web call server-side using the PRIVATE key,
 * then returns the Daily.co room URL to the browser.
 *
 * The browser never sees the private key — it only gets the room URL
 * which expires after the call ends.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformVoiceConfig } from "@/lib/platform";

type Ctx = { params?: Record<string, string> };

export async function POST(req: NextRequest, _ctx?: Ctx) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { agentId } = await req.json() as { agentId: string };
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  // Load agent
  const { data: agent, error: agentErr } = await supabase
    .from("agents")
    .select("id, name, system_prompt, first_message, llm_model, silk_voice_id")
    .eq("id", agentId)
    .single();

  if (agentErr || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const { vapi, silk } = await getPlatformVoiceConfig();

  if (!vapi.privateKey) {
    return NextResponse.json(
      { error: "Vapi private key not set — add VAPI_PRIVATE_KEY to your environment variables." },
      { status: 400 }
    );
  }

  // Derive server origin from the request for the serverUrl webhook
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;

  const systemPrompt = agent.system_prompt ||
    `You are ${agent.name}, a helpful voice assistant. Be concise and warm.`;
  const firstMessage = agent.first_message ||
    `Hi, I'm ${agent.name}. How can I help you today?`;

  // Voice priority: SILK (Rumik) → Vapi built-in PlayHT
  const voice = silk.apiKey
    ? { provider: "custom-voice", server: { url: `${origin}/api/voice/silk-tts`, timeoutSeconds: 10 } }
    : { provider: "playht", voiceId: "jennifer" };

  // Build the assistant config — same shape as before but sent to Vapi's REST API
  const assistantConfig = {
    name: agent.name,
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm`,
      model: agent.llm_model || "grok-4",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      maxTokens: 250,
    },
    voice,
    firstMessage,
    endCallMessage: "Thank you. Goodbye!",
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
    serverUrl: `${origin}/api/voice/vapi-incoming`,
    serverMessages: ["end-of-call-report", "status-update"],
    clientMessages: ["transcript", "hang", "speech-update"],
    metadata: { agentId: agent.id },
  };

  // Create the web call via Vapi REST API using the PRIVATE key
  const vapiRes = await fetch("https://api.vapi.ai/call/web", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${vapi.privateKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ assistant: assistantConfig }),
  });

  if (!vapiRes.ok) {
    const err = await vapiRes.json().catch(() => ({})) as { message?: string };
    return NextResponse.json(
      { error: err.message ?? `Vapi API error ${vapiRes.status}` },
      { status: vapiRes.status }
    );
  }

  const call = await vapiRes.json() as { id: string; webCallUrl: string };

  return NextResponse.json({
    callId: call.id,
    roomUrl: call.webCallUrl,
  });
}
