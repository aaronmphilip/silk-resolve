/**
 * Rumik SILK voice mode configuration.
 * @see https://playground.rumik.ai/docs
 */

export type SilkModel = "muga" | "mulberry";

export type WebVoiceMode = "silk" | "silk-stream" | "silk-mulberry" | "vapi";

export const RUMIK_SAMPLE_RATE = 24_000;

export const MULBERRY_DEFAULTS = {
  description: "warm, calm, professional female narrator for health insurance support",
  speaker: "speaker_2" as const,
  f0_up_key: 0,
};

export interface SilkTtsRequestFields {
  model: SilkModel;
  text: string;
  description?: string;
  speaker?: string;
  f0_up_key?: number;
  temperature?: number;
  top_p?: number;
  repetition_penalty?: number;
}

export function silkModelForVoiceMode(mode: WebVoiceMode): SilkModel | null {
  if (mode === "vapi") return null;
  if (mode === "silk-mulberry") return "mulberry";
  return "muga";
}

export function isSilkVoiceMode(mode: WebVoiceMode): boolean {
  return mode !== "vapi";
}

export function silkTtsQueryForMode(mode: WebVoiceMode): string {
  const model = silkModelForVoiceMode(mode);
  if (!model) return "";
  const params = new URLSearchParams({ transport: "ws", model });
  return `?${params.toString()}`;
}

export function buildSilkTtsBody(
  mode: WebVoiceMode,
  text: string,
  sampleRate = RUMIK_SAMPLE_RATE
): SilkTtsRequestFields & { sampleRate: number } {
  const model = silkModelForVoiceMode(mode) ?? "muga";
  const body: SilkTtsRequestFields & { sampleRate: number } = {
    model,
    text,
    sampleRate,
  };

  if (model === "mulberry") {
    body.description = MULBERRY_DEFAULTS.description;
    body.speaker = MULBERRY_DEFAULTS.speaker;
    body.f0_up_key = MULBERRY_DEFAULTS.f0_up_key;
    body.temperature = 0.6;
    body.top_p = 0.95;
    body.repetition_penalty = 1.2;
  } else {
    body.temperature = 0.55;
    body.top_p = 0.92;
    body.repetition_penalty = 1.15;
  }

  return body;
}

export function voiceModeLabel(mode: WebVoiceMode): string {
  switch (mode) {
    case "silk-stream":
      return "SILK MUGA streaming";
    case "silk-mulberry":
      return "SILK Mulberry 1.5";
    case "silk":
      return "SILK MUGA REST";
    case "vapi":
      return "Vapi native";
  }
}

export function silkSpeechText(mode: WebVoiceMode, text: string): string {
  const clean = text.trim();
  if (!clean) return clean;
  const model = silkModelForVoiceMode(mode);
  if (model === "muga" && !/^\s*\[(neutral|happy|sad|excited|angry|whisper)\]/i.test(clean)) {
    return `[neutral] ${clean}`;
  }
  return clean;
}

/** Client + server paths to keep Rumik WebSocket sessions hot. */
export const SILK_WARM_INTERVAL_MS = 20_000;
export const SILK_WARM_MODELS: SilkModel[] = ["muga", "mulberry"];

/** High-traffic NovaCare FAQs warmed one-at-a-time to stay under Vercel timeouts. */
export const MULBERRY_WARM_FAQ_IDS = [
  "plans",
  "claims",
  "coverage",
  "network-hospitals",
  "support",
  "reimbursement",
  "waiting",
  "about",
] as const;

/** Minimal warm set for call join — must finish in <100ms client-side (fire-and-forget). */
export function silkCriticalWarmPaths(origin = "", voiceMode: WebVoiceMode = "silk-mulberry"): string[] {
  const base = origin.replace(/\/$/, "");
  const llmVoice =
    voiceMode === "silk-mulberry" ? "silk-mulberry" :
    voiceMode === "silk-stream" ? "silk-stream" : "silk";
  const model = voiceMode === "silk-mulberry" ? "mulberry" : "muga";
  return [
    `${base}/api/voice/vapi-llm?voice=${llmVoice}`,
    `${base}/api/voice/silk-tts?model=${model}`,
    `${base}/api/voice/silk-tts?model=${model}&warmFaq=1&faqId=greeting`,
  ];
}

export function silkWarmPaths(origin = ""): string[] {
  const base = origin.replace(/\/$/, "");
  return [
    ...silkCriticalWarmPaths(base, "silk-mulberry"),
    `${base}/api/voice/vapi-llm?voice=silk`,
    `${base}/api/voice/silk-tts?all=1`,
    ...MULBERRY_WARM_FAQ_IDS.map(
      (id) => `${base}/api/voice/silk-tts?model=mulberry&warmFaq=1&faqId=${id}`
    ),
    ...SILK_WARM_MODELS.map((model) => `${base}/api/voice/silk-tts?model=${model}`),
  ];
}

/** GPT Realtime-style Mulberry endpointing — semantic VAD approximated with aggressive Flux EOT. */
export const MULBERRY_REALTIME_EOT = {
  eotThreshold: 0.42,
  eotTimeoutMs: 200,
  onPunctuationSeconds: 0.03,
  onNoPunctuationSeconds: 0.1,
  onNumberSeconds: 0.12,
} as const;

export function normalizeWebVoiceMode(value: string | undefined | null): WebVoiceMode {
  if (value === "vapi") return "vapi";
  if (value === "silk-stream") return "silk-stream";
  if (value === "silk-mulberry" || value === "mulberry") return "silk-mulberry";
  return "silk";
}

/** Talk-widget speech-to-speech stays on Vapi + silk-tts only — no browser-side bridge/cache layer. */
export function usesTalkWidgetLocalAssist(_mode: WebVoiceMode): boolean {
  return false;
}

/** Mulberry uses the direct mic → LLM → silk-tts pipeline (no Vapi / WebRTC). */
export function usesDirectVoicePipeline(mode: WebVoiceMode): boolean {
  return mode === "silk-mulberry";
}

export function vapiLlmVoiceQuery(mode: WebVoiceMode): string {
  return `voice=${encodeURIComponent(mode)}`;
}