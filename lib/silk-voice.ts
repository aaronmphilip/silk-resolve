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

export function silkTtsQueryForMode(mode: WebVoiceMode, live = false): string {
  const model = silkModelForVoiceMode(mode);
  if (!model) return "";
  const params = new URLSearchParams({ transport: "ws", model });
  if (live) params.set("live", "1");
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
    body.temperature = 0.45;
    body.top_p = 0.9;
    body.repetition_penalty = 1.15;
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

/**
 * Background keep-alive interval — OFF by default.
 * When enabled (NEXT_PUBLIC_SILK_BACKGROUND_WARM=1), only use on long-lived servers;
 * on Vercel each ping can open fresh Rumik sessions and burn credits.
 */
export const SILK_WARM_INTERVAL_MS = 20_000;
export const SILK_WARM_MODELS: SilkModel[] = ["muga", "mulberry"];

export function isSilkBackgroundWarmEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SILK_BACKGROUND_WARM === "1";
}

/** Fire-and-forget GET warm pings (no await). */
export function fireSilkWarmPaths(paths: string[]): void {
  if (typeof window === "undefined") return;
  for (const path of paths) {
    fetch(path, { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
  }
}

/** Optional 20s keep-alive — disabled unless NEXT_PUBLIC_SILK_BACKGROUND_WARM=1. */
export function startSilkWarmKeepalive(ping: () => void): () => void {
  if (typeof window === "undefined" || !isSilkBackgroundWarmEnabled()) return () => {};
  const timer = window.setInterval(() => {
    if (!document.hidden) ping();
  }, SILK_WARM_INTERVAL_MS);
  return () => window.clearInterval(timer);
}

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
  "opd",
] as const;

/** Minimal warm set for call join — must finish in <100ms client-side (fire-and-forget). */
export function silkCriticalWarmPaths(origin = "", voiceMode: WebVoiceMode = "silk-mulberry"): string[] {
  const base = origin.replace(/\/$/, "");
  const llmVoice =
    voiceMode === "silk-mulberry" ? "silk-mulberry" :
    voiceMode === "silk-stream" ? "silk-stream" : "silk";
  const model = voiceMode === "silk-mulberry" ? "mulberry" : "muga";
  return [
    `${base}/api/voice/vapi-llm?voice=${llmVoice}&fast=1`,
    `${base}/api/voice/silk-tts?model=${model}&live=1`,
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

/**
 * Noise-aware Flux EOT — waits for real end-of-turn instead of firing on background hum.
 * Vapi enforces eotThreshold >= 0.5 and eotTimeoutMs >= 500.
 * Speculative LLM prefetch keeps perceived latency low despite the longer floor.
 */
export const SILK_NOISE_AWARE_EOT = {
  eotThreshold: 0.82,
  eotTimeoutMs: 750,
  onPunctuationSeconds: 0.12,
  onNoPunctuationSeconds: 0.38,
  onNumberSeconds: 0.28,
} as const;

/** @deprecated Latency-demo tuning — prefer SILK_NOISE_AWARE_EOT in production. */
export const SILK_REALTIME_EOT = {
  eotThreshold: 0.5,
  eotTimeoutMs: 500,
  onPunctuationSeconds: 0.03,
  onNoPunctuationSeconds: 0.08,
  onNumberSeconds: 0.1,
} as const;

/** Default EOT for Silk voice calls — ignores background noise, responds after real silence. */
export const SILK_DEFAULT_EOT = SILK_NOISE_AWARE_EOT;

/**
 * Client mic gate paired with Deepgram EOT.
 * Levels must stay below speechRmsThreshold (~−35 dBFS) for silenceMs before the agent speaks.
 */
export const SILK_MIC_SILENCE = {
  /** Background hum stays below this; only your voice crosses it (~−35 dBFS). */
  speechRmsThreshold: 0.018,
  /** Near-zero tail — Vapi/Deepgram EOT already detected end of speech. */
  silenceMs: 0,
  /** Voice must stay above threshold this long before we count it as you speaking. */
  speechConfirmMs: 100,
} as const;

/** @deprecated Use SILK_DEFAULT_EOT */
export const MULBERRY_REALTIME_EOT = SILK_DEFAULT_EOT;

export function normalizeWebVoiceMode(value: string | undefined | null): WebVoiceMode {
  if (value === "vapi") return "vapi";
  if (value === "silk-stream") return "silk-stream";
  if (value === "silk-mulberry" || value === "mulberry") return "silk-mulberry";
  return "silk";
}

/** Browser plays Mulberry/MUGA audio directly; Vapi stays on mic + STT only. */
export function usesBrowserSilkPlayback(mode: WebVoiceMode): boolean {
  return mode === "silk-mulberry" || mode === "silk" || mode === "silk-stream";
}

/** @deprecated Use usesBrowserSilkPlayback */
export function usesTalkWidgetLocalAssist(mode: WebVoiceMode): boolean {
  return usesBrowserSilkPlayback(mode);
}

/** Browser-only STT pipeline — disabled for Mulberry; Vapi + Deepgram captures voice reliably. */
export function usesDirectVoicePipeline(_mode: WebVoiceMode): boolean {
  return false;
}

export function vapiLlmVoiceQuery(mode: WebVoiceMode): string {
  return `voice=${encodeURIComponent(mode)}`;
}