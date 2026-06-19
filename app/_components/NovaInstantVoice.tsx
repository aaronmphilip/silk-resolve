"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Volume2 } from "lucide-react";
import { answerNovaCareQuestion, NOVACARE_PROMPT } from "@/lib/novacare-knowledge";
import { playBufferedPcm, playStreamingPcmResponse } from "@/lib/silk-stream-player";
import {
  buildSilkTtsBody,
  SILK_WARM_INTERVAL_MS,
  silkModelForVoiceMode,
  silkTtsQueryForMode,
  silkWarmPaths,
  voiceModeLabel,
  type WebVoiceMode,
} from "@/lib/silk-voice";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

type SpeechRecognitionResultItem = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResultListItem = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultListItem;
  };
};

type SpeechRecognitionErrorLike = {
  error?: string;
  message?: string;
};

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

const PREFETCHED_BRIDGE_PHRASES = [
  "Let me check that.",
  "I understand.",
  "Got it.",
];

const CLEAR_OUT_OF_SCOPE_PATTERNS = [
  /\b(moon|mars|space|alien)\b/i,
  /\b(cook|cooking|recipe|pasta|pizza|restaurant)\b/i,
  /\b(car insurance|bike insurance|vehicle insurance|life insurance)\b/i,
  /\b(stock|crypto|weather|flight|hotel|movie|song|cricket|football)\b/i,
  /\b(javascript|python|coding|homework|capital of|loan|bank account)\b/i,
];

const NOVACARE_FAST_PATTERNS = [
  /\b(plan|plans|price|pricing|cost|premium|monthly|compare|basic|standard|premium)\b/i,
  /\b(coverage|cover|covered|insured|limit|policy limit|sum insured)\b/i,
  /\b(network|hospital|cashless|fortis|apollo|max|manipal|medanta|narayana|aster)\b/i,
  /\b(claim|claims|preauth|pre-auth|pre auth|cashless|claim status|status)\b/i,
  /\b(reimburse|reimbursement|paid back|upload|bills)\b/i,
  /\b(waiting|pre existing|pre-existing|existing disease|maternity)\b/i,
  /\b(add family|family member|dependent|dependents|mother|father|parent|spouse|wife|husband|child|children)\b/i,
  /\b(renew|renewal|auto renew|expire)\b/i,
  /\b(exclude|excluded|not covered|cosmetic)\b/i,
  /\b(phone|email|support|contact|emergency|helpline|number)\b/i,
  /\b(who are you|about|company|novacare)\b/i,
];

const NOVACARE_INTENT_PATTERNS = [
  /\b(novacare|health|insurance|insurer|policy|plan|premium|price|pricing|cost|monthly)\b/i,
  /\b(coverage|cover|covered|insured|benefit|claim|preauth|pre-auth|pre auth|cashless)\b/i,
  /\b(reimburse|reimbursement|hospital|network|icu|opd|ambulance|maternity|waiting)\b/i,
  /\b(pre existing|pre-existing|existing disease|dental|doctor|medicine|surgery|treatment)\b/i,
  /\b(emergency|support|contact|helpline|email|phone|app|customer|service)\b/i,
  /\b(add family|family member|dependent|dependents|mother|father|parent|spouse|wife|husband|child|children)\b/i,
  /\b(renew|renewal|expire|exclude|excluded|not covered|cosmetic|status|account)\b/i,
  /\b(who are you|what do you|what can you|help|company|about)\b/i,
];

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function stripVoiceMarkers(text: string): string {
  return text
    .replace(/^\s*\[(neutral|happy|sad|excited|angry|whisper)\]\s*/i, "")
    .replace(/<(laugh|sigh|hmm|pause|breathe)>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpeechKey(text: string): string {
  return stripVoiceMarkers(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function appendText(current: string, next: string): string {
  const clean = stripVoiceMarkers(next);
  if (!clean) return current;
  return `${current}${current && !current.endsWith(" ") ? " " : ""}${clean}`.replace(/\s+/g, " ").trim();
}

function isSmallTalkPrompt(text: string): boolean {
  return /^(hi|hello|hey|thanks|thank you|bye|goodbye)[\s.!?]*$/i.test(text.trim());
}

function bridgeForPrompt(text: string): string {
  if (CLEAR_OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(text))) return "";
  if (NOVACARE_FAST_PATTERNS.some((pattern) => pattern.test(text))) return "";
  if (!isSmallTalkPrompt(text) && !NOVACARE_INTENT_PATTERNS.some((pattern) => pattern.test(text))) return "";
  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated|not happy|frustrated|upset|complaint)\b/i.test(text)) {
    return "I understand.";
  }
  return "Let me check that.";
}

function stripLeadingBridge(text: string, bridge: string): string {
  const clean = stripVoiceMarkers(text);
  const bridgeKey = normalizeSpeechKey(bridge);
  if (!bridgeKey || !normalizeSpeechKey(clean).startsWith(bridgeKey)) return clean;

  const escaped = bridge.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return clean.replace(new RegExp(`^\\s*${escaped}\\s*[,.;:!?-]*\\s*`, "i"), "").trim();
}

function readSsePayloads(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  return { events: parts.slice(0, -1), rest: parts[parts.length - 1] ?? "" };
}

interface NovaInstantVoiceProps {
  voiceMode?: WebVoiceMode;
  accentColor?: string;
}

export default function NovaInstantVoice({ voiceMode = "silk-stream", accentColor = "#0055ff" }: NovaInstantVoiceProps) {
  const [state, setState] = useState<VoiceState>("idle");
  const [supported, setSupported] = useState(true);
  const [question, setQuestion] = useState("");
  const [interim, setInterim] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [transport, setTransport] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const silkModel = silkModelForVoiceMode(voiceMode) ?? "muga";
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const runIdRef = useRef(0);
  const prefetchedAudioRef = useRef(new Map<string, { audio: ArrayBuffer; sampleRate: number }>());

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));

    let cancelled = false;
    async function warmVoice() {
      const query = silkTtsQueryForMode(voiceMode);
      for (const path of silkWarmPaths()) {
        fetch(path, { method: "GET", cache: "no-store" }).catch(() => {});
      }

      if (silkModel !== "muga") return;

      await Promise.all(PREFETCHED_BRIDGE_PHRASES.map(async (phrase) => {
        try {
          const res = await fetch(`/api/voice/silk-tts${query}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildSilkTtsBody(voiceMode, `[neutral] ${phrase}`)),
          });
          if (!res.ok || cancelled) return;
          prefetchedAudioRef.current.set(normalizeSpeechKey(phrase), {
            audio: await res.arrayBuffer(),
            sampleRate: Number(res.headers.get("x-audio-sample-rate") ?? 24000),
          });
        } catch {}
      }));
    }

    void warmVoice();
    const keepalive = window.setInterval(() => {
      if (document.hidden) return;
      for (const path of silkWarmPaths()) {
        fetch(path, { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
      }
    }, SILK_WARM_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(keepalive);
      recognitionRef.current?.abort();
      stopCurrentSource();
    };
  }, [silkModel, voiceMode]);

  function stopCurrentSource() {
    try {
      sourceRef.current?.stop();
    } catch {}
    sourceRef.current = null;
  }

  function stopAll() {
    runIdRef.current++;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stopCurrentSource();
    audioQueueRef.current = Promise.resolve();
    setState("idle");
    setInterim("");
  }

  async function playPcm(arrayBuffer: ArrayBuffer, sampleRate: number, runId: number) {
    if (runId !== runIdRef.current) return;

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) throw new Error("Audio playback is not supported in this browser.");

    const ctx = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = ctx;
    if (ctx.state === "suspended") await ctx.resume();

    const pcm = new Int16Array(arrayBuffer);
    const audioBuffer = ctx.createBuffer(1, pcm.length, sampleRate);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) {
      channel[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
    }

    await new Promise<void>((resolve) => {
      if (runId !== runIdRef.current) return resolve();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (sourceRef.current === source) sourceRef.current = null;
        resolve();
      };
      sourceRef.current = source;
      source.start();
    });
  }

  function enqueueSpeech(text: string, runId: number) {
    const speakable = text.trim();
    if (!speakable) return;

    audioQueueRef.current = audioQueueRef.current
      .then(async () => {
        if (runId !== runIdRef.current) return;
        const prefetched = silkModel === "muga"
          ? prefetchedAudioRef.current.get(normalizeSpeechKey(speakable))
          : undefined;
        if (prefetched) {
          setTransport("prefetched-muga-audio");
          setLatencyMs(0);
          await playBufferedPcm(
            prefetched.audio,
            prefetched.sampleRate,
            runId,
            () => runId === runIdRef.current,
            audioContextRef.current
          );
          return;
        }

        const query = silkTtsQueryForMode(voiceMode);
        const res = await fetch(`/api/voice/silk-tts${query}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildSilkTtsBody(voiceMode, speakable)),
        });

        const playback = await playStreamingPcmResponse(
          res,
          runId,
          () => runId === runIdRef.current,
          audioContextRef.current
        );
        audioContextRef.current = audioContextRef.current;
        setTransport(playback.transport || "websocket");
        setLatencyMs(Math.round(playback.firstFrameMs));
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err.message : `${silkModel.toUpperCase()} speech failed.`);
        setState("error");
      });
  }

  async function streamServerAnswer(prompt: string, immediateBridge: string, runId: number) {
    const res = await fetch("/api/voice/vapi-llm?voice=silk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stream: true,
        messages: [
          { role: "system", content: NOVACARE_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || "AI response failed.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let skippedServerBridge = false;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (runId !== runIdRef.current) return;

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
            if (immediateBridge && !skippedServerBridge) {
              const stripped = stripLeadingBridge(content, immediateBridge);
              if (stripped !== stripVoiceMarkers(content)) {
                skippedServerBridge = true;
                content = stripped;
                if (!content) continue;
              }
            }
            setAnswer((current) => appendText(current, content));
            enqueueSpeech(content, runId);
          } catch {}
        }
      }
    }
  }

  async function answerPrompt(prompt: string) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    stopCurrentSource();
    audioQueueRef.current = Promise.resolve();
    setQuestion(cleanPrompt);
    setInterim("");
    setAnswer("");
    setError("");
    setTransport("");
    setLatencyMs(null);

    const cachedAnswer = answerNovaCareQuestion(cleanPrompt);
    if (cachedAnswer) {
      setState("speaking");
      setAnswer(cachedAnswer);
      enqueueSpeech(silkModel === "muga" ? `[neutral] ${cachedAnswer}` : cachedAnswer, runId);
      await audioQueueRef.current;
      if (runId === runIdRef.current) setState("idle");
      return;
    }

    const immediateBridge = bridgeForPrompt(cleanPrompt);
    if (immediateBridge) {
      setState("speaking");
      setAnswer(immediateBridge);
      enqueueSpeech(silkModel === "muga" ? `[neutral] ${immediateBridge}` : immediateBridge, runId);
    } else {
      setState("thinking");
    }

    try {
      await streamServerAnswer(cleanPrompt, immediateBridge, runId);
      await audioQueueRef.current;
      if (runId === runIdRef.current) setState("idle");
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setError(err instanceof Error ? err.message : "AI response failed.");
      setState("error");
    }
  }

  function startListening() {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      setSupported(false);
      setState("error");
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    stopAll();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    setQuestion("");
    setInterim("");
    setAnswer("");
    setError("");
    setTransport("");
    setLatencyMs(null);
    setState("listening");

    recognition.onresult = (event) => {
      if (runId !== runIdRef.current) return;
      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }

      setInterim(interimText.trim());
      if (finalText.trim()) {
        recognitionRef.current = null;
        recognition.stop();
        void answerPrompt(finalText);
      }
    };

    recognition.onerror = (event) => {
      if (runId !== runIdRef.current) return;
      const message = event.message || event.error || "Speech recognition failed.";
      setError(message);
      setState("error");
    };

    recognition.onend = () => {
      if (runId !== runIdRef.current) return;
      recognitionRef.current = null;
      setState((current) => current === "listening" ? "idle" : current);
    };

    try {
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speech recognition failed.");
      setState("error");
    }
  }

  const busy = state === "listening" || state === "thinking" || state === "speaking";

  return (
    <div className="mx-auto max-w-2xl border border-gray-200 bg-white text-left rounded-lg overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>Talk a problem</p>
          <p className="text-xs text-gray-500 mt-0.5">Direct NovaCare · {voiceModeLabel(voiceMode)}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
          {state === "listening" ? "listening" : state === "thinking" ? "thinking" : state === "speaking" ? "speaking" : latencyMs !== null ? `${transport} · ${latencyMs}ms` : transport || "ready"}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 min-h-44">
        {!question && !interim && !answer ? (
          <div className="text-sm text-gray-400 py-3">
            {supported ? "No spoken message yet." : "Speech recognition is not supported in this browser."}
          </div>
        ) : (
          <>
            {(question || interim) && (
              <div className="flex justify-end">
                <div className="max-w-[86%] rounded-lg text-white px-4 py-3" style={{ backgroundColor: accentColor }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">you</p>
                  <p className="text-sm leading-relaxed">{question || interim}</p>
                </div>
              </div>
            )}
            {answer && (
              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">agent</p>
                  <p className="text-sm leading-relaxed">{answer}</p>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
      </div>

      <div className="border-t border-gray-100 p-3 flex flex-col sm:flex-row gap-2">
        {busy ? (
          <button
            type="button"
            onClick={stopAll}
            className="min-h-12 inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            disabled={!supported}
            onClick={startListening}
            className="min-h-12 inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            <Mic className="h-4 w-4" />
            Speak now
          </button>
        )}
      </div>
    </div>
  );
}
