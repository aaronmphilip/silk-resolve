/**
 * GET /api/agents/[id]/vapi-config
 *
 * Returns a Vapi-compatible inline assistant config for browser / inbound calls.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPlatformAIConfig, getPlatformVoiceConfig } from "@/lib/platform";
import { isNovaCareAgentId } from "@/lib/novacare-knowledge";
import {
  agentLanguageLabelToBcp47,
  deepgramTranscriberForSpeech,
  DEFAULT_SPEECH_LANGUAGE,
} from "@/lib/speech-languages";
import { buildAgentVoiceSystemPrompt, type AgentPromptInput } from "@/lib/agent-runtime-prompt";
import { buildNovaCareVapiAssistant } from "@/lib/novacare-vapi-config";
import {
  MULBERRY_DEFAULTS,
  SILK_DEFAULT_EOT,
  normalizeWebVoiceMode,
  usesBrowserSilkPlayback,
  type WebVoiceMode,
} from "@/lib/silk-voice";
import { withSilkTone, stripAll } from "@/lib/voice-emotion";
import {
  isPublishKeyFormat,
  publishKeyAllowsAgentStatus,
  resolvePublishKey,
} from "@/lib/publish-key";

type Ctx = { params: Promise<{ id: string }> };

const AGENT_SELECT =
  "id, name, client, description, status, system_prompt, first_message, llm_model, llm_provider, voice_mode, language, hinglish_mode, linguistic_notes, preferred_address, companion_vibe, escalation_rules, no_go_topics, tools, call_direction";

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

function voiceModeFromReq(req: NextRequest): WebVoiceMode {
  return normalizeWebVoiceMode(req.nextUrl.searchParams.get("voice"));
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const publishKey = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  let keyKind: "live" | "test" | null = null;

  if (publishKey) {
    if (!isPublishKeyFormat(publishKey)) {
      return NextResponse.json({ error: "invalid publish key" }, { status: 400 });
    }
    const resolved = await resolvePublishKey(publishKey);
    if (!resolved || resolved.agentId !== id) {
      return NextResponse.json({ error: "invalid publish key" }, { status: 403 });
    }
    keyKind = resolved.kind;
  }

  const voiceParam = req.nextUrl.searchParams.get("voice");
  const langParam = req.nextUrl.searchParams.get("lang")?.trim();
  const origin = deriveOrigin(req);

  if (isNovaCareAgentId(id)) {
    const [{ silk }, aiConfig] = await Promise.all([
      getPlatformVoiceConfig(),
      getPlatformAIConfig(),
    ]);
    const requestedVoice = voiceParam ? voiceModeFromReq(req) : normalizeWebVoiceMode("silk-mulberry");
    const useSilkVoice = requestedVoice !== "vapi" && Boolean(silk.apiKey && silk.vapiEnabled);
    return NextResponse.json(
      buildNovaCareVapiAssistant({
        origin,
        voiceMode: requestedVoice,
        useSilkVoice,
        browserSilkPlayback: usesBrowserSilkPlayback(requestedVoice),
        aiProvider: aiConfig.provider,
        geminiModel: process.env.GEMINI_MODEL,
        speechLanguage: langParam || DEFAULT_SPEECH_LANGUAGE,
      }),
      { headers: { "Cache-Control": "private, max-age=300" } }
    );
  }

  let agent: Record<string, unknown> | null = null;
  const svcResult = await createServiceClient()
    .from("agents")
    .select(AGENT_SELECT)
    .eq("id", id)
    .single();
  if (svcResult.data) {
    agent = svcResult.data as Record<string, unknown>;
  } else {
    const anonResult = await createClient()
      .from("agents")
      .select(AGENT_SELECT)
      .eq("id", id)
      .single();
    agent = (anonResult.data as Record<string, unknown>) ?? null;
  }

  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  if (publishKey && keyKind) {
    const status = String(agent.status ?? "draft");
    if (!publishKeyAllowsAgentStatus(keyKind, status)) {
      return NextResponse.json(
        { error: keyKind === "live" ? "agent not published" : "agent unavailable" },
        { status: 403 }
      );
    }
  }

  const requestedVoice = voiceParam
    ? voiceModeFromReq(req)
    : normalizeWebVoiceMode(String(agent.voice_mode ?? "silk-mulberry"));

  const speechLanguage =
    langParam || agentLanguageLabelToBcp47(String(agent.language ?? ""));

  const [{ silk }, aiConfig] = await Promise.all([
    getPlatformVoiceConfig(),
    getPlatformAIConfig(),
  ]);

  const useSilkVoice = requestedVoice !== "vapi" && Boolean(silk.apiKey && silk.vapiEnabled);
  const browserSilkPlayback = usesBrowserSilkPlayback(requestedVoice);
  const silkModel = requestedVoice === "silk-mulberry" ? "mulberry" : "muga";
  const silkQuery = useSilkVoice ? `?transport=ws&model=${silkModel}` : "";
  const voice = useSilkVoice
    ? browserSilkPlayback
      ? {
          provider: "custom-voice",
          server: { url: `${origin}/api/voice/silence-tts`, timeoutSeconds: 10 },
        }
      : {
          provider: "custom-voice",
          server: { url: `${origin}/api/voice/silk-tts${silkQuery}`, timeoutSeconds: 45 },
        }
    : { provider: "vapi", voiceId: "Neha" };

  const voicePrompt = buildAgentVoiceSystemPrompt(
    {
      system_prompt: agent.system_prompt as string,
      description: agent.description as string,
      name: agent.name as string,
      client: agent.client as string,
      linguistic_notes: agent.linguistic_notes as string,
      preferred_address: agent.preferred_address as string,
      companion_vibe: agent.companion_vibe as string,
      escalation_rules: agent.escalation_rules as AgentPromptInput["escalation_rules"],
      no_go_topics: agent.no_go_topics as string[],
      hinglish_mode: agent.hinglish_mode as boolean,
    },
    speechLanguage
  );

  const rawFirst = cleanSpokenText(
    (agent.first_message as string) || `Hi, I'm ${agent.name}. How can I help you today?`
  );
  const spokenFirstMessage = useSilkVoice
    ? silkModel === "mulberry"
      ? stripAll(rawFirst)
      : withSilkTone("happy", stripAll(rawFirst))
    : stripAll(rawFirst);

  const dg = deepgramTranscriberForSpeech(speechLanguage);
  const enabledTools = ((agent.tools as Array<{ name: string; description: string; enabled?: boolean }>) ?? [])
    .filter((t) => t.enabled !== false)
    .map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description || `Tool: ${t.name}`,
        parameters: { type: "object", properties: {} },
      },
    }));

  return NextResponse.json({
    name: agent.name,
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm?voice=${requestedVoice}${useSilkVoice ? "&fast=1" : ""}${browserSilkPlayback ? "&clientLead=1" : ""}&lang=${encodeURIComponent(speechLanguage)}`,
      timeoutSeconds: 5,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite",
      messages: [{ role: "system", content: voicePrompt }],
      temperature: 0.25,
      maxTokens: 80,
      ...(enabledTools.length ? { tools: enabledTools } : {}),
    },
    voice,
    firstMessage: spokenFirstMessage,
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: true,
    customerJoinTimeoutSeconds: 60,
    endCallPhrases: [],
    endCallMessage: "",
    transcriber: {
      provider: "deepgram",
      model: dg.model,
      language: dg.language,
      smartFormat: false,
      numerals: true,
      eotThreshold: useSilkVoice ? SILK_DEFAULT_EOT.eotThreshold : 0.55,
      eotTimeoutMs: useSilkVoice ? SILK_DEFAULT_EOT.eotTimeoutMs : 1200,
    },
    silenceTimeoutSeconds: 60,
    maxDurationSeconds: 1800,
    backchannelingEnabled: false,
    startSpeakingPlan: {
      waitSeconds: 0,
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: useSilkVoice ? SILK_DEFAULT_EOT.onPunctuationSeconds : 0.05,
        onNoPunctuationSeconds: useSilkVoice ? SILK_DEFAULT_EOT.onNoPunctuationSeconds : 0.3,
        onNumberSeconds: useSilkVoice ? SILK_DEFAULT_EOT.onNumberSeconds : 0.2,
      },
    },
    stopSpeakingPlan: {
      numWords: 0,
      voiceSeconds: 0.15,
      backoffSeconds: 0.4,
    },
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
      llmProvider: agent.llm_provider ?? aiConfig.provider,
      speechLanguage,
      voiceMode: useSilkVoice
        ? requestedVoice === "silk-mulberry"
          ? "silk-mulberry-1.5"
          : requestedVoice === "silk-stream"
            ? "silk-muga-stream"
            : "silk-muga-rest"
        : "vapi-native",
      ...(useSilkVoice && silkModel === "mulberry"
        ? {
            silkDescription: MULBERRY_DEFAULTS.description,
            silkSpeaker: MULBERRY_DEFAULTS.speaker,
          }
        : {}),
      callDirection: (agent.call_direction as string) ?? "inbound",
    },
  });
}