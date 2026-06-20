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

export function silkWarmPaths(origin = ""): string[] {
  const base = origin.replace(/\/$/, "");
  return [
    `${base}/api/voice/vapi-llm?voice=silk`,
    `${base}/api/voice/silk-tts?all=1`,
    ...SILK_WARM_MODELS.map((model) => `${base}/api/voice/silk-tts?model=${model}`),
  ];
}

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

export function vapiLlmVoiceQuery(mode: WebVoiceMode): string {
  return `voice=${encodeURIComponent(mode)}`;
}