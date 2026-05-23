/**
 * Returns a Vapi-compatible inline assistant config for the given agent.
 * Uses custom-llm so ALL LLM calls route through our /api/voice/vapi-llm,
 * which reads the stored AI provider key (xAI, Anthropic, etc.) server-side.
 * No API keys ever touch the browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformVoiceConfig } from "@/lib/platform";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, name, system_prompt, first_message, language, llm_provider, llm_model, silk_voice_id, companion_vibe")
    .eq("id", params.id)
    .single();

  if (error || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const { elevenlabs } = await getPlatformVoiceConfig();

  // Derive the server origin from the incoming request so this works
  // on any deployment (localhost, Vercel, custom domain) without env vars.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;

  // Build voice config — prefer ElevenLabs if key is configured
  const voice = elevenlabs.apiKey
    ? {
        provider: "11labs",
        voiceId: agent.silk_voice_id || elevenlabs.voiceId || "EXAVITQu4vr4xnSDxMaL",
      }
    : {
        provider: "playht",
        voiceId: "jennifer",
      };

  const systemPrompt = agent.system_prompt || `You are ${agent.name}, a helpful voice assistant. Be concise and friendly.`;
  const firstMessage = agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`;

  const assistantConfig = {
    name: agent.name,
    // custom-llm routes every LLM turn through our server, which uses
    // whatever provider key (xAI grok-3, Anthropic, etc.) is stored in
    // platform_settings — Vapi never needs its own copies of those keys.
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm`,
      model: agent.llm_model || "grok-3",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      maxTokens: 250,
    },
    voice,
    firstMessage,
    endCallMessage: "Thank you for calling. Goodbye!",
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    clientMessages: ["transcript", "hang", "speech-update", "metadata"],
    serverMessages: ["end-of-call-report", "status-update"],
    metadata: { agentId: agent.id },
  };

  return NextResponse.json(assistantConfig);
}
