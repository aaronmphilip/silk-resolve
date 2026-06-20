"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  answerNovaCareQuestion,
  NOVACARE_FIRST_MESSAGE,
  NOVACARE_PROMPT,
} from "@/lib/novacare-knowledge";
import {
  prefetchSilkTts,
  shouldStartSpeculativeLlm,
  speculativeNovaCareAnswer,
  transcriptsAlign,
} from "@/lib/realtime-voice";
import { playBufferedPcm, playStreamingPcmResponse } from "@/lib/silk-stream-player";
import { StreamSpeechChunker } from "@/lib/stream-speech-chunker";
import {
  ensureMicrophoneAccess,
  loadSpeechLanguage,
  saveSpeechLanguage,
  speechRecognitionErrorMessage,
} from "@/lib/speech-languages";
import {
  buildSilkTtsBody,
  isSilkVoiceMode,
  SILK_WARM_INTERVAL_MS,
  silkCriticalWarmPaths,
  silkWarmPaths,
  silkTtsQueryForMode,
  vapiLlmVoiceQuery,
  type WebVoiceMode,
} from "@/lib/silk-voice";

export type DirectVoiceCallState = "idle" | "listening" | "thinking" | "speaking" | "error";

export interface DirectVoiceTranscript {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResultListItem = { isFinal: boolean; length: number; [index: number]: SpeechRecognitionResultItem };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultListItem };
};
type SpeechRecognitionErrorLike = { error?: string; message?: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const FAST_CHUNKER = { minChars: 12, maxChars: 72 } as const;
const SPECULATIVE_DEBOUNCE_MS = 90;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function readSsePayloads(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  return { events: parts.slice(0, -1), rest: parts[parts.length - 1] ?? "" };
}

function appendText(current: string, delta: string): string {
  const next = `${current}${delta}`;
  return next.replace(/\s+/g, " ").trimStart();
}

interface UseDirectVoiceCallOptions {
  autostart?: boolean;
  playGreeting?: boolean;
  speechLanguage?: string;
}

const LISTEN_RETRY_LIMIT = 3;
const LISTEN_RETRY_DELAY_MS = 600;

export function useDirectVoiceCall(
  _agentId: string,
  voiceMode: WebVoiceMode = "silk-mulberry",
  options: UseDirectVoiceCallOptions = {}
) {
  const [state, setState] = useState<DirectVoiceCallState>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState<DirectVoiceTranscript[]>([]);
  const [interim, setInterim] = useState<{ role: "user" | "assistant"; text: string } | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const [tension, setTension] = useState(0);
  const [speechLanguage, setSpeechLanguage] = useState(
    () => options.speechLanguage ?? loadSpeechLanguage()
  );

  const sessionActiveRef = useRef(false);
  const runIdRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const speculativeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speculativeAbortRef = useRef<AbortController | null>(null);
  const speculativePartialRef = useRef("");
  const speculativeRunIdRef = useRef(0);
  const speculativeChunksSpokenRef = useRef(0);
  const speculativeAnswerTextRef = useRef("");
  const speculativePromiseRef = useRef<Promise<void> | null>(null);
  const firstAudioLatencyRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const autostartedRef = useRef(false);
  const listenRetryRef = useRef(0);
  const pauseListeningRef = useRef(false);
  const listenRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startListeningRef = useRef<() => Promise<void>>(async () => {});

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

  const bumpRun = useCallback(() => {
    runIdRef.current += 1;
    speculativeAbortRef.current?.abort();
    speculativeAbortRef.current = null;
    speculativeChunksSpokenRef.current = 0;
    return runIdRef.current;
  }, []);

  const enqueueSpeech = useCallback((text: string, runId: number) => {
    const speakable = text.trim();
    if (!speakable || runId !== runIdRef.current) return;

    const query = silkTtsQueryForMode(voiceMode);
    const job = fetch(`/api/voice/silk-tts${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSilkTtsBody(voiceMode, speakable)),
    })
      .then(async (res) => {
        const transport = res.headers.get("x-silk-transport") ?? "";
        if (transport.includes("cached")) {
          const buf = await res.arrayBuffer();
          await playBufferedPcm(
            buf,
            Number(res.headers.get("x-audio-sample-rate") ?? 24_000),
            runId,
            () => runId === runIdRef.current && sessionActiveRef.current,
            audioContextRef.current
          );
          if (firstAudioLatencyRef.current === null) {
            firstAudioLatencyRef.current = 0;
            setLatencyMs(0);
          }
          return;
        }

        const playback = await playStreamingPcmResponse(
          res,
          runId,
          () => runId === runIdRef.current && sessionActiveRef.current,
          audioContextRef.current
        );
        if (firstAudioLatencyRef.current === null) {
          firstAudioLatencyRef.current = Math.round(playback.firstFrameMs);
          setLatencyMs(firstAudioLatencyRef.current);
        }
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err.message : "Speech playback failed.");
        setState("error");
      });

    audioQueueRef.current = audioQueueRef.current.then(() => job);
    setState("speaking");
  }, [voiceMode]);

  const parseSseStream = useCallback(async (
    res: Response,
    runId: number,
    onDelta: (text: string) => void,
    signal?: AbortSignal
  ) => {
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || "AI response failed.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      if (signal?.aborted || runId !== runIdRef.current) return;
      const { done, value } = await reader.read();
      if (done) break;

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
            if (content) onDelta(content);
          } catch {}
        }
      }
    }
  }, []);

  const streamLlmAnswer = useCallback(async (
    prompt: string,
    runId: number,
    onAnswerText: (text: string) => void,
    signal?: AbortSignal
  ) => {
    const chunker = new StreamSpeechChunker((chunk) => {
      onAnswerText(chunk);
      enqueueSpeech(chunk, runId);
      speculativeChunksSpokenRef.current += 1;
    }, FAST_CHUNKER);

    const res = await fetch(`/api/voice/vapi-llm?${vapiLlmVoiceQuery(voiceMode)}&fast=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        stream: true,
        messages: [
          { role: "system", content: NOVACARE_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    let answerText = "";
    await parseSseStream(res, runId, (delta) => {
      answerText = appendText(answerText, delta);
      setInterim({ role: "assistant", text: answerText });
      chunker.push(delta);
    }, signal);

    chunker.finish();
    return answerText.trim();
  }, [enqueueSpeech, parseSseStream, voiceMode]);

  const runSpeculativeLlm = useCallback((partial: string) => {
    const cached = speculativeNovaCareAnswer(partial) || answerNovaCareQuestion(partial);
    if (cached) {
      const query = silkTtsQueryForMode(voiceMode).slice(1);
      prefetchSilkTts(window.location.origin, query, buildSilkTtsBody(voiceMode, cached));
      return;
    }

    speculativeAbortRef.current?.abort();
    const abort = new AbortController();
    speculativeAbortRef.current = abort;
    speculativePartialRef.current = partial;
    speculativeAnswerTextRef.current = "";
    const specRunId = ++speculativeRunIdRef.current;

    const job = (async () => {
      try {
        const res = await fetch(`/api/voice/vapi-llm?${vapiLlmVoiceQuery(voiceMode)}&fast=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abort.signal,
          body: JSON.stringify({
            stream: true,
            messages: [
              { role: "system", content: NOVACARE_PROMPT },
              { role: "user", content: partial },
            ],
          }),
        });

        if (specRunId !== speculativeRunIdRef.current) return;

        const chunker = new StreamSpeechChunker((chunk) => {
          if (specRunId !== speculativeRunIdRef.current) return;
          if (speculativeChunksSpokenRef.current === 0) speculativeChunksSpokenRef.current += 1;
          const playRun = runIdRef.current;
          enqueueSpeech(chunk, playRun);
          setState("speaking");
        }, FAST_CHUNKER);

        await parseSseStream(res, runIdRef.current, (delta) => {
          speculativeAnswerTextRef.current = appendText(speculativeAnswerTextRef.current, delta);
          chunker.push(delta);
        }, abort.signal);
        chunker.finish();
      } catch {
        /* speculative cancelled or failed — final path will handle */
      }
    })();
    speculativePromiseRef.current = job;
    void job.finally(() => {
      if (speculativePromiseRef.current === job) speculativePromiseRef.current = null;
    });
  }, [enqueueSpeech, parseSseStream, voiceMode]);

  const scheduleSpeculative = useCallback((partial: string) => {
    if (!sessionActiveRef.current || !shouldStartSpeculativeLlm(partial)) return;
    if (speculativeDebounceRef.current) clearTimeout(speculativeDebounceRef.current);
    speculativeDebounceRef.current = setTimeout(() => {
      runSpeculativeLlm(partial);
    }, SPECULATIVE_DEBOUNCE_MS);
  }, [runSpeculativeLlm]);

  const answerPrompt = useCallback(async (prompt: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !sessionActiveRef.current) return;

    const answerStartedAt = performance.now();
    firstAudioLatencyRef.current = null;
    setLatencyMs(null);
    setInterim(null);
    setTension((value) => Math.min(10, value + 0.35));

    const ts = Date.now();
    setTranscript((lines) => [...lines, { role: "user", text: cleanPrompt, ts }]);

    const instant = answerNovaCareQuestion(cleanPrompt);
    if (instant) {
      const runId = bumpRun();
      audioQueueRef.current = Promise.resolve();
      setState("speaking");
      setTranscript((lines) => [...lines, { role: "assistant", text: instant, ts: Date.now() }]);
      enqueueSpeech(instant, runId);
      await audioQueueRef.current;
      if (runId === runIdRef.current && sessionActiveRef.current) {
        setState("listening");
        startListeningRef.current();
      }
      setLatencyMs(Math.round(performance.now() - answerStartedAt));
      return;
    }

    const specPartial = speculativePartialRef.current;
    const specAligned = specPartial && transcriptsAlign(specPartial, cleanPrompt);
    const specAlreadyPlaying = speculativeChunksSpokenRef.current > 0;

    if (specAligned && specAlreadyPlaying) {
      setState("speaking");
      await speculativePromiseRef.current?.catch(() => {});
      const answerText = speculativeAnswerTextRef.current.trim();
      if (answerText) {
        setInterim(null);
        setTranscript((lines) => [...lines, { role: "assistant", text: answerText, ts: Date.now() }]);
      }
      await audioQueueRef.current;
      speculativeAbortRef.current = null;
      if (sessionActiveRef.current) {
        setState("listening");
        startListeningRef.current();
      }
      setLatencyMs(firstAudioLatencyRef.current ?? Math.round(performance.now() - answerStartedAt));
      return;
    }

    const runId = bumpRun();
    audioQueueRef.current = Promise.resolve();
    setState("thinking");

    try {
      const answerText = await streamLlmAnswer(cleanPrompt, runId, () => {}, undefined);
      if (answerText) {
        setInterim(null);
        setTranscript((lines) => [...lines, { role: "assistant", text: answerText, ts: Date.now() }]);
      }
      await audioQueueRef.current;
      if (runId === runIdRef.current && sessionActiveRef.current) {
        setState("listening");
        startListeningRef.current();
      }
      if (firstAudioLatencyRef.current !== null) {
        setLatencyMs(firstAudioLatencyRef.current);
      } else {
        setLatencyMs(Math.round(performance.now() - answerStartedAt));
      }
    } catch (err) {
      if (!sessionActiveRef.current) return;
      setError(err instanceof Error ? err.message : "AI response failed.");
      setState("error");
    }
  }, [bumpRun, enqueueSpeech, streamLlmAnswer]);

  const playGreeting = useCallback(async () => {
    const runId = bumpRun();
    audioQueueRef.current = Promise.resolve();
    setState("speaking");
    setTranscript((lines) => [
      ...lines,
      { role: "assistant", text: NOVACARE_FIRST_MESSAGE, ts: Date.now() },
    ]);
    enqueueSpeech(NOVACARE_FIRST_MESSAGE, runId);
    await audioQueueRef.current;
  }, [bumpRun, enqueueSpeech]);

  const clearListenRestart = useCallback(() => {
    if (listenRestartTimerRef.current) clearTimeout(listenRestartTimerRef.current);
    listenRestartTimerRef.current = null;
  }, []);

  const scheduleListenRestart = useCallback((delayMs = 250) => {
    if (!sessionActiveRef.current || pauseListeningRef.current) return;
    clearListenRestart();
    listenRestartTimerRef.current = setTimeout(() => {
      listenRestartTimerRef.current = null;
      void startListeningRef.current();
    }, delayMs);
  }, [clearListenRestart]);

  const startListening = useCallback(async () => {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      setError("Speech recognition is not supported in this browser. Use Chrome or Edge on desktop.");
      setState("error");
      sessionActiveRef.current = false;
      return;
    }

    try {
      await ensureMicrophoneAccess();
      listenRetryRef.current = 0;
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission was denied.");
      setState("error");
      sessionActiveRef.current = false;
      return;
    }

    pauseListeningRef.current = false;
    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.lang = speechLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setState("listening");
    setInterim(null);

    recognition.onresult = (event) => {
      if (!sessionActiveRef.current) return;

      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const part = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += part;
        else interimText += part;
      }

      if (interimText.trim()) {
        setInterim({ role: "user", text: interimText.trim() });
        scheduleSpeculative(interimText.trim());
      }

      if (finalText.trim()) {
        setInterim(null);
        pauseListeningRef.current = true;
        recognition.stop();
        void answerPrompt(finalText.trim());
      }
    };

    recognition.onerror = (event) => {
      if (!sessionActiveRef.current) return;
      const code = event.error ?? "";
      if (code === "aborted") return;

      if (code === "no-speech") {
        scheduleListenRestart(300);
        return;
      }

      if (code === "network" && listenRetryRef.current < LISTEN_RETRY_LIMIT) {
        listenRetryRef.current += 1;
        scheduleListenRestart(LISTEN_RETRY_DELAY_MS * listenRetryRef.current);
        return;
      }

      const message = speechRecognitionErrorMessage(code);
      if (message) {
        setError(message);
        setState("error");
        sessionActiveRef.current = false;
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (!pauseListeningRef.current) scheduleListenRestart(200);
    };

    try {
      recognition.start();
    } catch (err) {
      if (listenRetryRef.current < LISTEN_RETRY_LIMIT) {
        listenRetryRef.current += 1;
        scheduleListenRestart(LISTEN_RETRY_DELAY_MS * listenRetryRef.current);
        return;
      }
      setError(err instanceof Error ? err.message : "Speech recognition failed.");
      setState("error");
      sessionActiveRef.current = false;
    }
  }, [answerPrompt, clearListenRestart, scheduleListenRestart, scheduleSpeculative, speechLanguage]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const startSession = useCallback(async () => {
    if (sessionActiveRef.current) return;

    setError("");
    try {
      await ensureMicrophoneAccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission was denied.");
      setState("error");
      return;
    }

    sessionActiveRef.current = true;
    listenRetryRef.current = 0;
    setTranscript([]);
    setInterim(null);
    setTension(0);
    startTimer();

    if (options.playGreeting !== false) {
      await playGreeting();
    }
    if (!sessionActiveRef.current) return;
    await startListening();
  }, [options.playGreeting, playGreeting, startListening, startTimer]);

  const endSession = useCallback(() => {
    sessionActiveRef.current = false;
    pauseListeningRef.current = true;
    bumpRun();
    clearListenRestart();
    if (speculativeDebounceRef.current) clearTimeout(speculativeDebounceRef.current);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    audioQueueRef.current = Promise.resolve();
    stopTimer();
    setState("idle");
    setInterim(null);
  }, [bumpRun, clearListenRestart, stopTimer]);

  const changeSpeechLanguage = useCallback((code: string) => {
    setSpeechLanguage(code);
    saveSpeechLanguage(code);
  }, []);

  const reset = useCallback(async () => {
    endSession();
    setError("");
    setTranscript([]);
    setLatencyMs(null);
  }, [endSession]);

  useEffect(() => {
    if (!isSilkVoiceMode(voiceMode)) return;

    const warm = () => {
      for (const path of silkCriticalWarmPaths(window.location.origin, voiceMode)) {
        fetch(path, { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
      }
      void Promise.allSettled(
        silkWarmPaths(window.location.origin).map((path) =>
          fetch(path, { method: "GET", cache: "no-store", keepalive: true })
        )
      );
    };

    warm();
    const timer = window.setInterval(() => {
      if (!document.hidden) warm();
    }, SILK_WARM_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [voiceMode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      endSession();
    };
  }, [endSession]);

  useEffect(() => {
    if (!options.autostart || autostartedRef.current) return;
    autostartedRef.current = true;
    const timer = window.setTimeout(() => void startSession(), 0);
    return () => window.clearTimeout(timer);
  }, [options.autostart, startSession]);

  return {
    state,
    error,
    muted: false,
    duration,
    tension,
    transcript,
    interim,
    latencyMs,
    startCall: startSession,
    endCall: endSession,
    reset,
    toggleMute: () => {},
    startListening,
    speechLanguage,
    changeSpeechLanguage,
  };
}