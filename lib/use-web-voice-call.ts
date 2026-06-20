"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { answerNovaCareQuestion, isNovaCareAgentId, normalizeMugaCacheText, NOVACARE_AGENT_ID } from "@/lib/novacare-knowledge";
import { buildNovaCareVapiAssistant } from "@/lib/novacare-vapi-config";
import { loadSpeechLanguage, saveSpeechLanguage } from "@/lib/speech-languages";
import {
  buildSilkTtsBody,
  isSilkVoiceMode,
  silkCriticalWarmPaths,
  silkModelForVoiceMode,
  SILK_WARM_INTERVAL_MS,
  silkSpeechText,
  silkTtsQueryForMode,
  silkWarmPaths,
  usesTalkWidgetLocalAssist,
  vapiLlmVoiceQuery,
  type WebVoiceMode,
} from "@/lib/silk-voice";
import { prefetchSilkTts, prefetchSilkTtsLeadSentence, speculativeNovaCareAnswer } from "@/lib/realtime-voice";
import { StreamSpeechChunker } from "@/lib/stream-speech-chunker";
import { extractVoiceMeta, stripVoiceMarkers } from "@/lib/voice-emotion";

export type { WebVoiceMode };

export type WebVoiceCallState =
  | "idle"
  | "connecting"
  | "joining"
  | "active"
  | "ending"
  | "ended"
  | "error";

export interface WebVoiceTranscript {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

type VapiCtor = typeof import("@vapi-ai/web").default;
type VapiInstance = InstanceType<VapiCtor>;

interface TokenResponse {
  apiKey: string;
}

interface AssistantConfig {
  [key: string]: unknown;
}

interface CallResponse {
  id?: string;
}

const SDK_LOAD_TIMEOUT_MS = 15_000;
const CONFIG_TIMEOUT_MS = 60_000;
const START_TIMEOUT_MS = 75_000;
const ASSISTANT_MERGE_WINDOW_MS = 12_000;
const VISITOR_ID_KEY = "silk_resolve_voice_visitor_id";
const LOCAL_MUGA_SAMPLE_RATE = 24_000;
const VAPI_PLACEHOLDER_TRANSCRIPT_RE = /^(?:got it|i understand)[.!?\s]*$/i;
const PREFETCHED_LOCAL_MUGA_PHRASES = [
  "Let me check that.",
  "I understand.",
  "Got it.",
  "I don't have the answer to this question from my support script, so I cannot help you with that.",
];

interface LocalMugaClip {
  audio: ArrayBuffer;
  sampleRate: number;
  durationMs: number;
}

type VapiControl = "mute-assistant" | "unmute-assistant";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function loadVapiCtor(): Promise<VapiCtor> {
  const mod = await withTimeout(
    import("@vapi-ai/web"),
    SDK_LOAD_TIMEOUT_MS,
    "The Vapi web SDK did not load. Check your connection and retry."
  );
  return mod.default;
}

function ensureBrowserCanUseMic() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error("Voice calls can only start in a browser.");
  }

  const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  if (!window.isSecureContext && !isLocalhost) {
    throw new Error("Microphone access requires HTTPS. Open the deployed site, not an insecure URL.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not expose microphone access. Use current Chrome, Safari, or Edge.");
  }
}

async function preflightMicrophone(): Promise<void> {
  ensureBrowserCanUseMic();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });
  stream.getTracks().forEach(track => track.stop());
}

function parseErrorText(err: unknown): { name: string; message: string } {
  if (err instanceof Error) return { name: err.name, message: err.message };

  const record = err as { name?: unknown; message?: unknown; error?: unknown; errorMsg?: unknown };
  const name = typeof record?.name === "string" ? record.name : "";
  let message =
    typeof record?.message === "string" ? record.message :
    typeof record?.error === "string" ? record.error :
    typeof record?.errorMsg === "string" ? record.errorMsg :
    typeof err === "string" ? err :
    "";

  if (!message && record?.error && typeof record.error === "object") {
    const nested = parseErrorText(record.error);
    if (nested.message) return nested;
  }

  if (!message) {
    try {
      const serialized = JSON.stringify(err);
      if (serialized && serialized !== "{}") message = serialized;
    } catch {}
  }

  return { name, message: message || "Failed to start call" };
}

export function normalizeVoiceCallError(err: unknown): string {
  const { name, message } = parseErrorText(err);
  const lower = message.toLowerCase();

  if (name === "AbortError") return "Call startup was cancelled.";
  if (name === "NotAllowedError" || name === "SecurityError" || lower.includes("permission denied")) {
    return "Microphone permission was denied. Allow microphone access for this site, refresh, and start again.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No microphone was found. Connect a microphone or test from a device with mic access.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "The microphone is already in use or blocked by the operating system. Close other apps using it and retry.";
  }
  if (lower.includes("invalid key")) {
    return "Vapi rejected the browser key. Check that VAPI_PUBLIC_KEY is the public key, not the private key.";
  }
  if (lower.includes("eotthreshold") || lower.includes("eottimeoutms") || lower.includes("eot threshold")) {
    return "Voice call config was rejected by Vapi (speech-detection limits). Refresh the page and try again.";
  }
  if (lower.includes("meeting has ended") || lower.includes("room has ended")) {
    return "The Vapi room ended before the browser fully joined. Retry after allowing mic access.";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "Network error while starting the voice call. Check connection and retry.";
  }

  return message;
}

function normalizeTranscriptRole(role: unknown): "user" | "assistant" {
  if (role === "assistant" || role === "bot" || role === "agent") return "assistant";
  return "user";
}

function getTranscriptText(message: Record<string, unknown>): string {
  const transcript = message.transcript;
  if (typeof transcript === "string") return cleanTranscriptText(transcript);

  const text = message.text;
  if (typeof text === "string") return cleanTranscriptText(text);

  return "";
}

function cleanTranscriptText(text: string): string {
  return stripVoiceMarkers(extractVoiceMeta(text).text)
    .replace(/\br\s*f\s+minus\s+1,?000\s+on\s+minus\s+524\b/gi, "RF-1001-0524")
    .replace(/\br\s*f\s+minus\s+one\s+thousand\s+on\s+minus\s+five\s+twenty\s+four\b/gi, "RF-1001-0524")
    .replace(
      /\br\s*f\s+(?:1|one)\s+(?:0|zero|oh)\s+(?:0|zero|oh)\s+(?:1|one)\s+(?:0|zero|oh)\s+(?:5|five)\s+(?:2|two)\s+(?:4|four)\b/gi,
      "RF-1001-0524"
    )
    .replace(
      /\bu\s*p\s*i\s+ending\s+(?:1|one)\s+(?:1|one)\s+(?:8|eight)\s+(?:8|eight)\b/gi,
      "UPI ending 1188"
    )
    .replace(/\bu\s*p\s*i\b/gi, "UPI")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAssistantSystemPrompt(config: AssistantConfig): string {
  const model = config.model as { messages?: unknown } | undefined;
  if (!Array.isArray(model?.messages)) return "";

  for (const raw of model.messages) {
    if (!raw || typeof raw !== "object") continue;
    const message = raw as { role?: unknown; content?: unknown };
    if (message.role === "system" && typeof message.content === "string") return message.content;
  }

  return "";
}

function isSmallTalkPrompt(text: string): boolean {
  return /^(hi|hello|hey|thanks|thank you|bye|goodbye)[\s.!?]*$/i.test(text.trim());
}

function bridgeForVoicePrompt(text: string): string {
  const clean = text.trim();
  if (!clean || isSmallTalkPrompt(clean)) return "";
  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated|not happy|frustrated|upset|complaint)\b/i.test(clean)) {
    return "I understand.";
  }
  return "Let me check that.";
}

function stripLeadingBridge(text: string, bridge: string): string {
  const clean = stripVoiceMarkers(text);
  const bridgeKey = normalizeMugaCacheText(bridge);
  if (!bridgeKey || !normalizeMugaCacheText(clean).startsWith(bridgeKey)) return clean;

  const escaped = bridge.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return clean.replace(new RegExp(`^\\s*${escaped}\\s*[,.;:!?-]*\\s*`, "i"), "").trim();
}

function readSsePayloads(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  return { events: parts.slice(0, -1), rest: parts[parts.length - 1] ?? "" };
}

function pcmDurationMs(audio: ArrayBuffer, sampleRate: number): number {
  if (!sampleRate) return 0;
  return Math.ceil((audio.byteLength / 2 / sampleRate) * 1000);
}

async function fetchLocalSilkClip(text: string, voiceMode: WebVoiceMode): Promise<LocalMugaClip> {
  const query = silkTtsQueryForMode(voiceMode);
  const response = await fetch(`/api/voice/silk-tts${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSilkTtsBody(voiceMode, text, LOCAL_MUGA_SAMPLE_RATE)),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const model = silkModelForVoiceMode(voiceMode) ?? "muga";
    throw new Error(detail || `${model.toUpperCase()} speech failed.`);
  }

  const sampleRate = Number(response.headers.get("x-audio-sample-rate") ?? LOCAL_MUGA_SAMPLE_RATE);
  const audio = await response.arrayBuffer();
  return {
    audio,
    sampleRate,
    durationMs: pcmDurationMs(audio, sampleRate),
  };
}

function sendVapiControl(vapi: VapiInstance | null, control: VapiControl): void {
  if (!vapi) return;
  try {
    vapi.send({ type: "control", control });
  } catch {}
}

function isVapiPlaceholderTranscript(text: string): boolean {
  return VAPI_PLACEHOLDER_TRANSCRIPT_RE.test(stripVoiceMarkers(text).trim());
}

function appendTranscriptLine(
  lines: WebVoiceTranscript[],
  role: "user" | "assistant",
  text: string,
  ts: number
): WebVoiceTranscript[] {
  const previous = lines[lines.length - 1];
  if (
    role === "assistant" &&
    previous?.role === "assistant" &&
    ts - previous.ts < ASSISTANT_MERGE_WINDOW_MS
  ) {
    if (previous.text.toLowerCase().includes(text.toLowerCase())) return lines;
    return [
      ...lines.slice(0, -1),
      {
        ...previous,
        text: `${previous.text} ${text}`.replace(/\s+/g, " ").trim(),
        ts,
      },
    ];
  }

  return [...lines, { role, text, ts }];
}

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;

    const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, generated);
    return generated;
  } catch {
    return "";
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed (${response.status})`;
    throw new Error(error);
  }
  return payload as T;
}

let cachedVapiTokenPromise: Promise<TokenResponse> | null = null;

function fetchVapiToken(): Promise<TokenResponse> {
  if (!cachedVapiTokenPromise) {
    cachedVapiTokenPromise = fetchJson<TokenResponse>("/api/voice/vapi-token").catch((err) => {
      cachedVapiTokenPromise = null;
      throw err;
    });
  }
  return cachedVapiTokenPromise;
}

function resolveAssistantConfig(
  agentId: string,
  voiceMode: WebVoiceMode,
  speechLanguage: string
): Promise<AssistantConfig> {
  if (isNovaCareAgentId(agentId) && typeof window !== "undefined") {
    return Promise.resolve(
      buildNovaCareVapiAssistant({
        origin: window.location.origin,
        voiceMode,
        useSilkVoice: voiceMode !== "vapi",
        speechLanguage,
      }) as AssistantConfig
    );
  }
  return fetchJson<AssistantConfig>(
    `/api/agents/${agentId}/vapi-config?voice=${encodeURIComponent(voiceMode)}&lang=${encodeURIComponent(speechLanguage)}`
  );
}

/** Fire-and-forget — never block call join on infra warm. */
function warmSilkVoiceInfra(voiceMode: WebVoiceMode): void {
  if (!isSilkVoiceMode(voiceMode)) return;

  void Promise.allSettled(
    silkCriticalWarmPaths(window.location.origin, voiceMode).map((path) =>
      fetch(path, { method: "GET", cache: "no-store", keepalive: true })
    )
  );
  void Promise.allSettled(
    silkWarmPaths(window.location.origin).map((path) =>
      fetch(path, { method: "GET", cache: "no-store", keepalive: true })
    )
  );
}

// Prefer a value already in flight from prewarm(); if it's missing or the
// prewarm fetch rejected (e.g. user was briefly offline on mount), fall back to
// a fresh fetch so a stale failure never permanently blocks Start call.
async function cachedOrFetch<T>(cached: Promise<T> | undefined, fresh: () => Promise<T>): Promise<T> {
  if (cached) {
    try {
      return await cached;
    } catch {
      /* fall through to a fresh attempt */
    }
  }
  return fresh();
}

interface PrewarmCache {
  key: string;
  vapi: Promise<VapiCtor>;
  token: Promise<TokenResponse>;
  assistant: Promise<AssistantConfig>;
}

export function useWebVoiceCall(agentId: string, voiceMode: WebVoiceMode = "silk") {
  const [state, setState] = useState<WebVoiceCallState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [tension, setTension] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState(() => loadSpeechLanguage());
  const [transcript, setTranscript] = useState<WebVoiceTranscript[]>([]);
  // Live caption for the turn currently being spoken — updated on every partial
  // transcript and cleared the moment the final arrives. This is what makes text
  // appear in front of the user in realtime instead of only after each turn.
  const [interim, setInterim] = useState<{ role: "user" | "assistant"; text: string } | null>(null);

  const mountedRef = useRef(true);
  const mutedRef = useRef(false);
  const vapiRef = useRef<VapiInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runIdRef = useRef(0);
  const localAssistRunRef = useRef(0);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const localAudioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const localAudioCacheRef = useRef(new Map<string, Promise<LocalMugaClip>>());
  const localSpeechKeysRef = useRef(new Set<string>());
  const assistantUnmuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantTranscriptSuppressUntilRef = useRef(0);
  const assistantSystemPromptRef = useRef("");
  const micMutedBeforeLocalOutputRef = useRef<boolean | null>(null);
  const registeredCallIdsRef = useRef(new Set<string>());
  // Promises kicked off on mount so the heavy work (SDK import, token + assistant
  // config fetches) is already done by the time the user taps Start call. The
  // click then only needs the mic prompt + vapi.start() — that's the instant join.
  const prewarmRef = useRef<PrewarmCache | null>(null);
  const startingRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    const startedAt = Date.now();
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }, []);

  const destroyVapi = useCallback(async () => {
    const vapi = vapiRef.current;
    vapiRef.current = null;
    if (!vapi) return;

    try {
      vapi.removeAllListeners();
    } catch {}
    try {
      await vapi.stop();
    } catch {}
  }, []);

  const releaseAssistantAudio = useCallback(() => {
    if (assistantUnmuteTimerRef.current) {
      clearTimeout(assistantUnmuteTimerRef.current);
      assistantUnmuteTimerRef.current = null;
    }
    assistantTranscriptSuppressUntilRef.current = 0;
    sendVapiControl(vapiRef.current, "unmute-assistant");
  }, []);

  const suppressAssistantAudio = useCallback((ms?: number) => {
    if (assistantUnmuteTimerRef.current) clearTimeout(assistantUnmuteTimerRef.current);
    assistantUnmuteTimerRef.current = null;
    sendVapiControl(vapiRef.current, "mute-assistant");

    if (typeof ms === "number") {
      assistantTranscriptSuppressUntilRef.current = Math.max(
        assistantTranscriptSuppressUntilRef.current,
        Date.now() + ms
      );
      assistantUnmuteTimerRef.current = setTimeout(() => {
        assistantUnmuteTimerRef.current = null;
        sendVapiControl(vapiRef.current, "unmute-assistant");
      }, ms);
      return;
    }

    assistantTranscriptSuppressUntilRef.current = Number.POSITIVE_INFINITY;
  }, []);

  const muteMicForLocalOutput = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;
    if (micMutedBeforeLocalOutputRef.current === null) {
      micMutedBeforeLocalOutputRef.current = mutedRef.current;
    }
    try {
      vapi.setMuted(true);
      mutedRef.current = true;
      setMuted(true);
    } catch {}
  }, []);

  const restoreMicAfterLocalOutput = useCallback(() => {
    const vapi = vapiRef.current;
    const restoreTo = micMutedBeforeLocalOutputRef.current;
    micMutedBeforeLocalOutputRef.current = null;
    if (!vapi || restoreTo === null) return;
    try {
      vapi.setMuted(restoreTo);
      mutedRef.current = restoreTo;
      setMuted(restoreTo);
    } catch {}
  }, []);

  const stopLocalAssist = useCallback(() => {
    localAssistRunRef.current += 1;
    try {
      localSourceRef.current?.stop();
    } catch {}
    localSourceRef.current = null;
    localAudioQueueRef.current = Promise.resolve();
    localSpeechKeysRef.current.clear();
    assistantTranscriptSuppressUntilRef.current = 0;
    releaseAssistantAudio();
    restoreMicAfterLocalOutput();
  }, [releaseAssistantAudio, restoreMicAfterLocalOutput]);

  const getOrFetchLocalMugaClip = useCallback((text: string): Promise<LocalMugaClip> => {
    const key = normalizeMugaCacheText(text);
    const existing = localAudioCacheRef.current.get(key);
    if (existing) return existing;

    const pending = fetchLocalSilkClip(text, voiceMode).catch((err) => {
      localAudioCacheRef.current.delete(key);
      throw err;
    });
    localAudioCacheRef.current.set(key, pending);
    return pending;
  }, [voiceMode]);

  const canUseNovaCareCache = useCallback(() => {
    return agentId === NOVACARE_AGENT_ID || /\bnovacare\b/i.test(assistantSystemPromptRef.current);
  }, [agentId]);

  const speculativePrefetchRef = useRef("");
  const lastUserFinalAtRef = useRef<number | null>(null);
  const latencyCapturedRef = useRef(false);

  const speculativePrefetchSilk = useCallback((partialText: string) => {
    if (!isSilkVoiceMode(voiceMode) || !canUseNovaCareCache()) return;
    const answer = speculativeNovaCareAnswer(partialText);
    if (!answer) return;

    const key = normalizeMugaCacheText(answer);
    if (speculativePrefetchRef.current === key) return;
    speculativePrefetchRef.current = key;

    const voiceQuery = silkTtsQueryForMode(voiceMode).slice(1);
    const ttsBody = buildSilkTtsBody(voiceMode, answer);
    prefetchSilkTtsLeadSentence(window.location.origin, voiceQuery, ttsBody);
    prefetchSilkTts(window.location.origin, voiceQuery, ttsBody);
  }, [canUseNovaCareCache, voiceMode]);

  const prefetchLocalAssistForText = useCallback((text: string) => {
    if (isSilkVoiceMode(voiceMode)) {
      speculativePrefetchSilk(text);
      return;
    }
    if (!usesTalkWidgetLocalAssist(voiceMode) || voiceMode === "vapi" || text.trim().length < 10) return;
    const answer = canUseNovaCareCache() ? answerNovaCareQuestion(text) : "";
    if (answer) {
      void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, answer)).catch(() => {});
      return;
    }

    const bridge = bridgeForVoicePrompt(text);
    if (bridge) void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, bridge)).catch(() => {});
  }, [canUseNovaCareCache, getOrFetchLocalMugaClip, speculativePrefetchSilk, voiceMode]);

  const playLocalPcm = useCallback(async (clip: LocalMugaClip, localRunId: number) => {
    if (localRunId !== localAssistRunRef.current || !mountedRef.current) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) throw new Error("Audio playback is not supported in this browser.");

    const ctx = localAudioContextRef.current ?? new AudioContextCtor();
    localAudioContextRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const pcm = new Int16Array(clip.audio);
    const audioBuffer = ctx.createBuffer(1, pcm.length, clip.sampleRate);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
    }

    await new Promise<void>((resolve) => {
      if (localRunId !== localAssistRunRef.current || !mountedRef.current) return resolve();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (localSourceRef.current === source) localSourceRef.current = null;
        resolve();
      };
      localSourceRef.current = source;
      source.start();
    });
  }, []);

  const enqueueLocalSpeech = useCallback((text: string, callRunId: number, localRunId: number) => {
    const speakable = text.trim();
    if (!speakable) return;
    const speechKey = normalizeMugaCacheText(speakable);
    if (localSpeechKeysRef.current.has(speechKey)) return;
    localSpeechKeysRef.current.add(speechKey);

    // Start synthesis immediately, then queue only playback. This lets the real
    // answer render through MUGA while the cached bridge is still speaking,
    // which is the closest current MUGA API shape gets to a realtime turn.
    const clipPromise = (
      mountedRef.current &&
      callRunId === runIdRef.current &&
      localRunId === localAssistRunRef.current
    )
      ? getOrFetchLocalMugaClip(speakable)
      : Promise.resolve(null);

    localAudioQueueRef.current = localAudioQueueRef.current
      .then(async () => {
        if (
          !mountedRef.current ||
          callRunId !== runIdRef.current ||
          localRunId !== localAssistRunRef.current
        ) {
          return;
        }

        const clip = await clipPromise.catch(() => getOrFetchLocalMugaClip(speakable));
        if (
          !clip ||
          !mountedRef.current ||
          callRunId !== runIdRef.current ||
          localRunId !== localAssistRunRef.current
        ) {
          return;
        }

        await playLocalPcm(clip, localRunId);
      })
      .catch((err) => {
        if (!mountedRef.current || callRunId !== runIdRef.current || localRunId !== localAssistRunRef.current) return;
        console.warn("[voice] local MUGA speech failed", err);
        releaseAssistantAudio();
      });
  }, [getOrFetchLocalMugaClip, playLocalPcm, releaseAssistantAudio]);

  const streamLocalAnswer = useCallback(async (
    userText: string,
    bridge: string,
    callRunId: number,
    localRunId: number
  ) => {
    const systemPrompt = assistantSystemPromptRef.current;
    const messages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      { role: "user", content: userText },
    ];

    const response = await fetch(
      `/api/voice/vapi-llm?${vapiLlmVoiceQuery(voiceMode)}&fast=1&local=1&lang=${encodeURIComponent(speechLanguage)}`,
      {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true, messages }),
      }
    );

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || "AI response failed.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let strippedBridge = false;
    let answerText = "";
    const chunker = new StreamSpeechChunker((chunk) => {
      enqueueLocalSpeech(silkSpeechText(voiceMode, chunk), callRunId, localRunId);
    });

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!mountedRef.current || callRunId !== runIdRef.current || localRunId !== localAssistRunRef.current) return;

      buffer += decoder.decode(value, { stream: true });
      const parsed = readSsePayloads(buffer);
      buffer = parsed.rest;

      for (const event of parsed.events) {
        for (const rawLine of event.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          try {
            const data = JSON.parse(payload) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            let content = data.choices?.[0]?.delta?.content ?? "";
            if (!content) continue;

            if (bridge && !strippedBridge) {
              const withoutBridge = stripLeadingBridge(content, bridge);
              if (withoutBridge !== stripVoiceMarkers(content)) {
                strippedBridge = true;
                content = withoutBridge;
                if (!content) continue;
              }
            }

            const transcriptText = stripVoiceMarkers(content);
            if (transcriptText) {
              answerText = `${answerText} ${transcriptText}`.replace(/\s+/g, " ").trim();
              setTranscript(lines => appendTranscriptLine(lines, "assistant", transcriptText, Date.now()));
            }
            chunker.push(content);
          } catch {}
        }
      }
    }

    chunker.finish();
    return answerText;
  }, [enqueueLocalSpeech, speechLanguage, voiceMode]);

  const playLocalAssistForUserText = useCallback((userText: string, callRunId: number) => {
    if (!usesTalkWidgetLocalAssist(voiceMode) || voiceMode === "vapi") return;

    const cachedAnswer = canUseNovaCareCache() ? answerNovaCareQuestion(userText) : "";
    const bridge = cachedAnswer ? "" : bridgeForVoicePrompt(userText);

    const localRunId = localAssistRunRef.current + 1;
    localAssistRunRef.current = localRunId;
    try {
      localSourceRef.current?.stop();
    } catch {}
    localSourceRef.current = null;
    localAudioQueueRef.current = Promise.resolve();
    localSpeechKeysRef.current = new Set();

    muteMicForLocalOutput();
    suppressAssistantAudio();

    void (async () => {
      try {
        if (cachedAnswer) {
          setTranscript(lines => appendTranscriptLine(lines, "assistant", cachedAnswer, Date.now()));
          enqueueLocalSpeech(silkSpeechText(voiceMode, cachedAnswer), callRunId, localRunId);
          await localAudioQueueRef.current;
          if (mountedRef.current && callRunId === runIdRef.current && localRunId === localAssistRunRef.current) {
            restoreMicAfterLocalOutput();
          }
          return;
        }

        if (bridge) {
          setTranscript(lines => appendTranscriptLine(lines, "assistant", bridge, Date.now()));
          enqueueLocalSpeech(silkSpeechText(voiceMode, bridge), callRunId, localRunId);
        }

        await streamLocalAnswer(userText, bridge, callRunId, localRunId);
        await localAudioQueueRef.current;
        if (mountedRef.current && callRunId === runIdRef.current && localRunId === localAssistRunRef.current) {
          restoreMicAfterLocalOutput();
        }
      } catch (err) {
        if (!mountedRef.current || callRunId !== runIdRef.current || localRunId !== localAssistRunRef.current) return;
        console.warn("[voice] local MUGA assist failed", err);
        releaseAssistantAudio();
        restoreMicAfterLocalOutput();
      }
    })();
  }, [
    canUseNovaCareCache,
    enqueueLocalSpeech,
    getOrFetchLocalMugaClip,
    muteMicForLocalOutput,
    releaseAssistantAudio,
    restoreMicAfterLocalOutput,
    streamLocalAnswer,
    suppressAssistantAudio,
    voiceMode,
  ]);

  const cleanupCall = useCallback(async () => {
    stopTimer();
    stopLocalAssist();
    await destroyVapi();
    mutedRef.current = false;
    setMuted(false);
  }, [destroyVapi, stopLocalAssist, stopTimer]);

  const registerCall = useCallback(async (callId: string) => {
    if (!callId || registeredCallIdsRef.current.has(callId)) return;
    registeredCallIdsRef.current.add(callId);

    try {
      await fetchJson("/api/voice/web-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, callId, visitorId: getOrCreateVisitorId() }),
      });
    } catch (err) {
      console.warn("[voice] failed to register web session", err);
    }
  }, [agentId]);

  const finishCall = useCallback(async (nextState: WebVoiceCallState = "ended") => {
    if (nextState === "ended") setState("ending");
    await cleanupCall();
    if (mountedRef.current) {
      setInterim(null);
      setState(nextState);
    }
  }, [cleanupCall]);

  const captureSpeechLatency = useCallback(() => {
    const startedAt = lastUserFinalAtRef.current;
    if (!startedAt || latencyCapturedRef.current) return;
    latencyCapturedRef.current = true;
    setLatencyMs(Date.now() - startedAt);
  }, []);

  const changeSpeechLanguage = useCallback((code: string) => {
    setSpeechLanguage(code);
    saveSpeechLanguage(code);
    prewarmRef.current = null;
  }, []);

  const prewarm = useCallback(() => {
    if (!agentId || typeof window === "undefined") return;
    const key = `${agentId}::${voiceMode}::${speechLanguage}`;
    if (prewarmRef.current?.key === key) return; // already warming/warm for this combo

    prewarmRef.current = {
      key,
      vapi: loadVapiCtor(),
      token: fetchVapiToken(),
      assistant: resolveAssistantConfig(agentId, voiceMode, speechLanguage),
    };
    warmSilkVoiceInfra(voiceMode);
    // Swallow rejections now so React/browser don't flag unhandled rejections;
    // startCall still awaits these and falls back to a fresh fetch on failure.
    // Mic permission is requested only on Start call — prewarming mic in iframes
    // races autostart and can leave Vapi without a live track.
    prewarmRef.current.vapi.catch(() => {});
    prewarmRef.current.token.catch(() => {});
    prewarmRef.current.assistant.catch(() => {});

    if (usesTalkWidgetLocalAssist(voiceMode)) {
      for (const phrase of PREFETCHED_LOCAL_MUGA_PHRASES) {
        void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, phrase)).catch(() => {});
      }
    }
  }, [agentId, getOrFetchLocalMugaClip, speechLanguage, voiceMode]);

  const startCall = useCallback(async () => {
    if (!agentId) {
      setError("Select an agent first.");
      setState("error");
      return;
    }
    if (startingRef.current) return;
    startingRef.current = true;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    try {
      await cleanupCall();
      if (!mountedRef.current || runId !== runIdRef.current) return;

      setState("connecting");
      setError("");
      setTranscript([]);
      setInterim(null);
      setTension(0);
      setDuration(0);
      setLatencyMs(null);
      lastUserFinalAtRef.current = null;
      latencyCapturedRef.current = false;

      const key = `${agentId}::${voiceMode}::${speechLanguage}`;
      const warm = prewarmRef.current?.key === key ? prewarmRef.current : null;

      warmSilkVoiceInfra(voiceMode);

      await preflightMicrophone();

      const [Vapi, token, assistant] = await withTimeout(
        Promise.all([
          cachedOrFetch(warm?.vapi, loadVapiCtor),
          cachedOrFetch(warm?.token, fetchVapiToken),
          cachedOrFetch(warm?.assistant, () => resolveAssistantConfig(agentId, voiceMode, speechLanguage)),
        ]),
        CONFIG_TIMEOUT_MS,
        "Voice configuration took too long to load. Retry in a moment."
      ).then(([Ctor, tokenResponse, assistantConfig]) => [Ctor, tokenResponse, assistantConfig] as const);

      if (!mountedRef.current || runId !== runIdRef.current) return;

      assistantSystemPromptRef.current = extractAssistantSystemPrompt(assistant);

      const vapi = new Vapi(
        token.apiKey,
        undefined,
        { alwaysIncludeMicInPermissionPrompt: true },
        { startAudioOff: false }
      );
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        if (usesTalkWidgetLocalAssist(voiceMode)) {
          suppressAssistantAudio();
        }
        setState("active");
        startTimer();
      });

      vapi.on("call-start-success", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        if (event.callId) void registerCall(event.callId);
      });

      vapi.on("call-start-failed", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        const failed = event as { error?: unknown; message?: unknown };
        setError(normalizeVoiceCallError(failed.error ?? failed.message ?? event));
        void finishCall("error");
      });

      vapi.on("call-end", () => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        stopTimer();
        setState(prev => prev === "ending" ? "ended" : "ended");
      });

      vapi.on("speech-start", () => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        captureSpeechLatency();
        setState("active");
        startTimer();
      });

      vapi.on("message", message => {
        if (!mountedRef.current || runId !== runIdRef.current || !message) return;

        const msg = message as Record<string, unknown>;
        if (msg.type === "transcript") {
          const text = getTranscriptText(msg);
          if (!text) return;

          const role = normalizeTranscriptRole(msg.role);
          if (role === "assistant" && voiceMode !== "vapi" && isVapiPlaceholderTranscript(text)) return;

          // Partials stream in as the speaker talks — show them live, don't commit.
          if (msg.transcriptType !== "final") {
            if (role === "user") {
              prefetchLocalAssistForText(text);
            }
            if (role === "assistant" && Date.now() < assistantTranscriptSuppressUntilRef.current) return;
            setInterim({ role, text });
            return;
          }

          if (role === "assistant" && Date.now() < assistantTranscriptSuppressUntilRef.current) return;
          if (role === "assistant" && usesTalkWidgetLocalAssist(voiceMode)) return;

          const ts = Date.now();
          setInterim(null);
          setTranscript(lines => appendTranscriptLine(lines, role, text, ts));
          if (role === "user") {
            speculativePrefetchRef.current = "";
            lastUserFinalAtRef.current = ts;
            latencyCapturedRef.current = false;
            setTension(value => Math.min(10, value + 0.4));
            prefetchLocalAssistForText(text);
            playLocalAssistForUserText(text, runId);
          }
          if (role === "assistant") {
            captureSpeechLatency();
          }
        }

        if (msg.type === "status-update" && msg.status === "ended") {
          void finishCall("ended");
        }
      });

      vapi.on("error", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setError(normalizeVoiceCallError(event));
        void finishCall("error");
      });

      setState("joining");
      const call = await withTimeout(
        vapi.start(assistant),
        START_TIMEOUT_MS,
        "Vapi did not finish starting the web call. Check mic permission and retry."
      ) as CallResponse | null;

      if (!call) {
        throw new Error("Vapi returned no call session. Refresh and try again.");
      }
      if (call.id) void registerCall(call.id);
    } catch (err) {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      await cleanupCall();
      setError(normalizeVoiceCallError(err));
      setState("error");
    } finally {
      startingRef.current = false;
    }
  }, [
    agentId,
    cleanupCall,
    finishCall,
    playLocalAssistForUserText,
    prefetchLocalAssistForText,
    registerCall,
    speechLanguage,
    startTimer,
    stopTimer,
    suppressAssistantAudio,
    voiceMode,
  ]);

  const endCall = useCallback(async () => {
    runIdRef.current += 1;
    const vapi = vapiRef.current;
    setState("ending");
    stopTimer();
    stopLocalAssist();
    if (vapi) {
      try {
        vapi.end();
      } catch {
        try {
          await vapi.stop();
        } catch {}
      }
      try {
        vapi.removeAllListeners();
      } catch {}
      vapiRef.current = null;
    }
    if (mountedRef.current) setState("ended");
  }, [stopLocalAssist, stopTimer]);

  const reset = useCallback(async () => {
    runIdRef.current += 1;
    await cleanupCall();
    if (!mountedRef.current) return;
    setState("idle");
    setError("");
    setTranscript([]);
    setInterim(null);
    setTension(0);
    setDuration(0);
    setLatencyMs(null);
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;

    const nextMuted = !muted;
    vapi.setMuted(nextMuted);
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
  }, [muted]);

  // Kick off the heavy startup work as soon as the talk screen mounts (and again
  // if the agent/voice changes) so Start call is an instant join, not a 1–2s wait.
  useEffect(() => {
    prewarm();
  }, [prewarm]);

  useEffect(() => {
    if (!isSilkVoiceMode(voiceMode)) return;

    const ping = () => {
      if (document.hidden) return;
      for (const path of silkWarmPaths()) {
        fetch(path, { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
      }
    };

    ping();
    const timer = window.setInterval(ping, SILK_WARM_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [voiceMode]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      void cleanupCall();
    };
  }, [cleanupCall]);

  return {
    state,
    error,
    muted,
    duration,
    tension,
    latencyMs,
    speechLanguage,
    changeSpeechLanguage,
    transcript,
    interim,
    startCall,
    endCall,
    reset,
    toggleMute,
  };
}
