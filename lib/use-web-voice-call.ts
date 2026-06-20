"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cachedAudioText,
  isNovaCareAgentId,
  normalizeMugaCacheText,
  NOVACARE_AGENT_ID,
} from "@/lib/novacare-knowledge";
import {
  isGenericBrainFallback,
  isScriptMissingResponse,
  resolveSpeechRoute,
  speechRouteLabel,
} from "@/lib/speech-route";
import { buildNovaCareVapiAssistant } from "@/lib/novacare-vapi-config";
import { DEFAULT_SPEECH_LANGUAGE } from "@/lib/speech-languages";
import { MicSilenceGate, micConfirmsUserSpeech, shouldAcceptUserUtterance } from "@/lib/mic-silence-gate";
import {
  buildSilkTtsBody,
  isSilkVoiceMode,
  silkCriticalWarmPaths,
  silkModelForVoiceMode,
  fireSilkWarmPaths,
  startSilkWarmKeepalive,
  silkSpeechText,
  silkTtsQueryForMode,
  SILK_MIC_SILENCE,
  usesBrowserSilkPlayback,
  usesTalkWidgetLocalAssist,
  vapiLlmVoiceQuery,
  type WebVoiceMode,
} from "@/lib/silk-voice";
import {
  haltAudioPlayback,
  playBufferedPcm,
  playStreamingPcmResponse,
  resetAudioPlayhead,
  stopAllScheduledSources,
} from "@/lib/silk-stream-player";
import {
  prefetchSilkTts,
  prefetchSilkTtsLeadSentence,
  shouldStartSpeculativeLlm,
  transcriptsAlign,
} from "@/lib/realtime-voice";
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
/** Demo FAQs — prefetched once per call so speech-to-speech stays under 1s. */
const VOICE_DEMO_FAQ_IDS = ["plans", "opd", "claims"] as const;
const FAST_CHUNKER = { minChars: 8, maxChars: 64 } as const;
const SPECULATIVE_DEBOUNCE_MS = 0;
const UTTERANCE_COALESCE_MS = 32;
const VAPI_PLACEHOLDER_TRANSCRIPT_RE =
  /^(?:got it|i understand)[.!?\s]*$|don't have the answer to this question from my support script/i;
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

function appendText(current: string, delta: string): string {
  return `${current} ${delta}`.replace(/\s+/g, " ").trim();
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
        browserSilkPlayback: usesBrowserSilkPlayback(voiceMode),
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

  fireSilkWarmPaths(silkCriticalWarmPaths(window.location.origin, voiceMode));
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
  const [speechTransport, setSpeechTransport] = useState("");
  const speechLanguage = DEFAULT_SPEECH_LANGUAGE;
  const [transcript, setTranscript] = useState<WebVoiceTranscript[]>([]);
  const transcriptRef = useRef<WebVoiceTranscript[]>([]);
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
  const assistantFirstMessageRef = useRef("");
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
    if (usesBrowserSilkPlayback(voiceMode)) return;
    if (assistantUnmuteTimerRef.current) {
      clearTimeout(assistantUnmuteTimerRef.current);
      assistantUnmuteTimerRef.current = null;
    }
    assistantTranscriptSuppressUntilRef.current = 0;
    sendVapiControl(vapiRef.current, "unmute-assistant");
  }, [voiceMode]);

  const suppressAssistantAudio = useCallback((ms?: number) => {
    const keepMuted = usesBrowserSilkPlayback(voiceMode);
    if (assistantUnmuteTimerRef.current) clearTimeout(assistantUnmuteTimerRef.current);
    assistantUnmuteTimerRef.current = null;
    sendVapiControl(vapiRef.current, "mute-assistant");

    if (typeof ms === "number") {
      assistantTranscriptSuppressUntilRef.current = Math.max(
        assistantTranscriptSuppressUntilRef.current,
        Date.now() + ms
      );
      if (!keepMuted) {
        assistantUnmuteTimerRef.current = setTimeout(() => {
          assistantUnmuteTimerRef.current = null;
          sendVapiControl(vapiRef.current, "unmute-assistant");
        }, ms);
      }
      return;
    }

    assistantTranscriptSuppressUntilRef.current = Number.POSITIVE_INFINITY;
  }, [voiceMode]);

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

  const interruptPlayback = useCallback(() => {
    playbackGenerationRef.current += 1;
    localAssistRunRef.current += 1;
    respondAttemptRef.current += 1;
    speculativeRunIdRef.current += 1;
    localStreamAbortRef.current?.abort();
    localStreamAbortRef.current = null;
    localTtsAbortRef.current?.abort();
    localTtsAbortRef.current = null;
    speculativeAbortRef.current?.abort();
    speculativeAbortRef.current = null;
    if (speculativeDebounceRef.current) clearTimeout(speculativeDebounceRef.current);
    speculativeDebounceRef.current = null;
    speculativePartialRef.current = "";
    speculativeAnswerRef.current = "";
    speculativeChunksReadyRef.current = 0;
    pendingUserUtteranceRef.current = null;
    userSpeechStoppedRef.current = false;
    try {
      localSourceRef.current?.stop();
    } catch {}
    localSourceRef.current = null;
    stopAllScheduledSources();
    haltAudioPlayback(localAudioContextRef.current);
    localAudioContextRef.current = null;
    localAudioQueueRef.current = Promise.resolve();
    localSpeechKeysRef.current.clear();
    lastDispatchedUtteranceRef.current = "";
  }, []);

  const stopLocalAssist = useCallback(() => {
    interruptPlayback();
    assistantTranscriptSuppressUntilRef.current = 0;
    releaseAssistantAudio();
    restoreMicAfterLocalOutput();
  }, [interruptPlayback, releaseAssistantAudio, restoreMicAfterLocalOutput]);

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
  const speculativeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speculativeAbortRef = useRef<AbortController | null>(null);
  const speculativePartialRef = useRef("");
  const speculativeAnswerRef = useRef("");
  const speculativeChunksReadyRef = useRef(0);
  const speculativePromiseRef = useRef<Promise<void> | null>(null);
  const speculativeRunIdRef = useRef(0);
  const lastUserSpeechEndAtRef = useRef<number | null>(null);
  const lastUserFinalAtRef = useRef<number | null>(null);
  const latencyCapturedRef = useRef(false);
  const pendingUserUtteranceRef = useRef<{ text: string; runId: number } | null>(null);
  const userSpeechStoppedRef = useRef(false);
  const respondAttemptRef = useRef(0);
  const micSilenceGateRef = useRef<MicSilenceGate | null>(null);
  const localStreamAbortRef = useRef<AbortController | null>(null);
  const localTtsAbortRef = useRef<AbortController | null>(null);
  const playbackGenerationRef = useRef(0);
  const playLocalAssistFnRef = useRef<(userText: string, callRunId: number) => void>(() => {});
  const lastDispatchedUtteranceRef = useRef("");

  const commitTranscript = useCallback((
    role: "user" | "assistant",
    text: string,
    ts = Date.now()
  ) => {
    const next = appendTranscriptLine(transcriptRef.current, role, text, ts);
    transcriptRef.current = next;
    setTranscript(next);
    return next;
  }, []);

  const buildBrainMessages = useCallback((userText: string) => {
    const systemPrompt = assistantSystemPromptRef.current;
    const history = transcriptRef.current.slice(-8).map((line) => ({
      role: line.role,
      content: line.text,
    }));
    const last = history[history.length - 1];
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    if (last?.role === "user" && normalizeMugaCacheText(last.content) === normalizeMugaCacheText(userText)) {
      messages.push(...history);
    } else {
      messages.push(...history, { role: "user", content: userText });
    }
    return messages;
  }, []);

  const captureFirstAudioLatency = useCallback(() => {
    const startedAt = lastUserSpeechEndAtRef.current ?? lastUserFinalAtRef.current;
    if (!startedAt || latencyCapturedRef.current) return;
    latencyCapturedRef.current = true;
    setLatencyMs(Date.now() - startedAt);
  }, []);

  const prefetchVoiceFaqClips = useCallback(() => {
    if (!usesBrowserSilkPlayback(voiceMode) || !canUseNovaCareCache()) return;
    for (const id of VOICE_DEMO_FAQ_IDS) {
      const text = cachedAudioText(id);
      if (!text) continue;
      void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, text)).catch(() => {});
    }
  }, [canUseNovaCareCache, getOrFetchLocalMugaClip, voiceMode]);

  const speculativePrefetchSilk = useCallback((partialText: string) => {
    if (!isSilkVoiceMode(voiceMode) || !canUseNovaCareCache()) return;
    const route = resolveSpeechRoute(partialText, {
      agentId,
      systemPrompt: assistantSystemPromptRef.current,
    });
    if (route.kind !== "cached-faq" && route.kind !== "out-of-scope") return;
    const answer = route.answer;
    if (!answer) return;

    const key = normalizeMugaCacheText(answer);
    if (speculativePrefetchRef.current === key) return;
    speculativePrefetchRef.current = key;

    void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, answer)).catch(() => {});

    const voiceQuery = silkTtsQueryForMode(voiceMode).slice(1);
    const ttsBody = buildSilkTtsBody(voiceMode, answer);
    prefetchSilkTtsLeadSentence(window.location.origin, voiceQuery, ttsBody);
    prefetchSilkTts(window.location.origin, voiceQuery, ttsBody);
  }, [agentId, canUseNovaCareCache, getOrFetchLocalMugaClip, voiceMode]);

  const prefetchFirstSpeechChunk = useCallback((chunk: string) => {
    const speakable = silkSpeechText(voiceMode, chunk).trim();
    if (!speakable) return;
    void getOrFetchLocalMugaClip(speakable).catch(() => {});
    const voiceQuery = silkTtsQueryForMode(voiceMode).slice(1);
    prefetchSilkTtsLeadSentence(
      window.location.origin,
      voiceQuery,
      buildSilkTtsBody(voiceMode, speakable)
    );
  }, [getOrFetchLocalMugaClip, voiceMode]);

  const runSpeculativeLlm = useCallback((partial: string) => {
    if (!usesBrowserSilkPlayback(voiceMode)) return;

    const route = resolveSpeechRoute(partial, {
      agentId,
      systemPrompt: assistantSystemPromptRef.current,
    });

    if (route.kind === "cached-faq" || route.kind === "out-of-scope") {
      speculativePartialRef.current = partial;
      speculativeAnswerRef.current = route.answer;
      void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, route.answer)).catch(() => {});
      return;
    }

    if (route.kind === "conversational") {
      speculativePartialRef.current = partial;
      speculativeAnswerRef.current = route.answer;
      return;
    }

    speculativeAbortRef.current?.abort();
    const abort = new AbortController();
    speculativeAbortRef.current = abort;
    speculativePartialRef.current = partial;
    speculativeAnswerRef.current = "";
    speculativeChunksReadyRef.current = 0;
    const specRunId = ++speculativeRunIdRef.current;
    const job = (async () => {
      try {
        const res = await fetch(
          `/api/voice/vapi-llm?${vapiLlmVoiceQuery(voiceMode)}&fast=1&local=1&lang=${encodeURIComponent(speechLanguage)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: abort.signal,
            body: JSON.stringify({
              stream: true,
              messages: buildBrainMessages(partial),
            }),
          }
        );
        if (!res.ok || !res.body || specRunId !== speculativeRunIdRef.current) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const chunker = new StreamSpeechChunker((chunk) => {
          if (specRunId !== speculativeRunIdRef.current) return;
          speculativeChunksReadyRef.current += 1;
          if (speculativeChunksReadyRef.current === 1) prefetchFirstSpeechChunk(chunk);
        }, FAST_CHUNKER);

        for (;;) {
          const { done, value } = await reader.read();
          if (done || abort.signal.aborted || specRunId !== speculativeRunIdRef.current) break;
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
                const content = data.choices?.[0]?.delta?.content ?? "";
                if (!content) continue;
                speculativeAnswerRef.current = appendText(speculativeAnswerRef.current, content);
                chunker.push(content);
              } catch {}
            }
          }
        }
        chunker.finish();
      } catch {
        /* cancelled or failed */
      }
    })();

    speculativePromiseRef.current = job;
    void job.finally(() => {
      if (speculativePromiseRef.current === job) speculativePromiseRef.current = null;
    });
  }, [agentId, buildBrainMessages, prefetchFirstSpeechChunk, speechLanguage, voiceMode]);

  const scheduleSpeculativeLlm = useCallback((partial: string) => {
    if (!usesBrowserSilkPlayback(voiceMode) || !shouldStartSpeculativeLlm(partial)) return;
    if (speculativeDebounceRef.current) clearTimeout(speculativeDebounceRef.current);
    speculativeDebounceRef.current = setTimeout(() => {
      runSpeculativeLlm(partial);
    }, SPECULATIVE_DEBOUNCE_MS);
  }, [runSpeculativeLlm, voiceMode]);

  const prefetchLocalAssistForText = useCallback((text: string) => {
    if (!usesBrowserSilkPlayback(voiceMode)) return;
    if (isSilkVoiceMode(voiceMode) && canUseNovaCareCache()) {
      speculativePrefetchSilk(text);
    }
    if (text.trim().length < 10) return;

    const route = resolveSpeechRoute(text, {
      agentId,
      systemPrompt: assistantSystemPromptRef.current,
    });
    if (route.kind === "cached-faq" || route.kind === "out-of-scope") {
      void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, route.answer)).catch(() => {});
      return;
    }

    const bridge = bridgeForVoicePrompt(text);
    if (bridge) void getOrFetchLocalMugaClip(silkSpeechText(voiceMode, bridge)).catch(() => {});
  }, [agentId, canUseNovaCareCache, getOrFetchLocalMugaClip, speculativePrefetchSilk, voiceMode]);

  const playLocalPcm = useCallback(async (
    clip: LocalMugaClip,
    localRunId: number,
    onFirstFrame?: () => void
  ) => {
    if (localRunId !== localAssistRunRef.current || !mountedRef.current) return;

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) throw new Error("Audio playback is not supported in this browser.");

    const ctx = localAudioContextRef.current ?? new AudioContextCtor();
    localAudioContextRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    await playBufferedPcm(
      clip.audio,
      clip.sampleRate,
      localRunId,
      () => localRunId === localAssistRunRef.current && mountedRef.current,
      ctx,
      onFirstFrame
    );
  }, []);

  const isLocalSpeechActive = useCallback(
    (callRunId: number, localRunId: number) =>
      mountedRef.current &&
      callRunId === runIdRef.current &&
      localRunId === localAssistRunRef.current,
    []
  );

  const enqueueLocalSpeech = useCallback((
    text: string,
    callRunId: number,
    localRunId: number,
    opts?: { forceLive?: boolean }
  ) => {
    const speakable = silkSpeechText(voiceMode, text).trim();
    if (!speakable) return;
    const speechKey = normalizeMugaCacheText(speakable);
    if (localSpeechKeysRef.current.has(speechKey)) return;
    localSpeechKeysRef.current.add(speechKey);

    const onFirstFrame = () => captureFirstAudioLatency();
    const forceLive = Boolean(opts?.forceLive);
    const query = silkTtsQueryForMode(voiceMode, forceLive);
    const cachedClip = forceLive ? undefined : localAudioCacheRef.current.get(speechKey);

    const job = (cachedClip
      ? cachedClip.then(async (clip) => {
          if (!isLocalSpeechActive(callRunId, localRunId)) return;
          setSpeechTransport("cached-local-pcm");
          await playLocalPcm(clip, localRunId, onFirstFrame);
        })
      : fetch(`/api/voice/silk-tts${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: localTtsAbortRef.current?.signal,
          body: JSON.stringify(buildSilkTtsBody(voiceMode, speakable)),
        }).then(async (response) => {
          if (!isLocalSpeechActive(callRunId, localRunId)) return;

          const transport = response.headers.get("x-silk-transport") ?? "";
          if (!response.ok) {
            const detail = await response.text().catch(() => "");
            throw new Error(detail || "SILK speech failed.");
          }

          setSpeechTransport(
            forceLive ? "mulberry-live" : transport || "websocket"
          );

          if (!forceLive && transport.includes("cached")) {
            const buf = await response.arrayBuffer();
            await playBufferedPcm(
              buf,
              Number(response.headers.get("x-audio-sample-rate") ?? LOCAL_MUGA_SAMPLE_RATE),
              localRunId,
              () => isLocalSpeechActive(callRunId, localRunId),
              localAudioContextRef.current,
              onFirstFrame
            );
            return;
          }

          const playback = await playStreamingPcmResponse(
            response,
            localRunId,
            () => isLocalSpeechActive(callRunId, localRunId),
            localAudioContextRef.current,
            onFirstFrame
          );
          setSpeechTransport(
            forceLive
              ? "mulberry-live"
              : playback.transport || transport || "websocket"
          );
        })
    ).catch((err) => {
      if (!isLocalSpeechActive(callRunId, localRunId)) return;
      console.warn("[voice] browser SILK speech failed", err);
      setError(err instanceof Error ? err.message.slice(0, 240) : "Speech playback failed.");
    });

    localAudioQueueRef.current = localAudioQueueRef.current.then(() => job);
  }, [captureFirstAudioLatency, isLocalSpeechActive, playLocalPcm, voiceMode]);

  const streamLocalAnswer = useCallback(async (
    userText: string,
    bridge: string,
    callRunId: number,
    localRunId: number
  ) => {
    const messages = buildBrainMessages(userText);

    const streamAbort = localStreamAbortRef.current;
    const response = await fetch(
      `/api/voice/vapi-llm?${vapiLlmVoiceQuery(voiceMode)}&fast=1&local=1&lang=${encodeURIComponent(speechLanguage)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: streamAbort?.signal,
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
    let speechStarted = false;
    const chunker = new StreamSpeechChunker((chunk) => {
      const spoken = stripVoiceMarkers(chunk).trim();
      if (!spoken || isScriptMissingResponse(spoken) || isGenericBrainFallback(spoken)) return;
      if (!mountedRef.current || callRunId !== runIdRef.current || localRunId !== localAssistRunRef.current) return;
      speechStarted = true;
      setSpeechTransport("gemini-live");
      enqueueLocalSpeech(spoken, callRunId, localRunId, { forceLive: true });
    }, FAST_CHUNKER);

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
            if (
              transcriptText &&
              !isScriptMissingResponse(transcriptText) &&
              !isGenericBrainFallback(transcriptText)
            ) {
              answerText = `${answerText} ${transcriptText}`.replace(/\s+/g, " ").trim();
              commitTranscript("assistant", transcriptText);
              chunker.push(transcriptText);
            }
          } catch {}
        }
      }
    }

    chunker.finish();
    if (!speechStarted) {
      const spoken = stripVoiceMarkers(answerText).trim();
      if (spoken && !isScriptMissingResponse(spoken) && !isGenericBrainFallback(spoken)) {
        enqueueLocalSpeech(spoken, callRunId, localRunId, { forceLive: true });
      } else if (!speechStarted && isGenericBrainFallback(spoken)) {
        console.warn("[voice] brain returned generic fallback — check Gemini API key / history");
        setError("Could not get an answer. Check connection and try again.");
      }
    }
    return answerText;
  }, [buildBrainMessages, commitTranscript, enqueueLocalSpeech, speechLanguage, voiceMode]);

  const stopMicSilenceGate = useCallback(() => {
    micSilenceGateRef.current?.stop();
    micSilenceGateRef.current = null;
  }, []);

  const startMicSilenceGate = useCallback(() => {
    stopMicSilenceGate();
    const gate = new MicSilenceGate({
      speechRmsThreshold: SILK_MIC_SILENCE.speechRmsThreshold,
      silenceMs: SILK_MIC_SILENCE.silenceMs,
      speechConfirmMs: SILK_MIC_SILENCE.speechConfirmMs,
    });
    micSilenceGateRef.current = gate;
    void gate.start().catch(() => {
      if (micSilenceGateRef.current === gate) micSilenceGateRef.current = null;
    });
  }, [stopMicSilenceGate]);

  const dispatchUserUtterance = useCallback((userText: string, callRunId: number) => {
    if (!usesTalkWidgetLocalAssist(voiceMode) || voiceMode === "vapi") return;

    const key = `${callRunId}::${normalizeMugaCacheText(userText)}`;
    if (lastDispatchedUtteranceRef.current === key) return;
    lastDispatchedUtteranceRef.current = key;

    pendingUserUtteranceRef.current = null;
    userSpeechStoppedRef.current = true;
    lastUserSpeechEndAtRef.current = Date.now();
    respondAttemptRef.current += 1;
    playLocalAssistFnRef.current(userText, callRunId);
  }, [voiceMode]);

  const tryPlayAfterSilence = useCallback(async () => {
    const pending = pendingUserUtteranceRef.current;
    if (!pending || !userSpeechStoppedRef.current) return;
    if (!usesTalkWidgetLocalAssist(voiceMode) || voiceMode === "vapi") return;

    await new Promise((resolve) => setTimeout(resolve, UTTERANCE_COALESCE_MS));

    const stillPending = pendingUserUtteranceRef.current;
    if (!stillPending || stillPending.text !== pending.text || stillPending.runId !== pending.runId) return;
    if (!userSpeechStoppedRef.current || pending.runId !== runIdRef.current) return;

    dispatchUserUtterance(pending.text, pending.runId);
  }, [dispatchUserUtterance, voiceMode]);

  const playLocalAssistForUserText = useCallback((userText: string, callRunId: number) => {
    if (!usesTalkWidgetLocalAssist(voiceMode) || voiceMode === "vapi") return;

    const route = resolveSpeechRoute(userText, {
      agentId,
      systemPrompt: assistantSystemPromptRef.current,
    });
    const specPartial = speculativePartialRef.current;
    const specAligned = Boolean(specPartial && transcriptsAlign(specPartial, userText));
    const specAnswer = stripVoiceMarkers(speculativeAnswerRef.current).trim();
    const partialRoute = specPartial
      ? resolveSpeechRoute(specPartial, {
          agentId,
          systemPrompt: assistantSystemPromptRef.current,
        })
      : null;
    const useSpeculative =
      route.kind === "brain" &&
      partialRoute?.kind === "brain" &&
      specAligned &&
      specAnswer.length > 0 &&
      !isScriptMissingResponse(specAnswer) &&
      !isGenericBrainFallback(specAnswer);

    const playbackGen = playbackGenerationRef.current;
    const localRunId = localAssistRunRef.current + 1;
    localAssistRunRef.current = localRunId;
    try {
      localSourceRef.current?.stop();
    } catch {}
    localSourceRef.current = null;
    localAudioQueueRef.current = Promise.resolve();
    localSpeechKeysRef.current = new Set();
    localStreamAbortRef.current?.abort();
    localStreamAbortRef.current = new AbortController();
    localTtsAbortRef.current?.abort();
    localTtsAbortRef.current = new AbortController();
    resetAudioPlayhead(localAudioContextRef.current);

    muteMicForLocalOutput();
    suppressAssistantAudio();

    setSpeechTransport(speechRouteLabel(route));

    void (async () => {
      try {
        if (playbackGen !== playbackGenerationRef.current) return;

        if (route.kind === "cached-faq" || route.kind === "out-of-scope") {
          commitTranscript("assistant", route.answer);
          const speakable = silkSpeechText(voiceMode, route.answer);
          const clip = await getOrFetchLocalMugaClip(speakable);
          if (!isLocalSpeechActive(callRunId, localRunId) || playbackGen !== playbackGenerationRef.current) return;
          setSpeechTransport(speechRouteLabel(route));
          await playLocalPcm(clip, localRunId, () => captureFirstAudioLatency());
          if (mountedRef.current && callRunId === runIdRef.current && localRunId === localAssistRunRef.current) {
            restoreMicAfterLocalOutput();
          }
          return;
        }

        if (route.kind === "conversational") {
          commitTranscript("assistant", route.answer);
          setSpeechTransport(speechRouteLabel(route));
          enqueueLocalSpeech(route.answer, callRunId, localRunId, { forceLive: true });
          await localAudioQueueRef.current;
          if (!isLocalSpeechActive(callRunId, localRunId) || playbackGen !== playbackGenerationRef.current) return;
          if (mountedRef.current && callRunId === runIdRef.current && localRunId === localAssistRunRef.current) {
            restoreMicAfterLocalOutput();
          }
          return;
        }

        if (useSpeculative) {
          speculativeAbortRef.current?.abort();
          speculativeAbortRef.current = null;
          if (playbackGen !== playbackGenerationRef.current) return;
          commitTranscript("assistant", specAnswer);
          setSpeechTransport("gemini-live (brain)");
          enqueueLocalSpeech(specAnswer, callRunId, localRunId, { forceLive: true });
        } else {
          await streamLocalAnswer(userText, "", callRunId, localRunId);
        }
        await localAudioQueueRef.current;
        if (!isLocalSpeechActive(callRunId, localRunId) || playbackGen !== playbackGenerationRef.current) return;
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
    agentId,
    captureFirstAudioLatency,
    commitTranscript,
    enqueueLocalSpeech,
    getOrFetchLocalMugaClip,
    isLocalSpeechActive,
    muteMicForLocalOutput,
    playLocalPcm,
    releaseAssistantAudio,
    restoreMicAfterLocalOutput,
    streamLocalAnswer,
    suppressAssistantAudio,
    voiceMode,
  ]);
  playLocalAssistFnRef.current = playLocalAssistForUserText;

  const cleanupCall = useCallback(async () => {
    stopTimer();
    stopLocalAssist();
    stopMicSilenceGate();
    pendingUserUtteranceRef.current = null;
    userSpeechStoppedRef.current = false;
    respondAttemptRef.current += 1;
    await destroyVapi();
    mutedRef.current = false;
    setMuted(false);
  }, [destroyVapi, stopLocalAssist, stopMicSilenceGate, stopTimer]);

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

  }, [agentId, speechLanguage, voiceMode]);

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
      transcriptRef.current = [];
      setTranscript([]);
      setInterim(null);
      setTension(0);
      setDuration(0);
      setLatencyMs(null);
      lastUserSpeechEndAtRef.current = null;
      lastUserFinalAtRef.current = null;
      latencyCapturedRef.current = false;
      pendingUserUtteranceRef.current = null;
      userSpeechStoppedRef.current = false;
      respondAttemptRef.current += 1;

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
      assistantFirstMessageRef.current =
        typeof (assistant as { firstMessage?: unknown }).firstMessage === "string"
          ? (assistant as { firstMessage: string }).firstMessage
          : "";

      const vapi = new Vapi(
        token.apiKey,
        undefined,
        { alwaysIncludeMicInPermissionPrompt: true },
        { startAudioOff: false }
      );
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        startMicSilenceGate();
        if (usesBrowserSilkPlayback(voiceMode)) {
          prefetchVoiceFaqClips();
          suppressAssistantAudio();
          const greeting = assistantFirstMessageRef.current.trim();
          if (greeting) {
            const localRunId = localAssistRunRef.current + 1;
            localAssistRunRef.current = localRunId;
            localSpeechKeysRef.current.clear();
            commitTranscript("assistant", cleanTranscriptText(greeting));
            enqueueLocalSpeech(greeting, runId, localRunId, { forceLive: true });
          }
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
        setState("active");
        startTimer();
      });

      vapi.on("message", message => {
        if (!mountedRef.current || runId !== runIdRef.current || !message) return;

        const msg = message as Record<string, unknown>;

        if (msg.type === "speech-update") {
          const role = normalizeTranscriptRole(msg.role);
          const status = typeof msg.status === "string" ? msg.status.toLowerCase() : "";
          if (role === "user" && status === "started") {
            const gate = micSilenceGateRef.current;
            if (
              gate &&
              !gate.isConfirmedSpeech() &&
              !gate.hasConfirmedSpeechWithin(280) &&
              gate.rms <= SILK_MIC_SILENCE.speechRmsThreshold
            ) {
              return;
            }
            lastUserSpeechEndAtRef.current = null;
            latencyCapturedRef.current = false;
            userSpeechStoppedRef.current = false;
            pendingUserUtteranceRef.current = null;
            respondAttemptRef.current += 1;
            if (usesBrowserSilkPlayback(voiceMode)) interruptPlayback();
          }
          if (role === "user" && status === "stopped") {
            if (!micConfirmsUserSpeech(micSilenceGateRef.current)) return;
            lastUserSpeechEndAtRef.current = Date.now();
            latencyCapturedRef.current = false;
            userSpeechStoppedRef.current = true;
            void tryPlayAfterSilence();
          }
        }

        if (msg.type === "transcript") {
          const text = getTranscriptText(msg);
          if (!text) return;

          const role = normalizeTranscriptRole(msg.role);
          if (role === "assistant" && voiceMode !== "vapi" && isVapiPlaceholderTranscript(text)) return;

          // Partials stream in as the speaker talks — show them live, don't commit.
          if (msg.transcriptType !== "final") {
          if (role === "user") {
            if (!shouldAcceptUserUtterance(text, micSilenceGateRef.current)) return;
            prefetchLocalAssistForText(text);
            scheduleSpeculativeLlm(text);
          }
            if (role === "assistant" && Date.now() < assistantTranscriptSuppressUntilRef.current) return;
            setInterim({ role, text });
            return;
          }

          if (role === "assistant" && Date.now() < assistantTranscriptSuppressUntilRef.current) return;
          if (role === "assistant" && usesTalkWidgetLocalAssist(voiceMode)) return;

          const ts = Date.now();
          setInterim(null);
          commitTranscript(role, text, ts);
          if (role === "user") {
            if (!shouldAcceptUserUtterance(text, micSilenceGateRef.current, { isFinal: true })) return;
            if (usesBrowserSilkPlayback(voiceMode)) {
              interruptPlayback();
              suppressAssistantAudio();
            }
            speculativePrefetchRef.current = "";
            lastUserFinalAtRef.current = ts;
            latencyCapturedRef.current = false;
            setLatencyMs(null);
            setSpeechTransport("listening…");
            setTension(value => Math.min(10, value + 0.4));
            prefetchLocalAssistForText(text);
            dispatchUserUtterance(text, runId);
            speculativeChunksReadyRef.current = 0;
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
    commitTranscript,
    dispatchUserUtterance,
    enqueueLocalSpeech,
    finishCall,
    playLocalAssistForUserText,
    prefetchLocalAssistForText,
    startMicSilenceGate,
    interruptPlayback,
    stopLocalAssist,
    tryPlayAfterSilence,
    prefetchVoiceFaqClips,
    scheduleSpeculativeLlm,
    registerCall,
    speechLanguage,
    startTimer,
    stopTimer,
    suppressAssistantAudio,
    voiceMode,
  ]);

  const endCall = useCallback(async () => {
    runIdRef.current += 1;
    await finishCall("ended");
  }, [finishCall]);

  const reset = useCallback(async () => {
    runIdRef.current += 1;
    await cleanupCall();
    if (!mountedRef.current) return;
    setState("idle");
    setError("");
    transcriptRef.current = [];
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
      fireSilkWarmPaths(silkCriticalWarmPaths(window.location.origin, voiceMode));
    };
    return startSilkWarmKeepalive(ping);
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
    speechTransport,
    transcript,
    interim,
    startCall,
    endCall,
    reset,
    toggleMute,
  };
}
