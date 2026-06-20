"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  answerNovaCareQuestion,
  NOVACARE_FIRST_MESSAGE,
  NOVACARE_PROMPT,
} from "@/lib/novacare-knowledge";
import { releaseMicrophoneStream } from "@/lib/mic-session";
import {
  loadSpeechLanguage,
  saveSpeechLanguage,
} from "@/lib/speech-languages";
import {
  prefetchSilkTts,
  shouldStartSpeculativeLlm,
  speculativeNovaCareAnswer,
  transcriptsAlign,
} from "@/lib/realtime-voice";
import { playBufferedPcm, playStreamingPcmResponse } from "@/lib/silk-stream-player";
import { StreamSpeechChunker } from "@/lib/stream-speech-chunker";
import { VoiceListener } from "@/lib/voice-listener";
import {
  buildSilkTtsBody,
  isSilkVoiceMode,
  fireSilkWarmPaths,
  startSilkWarmKeepalive,
  silkCriticalWarmPaths,

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

interface UseDirectVoiceCallOptions {
  autostart?: boolean;
  playGreeting?: boolean;
  speechLanguage?: string;
}

const FAST_CHUNKER = { minChars: 8, maxChars: 64 } as const;
const SPECULATIVE_DEBOUNCE_MS = 60;
const RESUME_LISTEN_DELAY_MS = 280;

function readSsePayloads(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  return { events: parts.slice(0, -1), rest: parts[parts.length - 1] ?? "" };
}

function appendText(current: string, delta: string): string {
  const next = `${current}${delta}`;
  return next.replace(/\s+/g, " ").trimStart();
}

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
  const answeringRef = useRef(false);
  const runIdRef = useRef(0);
  const listenerRef = useRef<VoiceListener | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const speculativeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speculativeAbortRef = useRef<AbortController | null>(null);
  const speculativePartialRef = useRef("");
  const speculativeRunIdRef = useRef(0);
  const speculativeChunksReadyRef = useRef(0);
  const speculativeAnswerTextRef = useRef("");
  const speculativePromiseRef = useRef<Promise<void> | null>(null);
  const firstAudioLatencyRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autostartedRef = useRef(false);
  const resumeListenRef = useRef<() => Promise<void>>(async () => {});

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
    speculativeChunksReadyRef.current = 0;
    return runIdRef.current;
  }, []);

  const pauseListening = useCallback(() => {
    listenerRef.current?.pause();
  }, []);

  const enqueueSpeech = useCallback((text: string, runId: number) => {
    const speakable = text.trim();
    if (!speakable || runId !== runIdRef.current) return;

    pauseListening();

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
        sessionActiveRef.current = false;
      });

    audioQueueRef.current = audioQueueRef.current.then(() => job);
    setState("speaking");
  }, [pauseListening, voiceMode]);

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

  const prefetchAnswerAudio = useCallback((text: string) => {
    const speakable = text.trim();
    if (!speakable) return;
    const query = silkTtsQueryForMode(voiceMode).slice(1);
    prefetchSilkTts(window.location.origin, query, buildSilkTtsBody(voiceMode, speakable));
  }, [voiceMode]);

  const streamLlmAnswer = useCallback(async (
    prompt: string,
    runId: number,
    signal?: AbortSignal
  ) => {
    const chunker = new StreamSpeechChunker((chunk) => {
      enqueueSpeech(chunk, runId);
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
      prefetchAnswerAudio(cached);
      speculativeAnswerTextRef.current = cached;
      speculativePartialRef.current = partial;
      return;
    }

    speculativeAbortRef.current?.abort();
    const abort = new AbortController();
    speculativeAbortRef.current = abort;
    speculativePartialRef.current = partial;
    speculativeAnswerTextRef.current = "";
    speculativeChunksReadyRef.current = 0;
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
          speculativeChunksReadyRef.current += 1;
          if (speculativeChunksReadyRef.current === 1) prefetchAnswerAudio(chunk);
        }, FAST_CHUNKER);

        await parseSseStream(res, runIdRef.current, (delta) => {
          speculativeAnswerTextRef.current = appendText(speculativeAnswerTextRef.current, delta);
          chunker.push(delta);
        }, abort.signal);
        chunker.finish();
      } catch {
        /* cancelled or failed */
      }
    })();

    speculativePromiseRef.current = job;
    void job.finally(() => {
      if (speculativePromiseRef.current === job) speculativePromiseRef.current = null;
    });
  }, [parseSseStream, prefetchAnswerAudio, voiceMode]);

  const scheduleSpeculative = useCallback((partial: string) => {
    if (!sessionActiveRef.current || answeringRef.current || !shouldStartSpeculativeLlm(partial)) return;
    if (speculativeDebounceRef.current) clearTimeout(speculativeDebounceRef.current);
    speculativeDebounceRef.current = setTimeout(() => {
      runSpeculativeLlm(partial);
    }, SPECULATIVE_DEBOUNCE_MS);
  }, [runSpeculativeLlm]);

  const resumeListening = useCallback(async () => {
    if (!sessionActiveRef.current || answeringRef.current) return;
    setState("listening");
    setInterim(null);
    await listenerRef.current?.resume(RESUME_LISTEN_DELAY_MS);
  }, []);

  const answerPrompt = useCallback(async (prompt: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !sessionActiveRef.current || answeringRef.current) return;

    answeringRef.current = true;
    pauseListening();

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
      setTranscript((lines) => [...lines, { role: "assistant", text: instant, ts: Date.now() }]);
      enqueueSpeech(instant, runId);
      await audioQueueRef.current;
      answeringRef.current = false;
      if (runId === runIdRef.current && sessionActiveRef.current) await resumeListening();
      setLatencyMs(firstAudioLatencyRef.current ?? Math.round(performance.now() - answerStartedAt));
      return;
    }

    const specPartial = speculativePartialRef.current;
    const specAligned = specPartial && transcriptsAlign(specPartial, cleanPrompt);
    const specReady = speculativeChunksReadyRef.current > 0 || speculativeAnswerTextRef.current.trim().length > 0;

    if (specAligned && specReady) {
      await speculativePromiseRef.current?.catch(() => {});
      const answerText = speculativeAnswerTextRef.current.trim();
      const runId = bumpRun();
      audioQueueRef.current = Promise.resolve();
      if (answerText) {
        setTranscript((lines) => [...lines, { role: "assistant", text: answerText, ts: Date.now() }]);
        const chunker = new StreamSpeechChunker((chunk) => enqueueSpeech(chunk, runId), FAST_CHUNKER);
        chunker.push(answerText);
        chunker.finish();
      }
      await audioQueueRef.current;
      answeringRef.current = false;
      if (runId === runIdRef.current && sessionActiveRef.current) await resumeListening();
      setLatencyMs(firstAudioLatencyRef.current ?? Math.round(performance.now() - answerStartedAt));
      return;
    }

    const runId = bumpRun();
    audioQueueRef.current = Promise.resolve();
    setState("thinking");

    try {
      const answerText = await streamLlmAnswer(cleanPrompt, runId, undefined);
      if (answerText) {
        setInterim(null);
        setTranscript((lines) => [...lines, { role: "assistant", text: answerText, ts: Date.now() }]);
      }
      await audioQueueRef.current;
      answeringRef.current = false;
      if (runId === runIdRef.current && sessionActiveRef.current) await resumeListening();
      setLatencyMs(firstAudioLatencyRef.current ?? Math.round(performance.now() - answerStartedAt));
    } catch (err) {
      answeringRef.current = false;
      if (!sessionActiveRef.current) return;
      setError(err instanceof Error ? err.message : "AI response failed.");
      setState("error");
      sessionActiveRef.current = false;
    }
  }, [bumpRun, enqueueSpeech, pauseListening, resumeListening, streamLlmAnswer]);

  const playGreeting = useCallback(async () => {
    const runId = bumpRun();
    answeringRef.current = true;
    pauseListening();
    audioQueueRef.current = Promise.resolve();
    setTranscript((lines) => [
      ...lines,
      { role: "assistant", text: NOVACARE_FIRST_MESSAGE, ts: Date.now() },
    ]);
    enqueueSpeech(NOVACARE_FIRST_MESSAGE, runId);
    await audioQueueRef.current;
    answeringRef.current = false;
  }, [bumpRun, enqueueSpeech, pauseListening]);

  const startListening = useCallback(async () => {
    listenerRef.current?.stop();

    const listener = new VoiceListener({
      language: speechLanguage,
      silenceMs: 420,
      onInterim: (text) => {
        if (!sessionActiveRef.current || answeringRef.current) return;
        setState("listening");
        setInterim({ role: "user", text });
        scheduleSpeculative(text);
      },
      onFinal: (text) => {
        if (!sessionActiveRef.current || answeringRef.current) return;
        setInterim(null);
        void answerPrompt(text);
      },
      onError: (message) => {
        if (!sessionActiveRef.current) return;
        setError(message);
        setState("error");
        sessionActiveRef.current = false;
        answeringRef.current = false;
      },
    });

    listenerRef.current = listener;
    setError("");
    setState("listening");
    await listener.start();
  }, [answerPrompt, scheduleSpeculative, speechLanguage]);

  useEffect(() => {
    resumeListenRef.current = resumeListening;
  }, [resumeListening]);

  const startSession = useCallback(async () => {
    if (sessionActiveRef.current) return;

    setError("");
    sessionActiveRef.current = true;
    answeringRef.current = false;
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
    answeringRef.current = false;
    bumpRun();
    if (speculativeDebounceRef.current) clearTimeout(speculativeDebounceRef.current);
    listenerRef.current?.stop();
    listenerRef.current = null;
    releaseMicrophoneStream();
    audioQueueRef.current = Promise.resolve();
    stopTimer();
    setState("idle");
    setInterim(null);
  }, [bumpRun, stopTimer]);

  const changeSpeechLanguage = useCallback((code: string) => {
    setSpeechLanguage(code);
    saveSpeechLanguage(code);
    if (sessionActiveRef.current && !answeringRef.current) {
      void startListening();
    }
  }, [startListening]);

  const reset = useCallback(async () => {
    endSession();
    setError("");
    setTranscript([]);
    setLatencyMs(null);
  }, [endSession]);

  useEffect(() => {
    if (!isSilkVoiceMode(voiceMode)) return;

    return startSilkWarmKeepalive(() => {
      if (document.hidden) return;
      fireSilkWarmPaths(silkCriticalWarmPaths(window.location.origin, voiceMode));
    });
  }, [voiceMode]);

  useEffect(() => {
    return () => {
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