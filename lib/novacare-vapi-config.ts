import { getNovaCareFallbackAgent } from "@/lib/novacare-knowledge";
import {
  deepgramTranscriberForSpeech,
  DEFAULT_SPEECH_LANGUAGE,
  replyLanguagePrompt,
} from "@/lib/speech-languages";
import { MULBERRY_DEFAULTS, SILK_REALTIME_EOT, usesBrowserSilkPlayback, type WebVoiceMode } from "@/lib/silk-voice";
import { buildMulberryDescription, classifyCallIntent, estimateTension, stripAll, withSilkTone, wrapMulberryVoiceMeta } from "@/lib/voice-emotion";

function cleanSpokenText(text: string): string {
  return text
    .replace(/\{\{\s*caller_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*preferred_address\s*\}\}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type NovaCareVapiAssistantOptions = {
  origin: string;
  voiceMode: WebVoiceMode;
  /** When false, falls back to Vapi native voice (server-only detection). */
  useSilkVoice?: boolean;
  aiProvider?: string;
  geminiModel?: string;
  /** BCP-47 speech language for STT + reply language (e.g. en-IN, hi-IN). */
  speechLanguage?: string;
  /** Browser plays Rumik audio; Vapi gets a silence stub instead of silk-tts. */
  browserSilkPlayback?: boolean;
};

/** Single source of truth for NovaCare Vapi assistant config — safe on client + server. */
export function buildNovaCareVapiAssistant(options: NovaCareVapiAssistantOptions) {
  const agent = getNovaCareFallbackAgent();
  const { origin, voiceMode } = options;
  const speechLanguage = options.speechLanguage?.trim() || DEFAULT_SPEECH_LANGUAGE;
  const deepgram = deepgramTranscriberForSpeech(speechLanguage);
  const useSilkVoice = options.useSilkVoice ?? voiceMode !== "vapi";
  const browserSilkPlayback = options.browserSilkPlayback ?? usesBrowserSilkPlayback(voiceMode);
  const silkModel = voiceMode === "silk-mulberry" ? "mulberry" : "muga";
  const isMulberry = silkModel === "mulberry";
  const useFastLlm = useSilkVoice && voiceMode !== "vapi";
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

  const basePrompt = agent.system_prompt;
  const voicePrompt = `${basePrompt}

LANGUAGE:
- ${replyLanguagePrompt(speechLanguage)}
- If the caller switches language mid-call, follow their latest utterance.

VOICE CALL RULES:
- Reply in plain spoken sentences. NO markdown, bullets, headers, or lists — ever.
- Short questions: 1–2 sentences. Detailed questions (pricing, process, coverage): 2–3 sentences.
- Use natural contractions and spoken numbers. Say "four hundred ninety nine rupees per month", not "499/month".
- Do not output SSML, markdown, emojis, bracket labels, or XML-style emotion tags.
- Sound like a calm human support agent: acknowledge frustration first, then answer directly.
- NEVER say goodbye or farewell unless the caller explicitly says goodbye first.
- If the caller asks outside the company/support script, say "I don't have that information in this support script" and redirect to what you can help with.
- If you cannot answer something account-specific, say "I'll connect you with a specialist who can look that up — they'll reach out within 2 hours" and keep the conversation going.`;

  const rawFirst = cleanSpokenText(agent.first_message || `Hi, I'm ${agent.name}. How can I help you today?`);
  const spokenFirstMessage = useSilkVoice
    ? isMulberry
      ? wrapMulberryVoiceMeta(
          buildMulberryDescription(estimateTension(""), classifyCallIntent("")),
          stripAll(rawFirst)
        )
      : withSilkTone("happy", stripAll(rawFirst))
    : stripAll(rawFirst);

  return {
    name: agent.name,
    model: {
      provider: "custom-llm",
      url: `${origin}/api/voice/vapi-llm?voice=${voiceMode}${useFastLlm ? "&fast=1" : ""}&lang=${encodeURIComponent(speechLanguage)}`,
      timeoutSeconds: 5,
      model: options.geminiModel?.trim() || "gemini-2.5-flash-lite",
      messages: [{ role: "system", content: voicePrompt }],
      temperature: 0.2,
      maxTokens: 64,
    },
    voice,
    firstMessage: spokenFirstMessage,
    firstMessageMode: "assistant-speaks-first",
    firstMessageInterruptionsEnabled: true,
    customerJoinTimeoutSeconds: 60,
    endCallPhrases: [] as string[],
    endCallMessage: "",
    transcriber: {
      provider: "deepgram",
      model: deepgram.model,
      language: deepgram.language,
      smartFormat: false,
      numerals: true,
      eotThreshold: useSilkVoice ? SILK_REALTIME_EOT.eotThreshold : 0.55,
      eotTimeoutMs: useSilkVoice ? SILK_REALTIME_EOT.eotTimeoutMs : 1200,
    },
    silenceTimeoutSeconds: 60,
    maxDurationSeconds: 1800,
    backchannelingEnabled: false,
    startSpeakingPlan: {
      waitSeconds: 0,
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: useSilkVoice ? SILK_REALTIME_EOT.onPunctuationSeconds : 0.05,
        onNoPunctuationSeconds: useSilkVoice ? SILK_REALTIME_EOT.onNoPunctuationSeconds : 0.3,
        onNumberSeconds: useSilkVoice ? SILK_REALTIME_EOT.onNumberSeconds : 0.2,
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
      aiProvider: options.aiProvider ?? "gemini",
      voiceMode: useSilkVoice
        ? voiceMode === "silk-mulberry"
          ? "silk-mulberry-1.5"
          : voiceMode === "silk-stream"
            ? "silk-muga-stream"
            : "silk-muga-rest"
        : "vapi-native",
      ...(useSilkVoice && silkModel === "mulberry"
        ? {
            silkDescription: MULBERRY_DEFAULTS.description,
            silkSpeaker: MULBERRY_DEFAULTS.speaker,
          }
        : {}),
      callDirection: "inbound",
      speechLanguage,
    },
  };
}