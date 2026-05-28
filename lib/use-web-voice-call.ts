"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { stripVoiceMarkers } from "@/lib/voice-emotion";

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

export type WebVoiceMode = "silk" | "silk-stream" | "vapi";

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
  const message =
    typeof record?.message === "string" ? record.message :
    typeof record?.error === "string" ? record.error :
    typeof record?.errorMsg === "string" ? record.errorMsg :
    typeof err === "string" ? err :
    "Failed to start call";

  return { name, message };
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
  return stripVoiceMarkers(text)
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
  const [transcript, setTranscript] = useState<WebVoiceTranscript[]>([]);
  // Live caption for the turn currently being spoken — updated on every partial
  // transcript and cleared the moment the final arrives. This is what makes text
  // appear in front of the user in realtime instead of only after each turn.
  const [interim, setInterim] = useState<{ role: "user" | "assistant"; text: string } | null>(null);

  const mountedRef = useRef(true);
  const vapiRef = useRef<VapiInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runIdRef = useRef(0);
  const registeredCallIdsRef = useRef(new Set<string>());
  // Promises kicked off on mount so the heavy work (SDK import, token + assistant
  // config fetches) is already done by the time the user taps Start call. The
  // click then only needs the mic prompt + vapi.start() — that's the instant join.
  const prewarmRef = useRef<PrewarmCache | null>(null);

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

  const cleanupCall = useCallback(async () => {
    stopTimer();
    await destroyVapi();
    setMuted(false);
  }, [destroyVapi, stopTimer]);

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
    const key = `${agentId}::${voiceMode}`;
    if (prewarmRef.current?.key === key) return; // already warming/warm for this combo

    prewarmRef.current = {
      key,
      vapi: loadVapiCtor(),
      token: fetchJson<TokenResponse>("/api/voice/vapi-token"),
      assistant: fetchJson<AssistantConfig>(
        `/api/agents/${agentId}/vapi-config?voice=${encodeURIComponent(voiceMode)}`
      ),
    };
    // Swallow rejections now so React/browser don't flag unhandled rejections;
    // startCall still awaits these and falls back to a fresh fetch on failure.
    prewarmRef.current.vapi.catch(() => {});
    prewarmRef.current.token.catch(() => {});
    prewarmRef.current.assistant.catch(() => {});
  }, [agentId, voiceMode]);

  const startCall = useCallback(async () => {
    if (!agentId) {
      setError("Select an agent first.");
      setState("error");
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    await cleanupCall();
    if (!mountedRef.current || runId !== runIdRef.current) return;

    setState("connecting");
    setError("");
    setTranscript([]);
    setInterim(null);
    setTension(0);
    setDuration(0);

    const key = `${agentId}::${voiceMode}`;
    const warm = prewarmRef.current?.key === key ? prewarmRef.current : null;

    try {
      const [Vapi, token, assistant] = await withTimeout(
        Promise.all([
          cachedOrFetch(warm?.vapi, loadVapiCtor),
          cachedOrFetch(warm?.token, () => fetchJson<TokenResponse>("/api/voice/vapi-token")),
          cachedOrFetch(warm?.assistant, () =>
            fetchJson<AssistantConfig>(`/api/agents/${agentId}/vapi-config?voice=${encodeURIComponent(voiceMode)}`)
          ),
          preflightMicrophone(),
        ]),
        CONFIG_TIMEOUT_MS,
        "Voice configuration took too long to load. Retry in a moment."
      ).then(([Ctor, tokenResponse, assistantConfig]) => [Ctor, tokenResponse, assistantConfig] as const);

      if (!mountedRef.current || runId !== runIdRef.current) return;

      const vapi = new Vapi(
        token.apiKey,
        undefined,
        { alwaysIncludeMicInPermissionPrompt: true },
        { startAudioOff: false }
      );
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setState("active");
        startTimer();
      });

      vapi.on("call-start-success", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        if (event.callId) void registerCall(event.callId);
      });

      vapi.on("call-start-failed", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setError(normalizeVoiceCallError(event.error));
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
        if (msg.type === "transcript") {
          const text = getTranscriptText(msg);
          if (!text) return;

          const role = normalizeTranscriptRole(msg.role);

          // Partials stream in as the speaker talks — show them live, don't commit.
          if (msg.transcriptType !== "final") {
            setInterim({ role, text });
            return;
          }

          const ts = Date.now();
          setInterim(null);
          setTranscript(lines => appendTranscriptLine(lines, role, text, ts));
          if (role === "user") setTension(value => Math.min(10, value + 0.4));
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

      if (call?.id) void registerCall(call.id);
    } catch (err) {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      await cleanupCall();
      setError(normalizeVoiceCallError(err));
      setState("error");
    }
  }, [
    agentId,
    cleanupCall,
    finishCall,
    registerCall,
    startTimer,
    stopTimer,
    voiceMode,
  ]);

  const endCall = useCallback(async () => {
    runIdRef.current += 1;
    const vapi = vapiRef.current;
    setState("ending");
    stopTimer();
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
  }, [stopTimer]);

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
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    const vapi = vapiRef.current;
    if (!vapi) return;

    const nextMuted = !muted;
    vapi.setMuted(nextMuted);
    setMuted(nextMuted);
  }, [muted]);

  // Kick off the heavy startup work as soon as the talk screen mounts (and again
  // if the agent/voice changes) so Start call is an instant join, not a 1–2s wait.
  useEffect(() => {
    prewarm();
  }, [prewarm]);

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
    transcript,
    interim,
    startCall,
    endCall,
    reset,
    toggleMute,
  };
}
