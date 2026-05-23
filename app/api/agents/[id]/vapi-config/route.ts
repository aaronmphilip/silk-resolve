/**
 * Returns a Vapi-compatible inline assistant config for the given agent.
 * Called server-side so no API keys are exposed to the browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformVoiceConfig } from "@/lib/platform";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
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

  // Map our provider/model to what Vapi expects
  const modelProvider = agent.llm_provider === "openai" ? "openai" : "anthropic";
  const modelName = agent.llm_model || (modelProvider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gpt-4o");

  const systemPrompt = agent.system_prompt || `You are ${agent.name}, a helpful voice assistant. Be concise and friendly.`;
  const firstMessage = agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`;

  const assistantConfig = {
    name: agent.name,
    model: {
      provider: modelProvider,
      model: modelName,
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
    // silenceTimeoutSeconds: 30,
    // maxDurationSeconds: 1800,
  };

  return NextResponse.json(assistantConfig);
}
