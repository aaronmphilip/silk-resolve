/**
 * Returns a Vapi-compatible inline assistant config for browser calls.
 * Uses custom-llm so all LLM calls route through /api/voice/vapi-llm.
 * No API keys ever touch the browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformAIConfig, getPlatformVoiceConfig } from "@/lib/platform";
import { stripVoiceMarkers, withSilkTone } from "@/lib/voice-emotion";

type Ctx = { params: Promise<{ id: string }> };

function deriveOrigin(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]")).toLowerCase()
    : host.split(":")[0]?.toLowerCase();
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const proto = forwardedProto || (isLocalHost ? "http" : "https");
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: agent, error } = await supabase
    .from("agents")
    .select("id, name, system_prompt, first_message, llm_model")
    .eq("id", id)
    .single();

  if (error || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const [{ silk }, aiConfig] = await Promise.all([
    getPlatformVoiceConfig(),
    getPlatformAIConfig(),
  ]);

  const origin = deriveOrigin(req);

  const voice = silk.apiKey
    ? {
        provider: "custom-voice",
        server: { url: `${origin}/api/voice/silk-tts`, timeoutSeconds: 20 },
        fallbackPlan: {
          voices: [{ provider: "playht", voiceId: "jennifer" }],
        },
      }
    : { provider: "playht", voiceId: "jennifer" };

  const systemPrompt = agent.system_prompt ||
    `You are ${agent.name}, a helpful voice assistant. Be concise and friendly.`;
  const demoVoicePrompt = `${systemPrompt}

LIVE DEMO REFUND FLOW:
- If the customer mentions a refund, return, charge, damaged item, wrong item, or cancellation, ask for the order ID or registered phone last four digits.
- Demo lookup records include SR-1001 / phone ending 4321 for an eligible refund, SR-1002 / 7788 for senior review, and SR-1003 / 9090 for an already-refunded order.
- Verify the item, purchase date, delivered date, amount, and payment method before initiating a refund.
- Ask the reason for refund, then confirm the refund reference and expected 3 to 5 business day timeline.
- Keep every voice response short, direct, and spoken naturally.`;
  const voicePrompt = `${demoVoicePrompt}

VOICE EMOTION VARIABLES:
- Every response is scored with tensionLevel, emotion, silkTone, arousal, valence, and voiceScore.
- Start with a happy tone. Use neutral for lookup, sad or whisper for frustration, and excited when the issue is solved.
- SILK muga tones are emitted as [happy], [neutral], [sad], [whisper], or [excited] before spoken text.`;
  const firstMessage = cleanSpokenText(
    agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`
  );
  const spokenFirstMessage = silk.apiKey
    ? withSilkTone("happy", firstMessage)
    : stripVoiceMarkers(firstMessage);

  return NextResponse.json({
    name: agent.name,
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm`,
      timeoutSeconds: 8,
      model: agent.llm_model || "gemini-2.5-flash",
      messages: [{ role: "system", content: voicePrompt }],
      temperature: 0.2,
      maxTokens: 180,
    },
    voice,
    firstMessage: spokenFirstMessage,
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
    clientMessages: ["assistant.speechStarted", "transcript", "hang", "speech-update", "status-update", "metadata"],
    serverMessages: ["end-of-call-report", "status-update", "tool-calls"],
    serverUrl: `${origin}/api/voice/vapi-events`,
    metadata: { agentId: agent.id, aiProvider: aiConfig.provider },
  });
}
