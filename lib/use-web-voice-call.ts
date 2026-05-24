"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";

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

interface WebCallResponse {
  callId: string;
  roomUrl: string;
}

type DailyFactory = typeof import("@daily-co/daily-js").default;

const DAILY_LOAD_TIMEOUT_MS = 15_000;
const CALL_CREATE_TIMEOUT_MS = 20_000;
const ROOM_JOIN_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function loadDailyFactory(): Promise<DailyFactory> {
  const daily = await withTimeout(
    import("@daily-co/daily-js"),
    DAILY_LOAD_TIMEOUT_MS,
    "The voice room library did not load. Check your connection and retry."
  );
  return daily.default;
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

async function getMicrophoneStream(): Promise<MediaStream> {
  ensureBrowserCanUseMic();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  });

  if (stream.getAudioTracks().length === 0) {
    stream.getTracks().forEach(track => track.stop());
    throw new Error("No microphone audio track was provided by the browser.");
  }

  return stream;
}

function parseErrorText(err: unknown): { name: string; message: string } {
  if (err instanceof Error) return { name: err.name, message: err.message };

  const record = err as { name?: unknown; message?: unknown; errorMsg?: unknown };
  const name = typeof record?.name === "string" ? record.name : "";
  const message =
    typeof record?.message === "string" ? record.message :
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
  if (lower.includes("meeting has ended") || lower.includes("room has ended")) {
    return "The Vapi room ended before the browser joined. Retry after allowing mic access; if it repeats, check the call diagnostics.";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "Network error while starting the voice call. Check connection and retry.";
  }

  return message;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach(track => track.stop());
}

function normalizeTranscriptRole(role: unknown): "user" | "assistant" {
  if (role === "assistant" || role === "bot" || role === "agent") return "assistant";
  return "user";
}

function parseAppMessage(data: unknown): Record<string, unknown> | "listening" | null {
  if (data === "listening") return "listening";
  if (typeof data === "object" && data !== null) return data as Record<string, unknown>;
  if (typeof data !== "string") return null;

  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function useWebVoiceCall(agentId: string) {
  const [state, setState] = useState<WebVoiceCallState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [tension, setTension] = useState(0);
  const [transcript, setTranscript] = useState<WebVoiceTranscript[]>([]);

  const mountedRef = useRef(true);
  const callRef = useRef<DailyCall | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runIdRef = useRef(0);
  const suppressLeftEventRef = useRef(false);

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

  const releaseMicrophone = useCallback(() => {
    stopStream(micStreamRef.current);
    micStreamRef.current = null;
  }, []);

  const cleanupCall = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();

    const call = callRef.current;
    callRef.current = null;

    if (call) {
      suppressLeftEventRef.current = true;
      try {
        await call.leave();
      } catch {}
      try {
        await call.destroy();
      } catch {}
      suppressLeftEventRef.current = false;
    }

    releaseMicrophone();
    setMuted(false);
  }, [releaseMicrophone, stopTimer]);

  const createWebCall = useCallback(async (): Promise<WebCallResponse> => {
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CALL_CREATE_TIMEOUT_MS);

    try {
      const response = await fetch("/api/voice/web-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => ({})) as Partial<WebCallResponse> & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? `Failed to create call (${response.status})`);
      if (!payload.callId || !payload.roomUrl) throw new Error("The voice provider did not return a usable room.");

      return { callId: payload.callId, roomUrl: payload.roomUrl };
    } catch (err) {
      if (timedOut) throw new Error("Creating the Vapi call timed out. Retry in a moment.");
      throw err;
    } finally {
      clearTimeout(timeoutId);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [agentId]);

  const finishCall = useCallback(async (nextState: WebVoiceCallState = "ended") => {
    if (nextState === "ended") setState("ending");
    await cleanupCall();
    if (mountedRef.current) setState(nextState);
  }, [cleanupCall]);

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
    setTension(0);
    setDuration(0);

    try {
      const [Daily, micStream] = await Promise.all([
        loadDailyFactory(),
        getMicrophoneStream(),
      ]);

      if (!mountedRef.current || runId !== runIdRef.current) {
        stopStream(micStream);
        return;
      }

      micStreamRef.current = micStream;
      const audioTrack = micStream.getAudioTracks()[0];
      const { roomUrl } = await createWebCall();

      if (!mountedRef.current || runId !== runIdRef.current) return;

      const call = Daily.createCallObject({
        audioSource: audioTrack,
        videoSource: false,
      });
      callRef.current = call;

      call.on("joined-meeting", () => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setState("active");
        startTimer();
      });

      call.on("left-meeting", () => {
        if (!mountedRef.current || runId !== runIdRef.current || suppressLeftEventRef.current) return;
        stopTimer();
        releaseMicrophone();
        callRef.current = null;
        setState(prev => prev === "ending" ? "ended" : prev === "active" ? "ended" : "error");
        setError(prev => prev || "The call room closed before it fully connected.");
      });

      call.on("error", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;
        setError(normalizeVoiceCallError(event));
        void finishCall("error");
      });

      call.on("app-message", event => {
        if (!mountedRef.current || runId !== runIdRef.current) return;

        const msg = parseAppMessage((event as { data?: unknown }).data);
        if (msg === "listening") {
          setState("active");
          startTimer();
          return;
        }
        if (!msg) return;

        if (msg.type === "transcript" && msg.transcriptType === "final") {
          const text = typeof msg.transcript === "string" ? msg.transcript.trim() : "";
          if (!text) return;

          const role = normalizeTranscriptRole(msg.role);
          setTranscript(lines => [...lines, { role, text, ts: Date.now() }]);
          if (role === "user") setTension(value => Math.min(10, value + 0.4));
        }

        if ((msg.type === "status-update" && msg.status === "ended") || msg.type === "hang") {
          void finishCall("ended");
        }
      });

      setState("joining");
      await withTimeout(
        call.join({ url: roomUrl }),
        ROOM_JOIN_TIMEOUT_MS,
        "Joining the voice room timed out. Check microphone permission and retry."
      );
    } catch (err) {
      if (!mountedRef.current || runId !== runIdRef.current) return;
      await cleanupCall();
      setError(normalizeVoiceCallError(err));
      setState("error");
    }
  }, [
    agentId,
    cleanupCall,
    createWebCall,
    finishCall,
    releaseMicrophone,
    startTimer,
    stopTimer,
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
    setTranscript([]);
    setTension(0);
    setDuration(0);
  }, [cleanupCall]);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;

    const nextMuted = !muted;
    call.setLocalAudio(!nextMuted);
    setMuted(nextMuted);
  }, [muted]);

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
    startCall,
    endCall,
    reset,
    toggleMute,
  };
}
