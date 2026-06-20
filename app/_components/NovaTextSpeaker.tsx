"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send, Square, Volume2 } from "lucide-react";
import { playBufferedPcm, playStreamingPcmResponse } from "@/lib/silk-stream-player";
import { StreamSpeechChunker } from "@/lib/stream-speech-chunker";
import {
  buildSilkTtsBody,
  SILK_WARM_INTERVAL_MS,
  silkModelForVoiceMode,
  silkTtsQueryForMode,
  silkWarmPaths,
  vapiLlmVoiceQuery,
  voiceModeLabel,
  type WebVoiceMode,
} from "@/lib/silk-voice";

interface NovaTextSpeakerProps {
  systemPrompt: string;
  voiceMode?: WebVoiceMode;
  accentColor?: string;
}

type SpeakerState = "idle" | "thinking" | "speaking" | "error";

const SAMPLE_QUESTIONS = [
  "What are the plans?",
  "How do claims work?",
  "Do you have network hospitals?",
];

const PREFETCHED_BRIDGE_PHRASES = [
  "Let me check that.",
  "I understand.",
  "Got it.",
];

const COMMON_PATTERNS = [
  /\b(plan|plans|price|pricing|cost|premium|monthly|compare|basic|standard|premium)\b/i,
  /\b(coverage|cover|covered|insured|limit|policy limit|sum insured)\b/i,
  /\b(network|hospital|cashless|fortis|apollo|max|manipal|medanta|narayana|aster)\b/i,
  /\b(claim|claims|preauth|pre-auth|pre auth|cashless)\b/i,
  /\b(reimburse|reimbursement|paid back|upload|bills)\b/i,
  /\b(waiting|pre existing|pre-existing|existing disease|maternity)\b/i,
  /\b(add family|family member|dependent|dependents|mother|father|parent|spouse|wife|husband|child|children)\b/i,
  /\b(renew|renewal|auto renew|expire)\b/i,
  /\b(exclude|excluded|not covered|cosmetic)\b/i,
  /\b(claim status|status|policy id|claim id|account|my policy|my claim)\b/i,
  /\b(phone|email|support|contact|emergency|helpline|number)\b/i,
  /\b(who are you|about|company|novacare)\b/i,
];

const CLEAR_OUT_OF_SCOPE_PATTERNS = [
  /\b(moon|mars|space|alien)\b/i,
  /\b(cook|cooking|recipe|pasta|pizza|restaurant)\b/i,
  /\b(car insurance|bike insurance|vehicle insurance|life insurance)\b/i,
  /\b(stock|crypto|weather|flight|hotel|movie|song|cricket|football)\b/i,
  /\b(javascript|python|coding|homework|capital of|loan|bank account)\b/i,
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

function isSmallTalkPrompt(text: string): boolean {
  return /^(hi|hello|hey|thanks|thank you|bye|goodbye)[\s.!?]*$/i.test(text.trim());
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

function bridgeForPrompt(text: string): string {
  if (CLEAR_OUT_OF_SCOPE_PATTERNS.some((pattern) => pattern.test(text))) return "";
  if (!isSmallTalkPrompt(text) && !NOVACARE_INTENT_PATTERNS.some((pattern) => pattern.test(text))) return "";
  if (COMMON_PATTERNS.some((pattern) => pattern.test(text))) return "";
  if (/\b(angry|furious|terrible|worst|scam|fraud|cheated|not happy|frustrated|upset|complaint)\b/i.test(text)) {
    return "I understand.";
  }
  return "Let me check that.";
}

function appendText(current: string, next: string): string {
  const clean = stripVoiceMarkers(next);
  if (!clean) return current;
  return `${current}${current && !current.endsWith(" ") ? " " : ""}${clean}`.replace(/\s+/g, " ").trim();
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

export default function NovaTextSpeaker({ systemPrompt, voiceMode = "silk-stream", accentColor = "#0055ff" }: NovaTextSpeakerProps) {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<SpeakerState>("idle");
  const [error, setError] = useState("");
  const [transport, setTransport] = useState("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const silkModel = silkModelForVoiceMode(voiceMode) ?? "muga";
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const runIdRef = useRef(0);
  const firstChunkLatencyRef = useRef<number | null>(null);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());
  const prefetchedAudioRef = useRef(new Map<string, { audio: ArrayBuffer; sampleRate: number }>());

  useEffect(() => {
    let cancelled = false;

    async function prefetchBridgeAudio() {
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

    void prefetchBridgeAudio();
    const keepalive = window.setInterval(() => {
      if (document.hidden) return;
      for (const path of silkWarmPaths()) {
        fetch(path, { method: "GET", cache: "no-store", keepalive: true }).catch(() => {});
      }
    }, SILK_WARM_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(keepalive);
    };
  }, [silkModel, voiceMode]);

  function stopCurrentSource() {
    try {
      sourceRef.current?.stop();
    } catch {}
    sourceRef.current = null;
  }

  function stopAudio() {
    runIdRef.current++;
    stopCurrentSource();
    audioQueueRef.current = Promise.resolve();
    setState("idle");
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

  function playSpeechChunk(speakable: string, runId: number): Promise<void> {
    const prefetched = silkModel === "muga"
      ? prefetchedAudioRef.current.get(normalizeSpeechKey(speakable))
      : undefined;

    if (prefetched) {
      setTransport("prefetched-muga-audio");
      setLatencyMs(0);
      return playBufferedPcm(
        prefetched.audio,
        prefetched.sampleRate,
        runId,
        () => runId === runIdRef.current,
        audioContextRef.current
      );
    }

    const query = silkTtsQueryForMode(voiceMode);
    return fetch(`/api/voice/silk-tts${query}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSilkTtsBody(voiceMode, speakable)),
    })
      .then(async (res) => {
        const playback = await playStreamingPcmResponse(
          res,
          runId,
          () => runId === runIdRef.current,
          audioContextRef.current
        );
        setTransport(playback.transport || "websocket");
        if (firstChunkLatencyRef.current === null) {
          firstChunkLatencyRef.current = Math.round(playback.firstFrameMs);
          setLatencyMs(firstChunkLatencyRef.current);
        }
      });
  }

  function enqueueSpeech(text: string, runId: number) {
    const speakable = text.trim();
    if (!speakable) return;

    const job = playSpeechChunk(speakable, runId).catch((err) => {
      if (runId !== runIdRef.current) return;
      const raw = err instanceof Error ? err.message : `${silkModel.toUpperCase()} speech failed.`;
      const clean = raw.includes("<!DOCTYPE") || raw.includes("<html")
        ? `${silkModel.toUpperCase()} speech failed. Retry in a moment.`
        : raw.slice(0, 240);
      setError(clean);
      setState("error");
    });

    audioQueueRef.current = audioQueueRef.current.then(() => job);
  }

  async function submit(text: string) {
    const prompt = text.trim();
    if (!prompt || state === "thinking" || state === "speaking") return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    stopCurrentSource();
    audioQueueRef.current = Promise.resolve();
    setInput("");
    setQuestion(prompt);
    setAnswer("");
    setError("");
    setTransport("");
    setLatencyMs(null);
    firstChunkLatencyRef.current = null;
    setState("thinking");

    try {
      const res = await fetch(`/api/voice/vapi-llm?${vapiLlmVoiceQuery(voiceMode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        const clean = detail.includes("<!DOCTYPE") || detail.includes("<html")
          ? `AI response failed (${res.status}).`
          : detail || `AI response failed (${res.status}).`;
        throw new Error(clean.slice(0, 240));
      }

      setState("speaking");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const chunker = new StreamSpeechChunker((chunk) => {
        const spoken = silkModel === "muga" && !/^\s*\[(neutral|happy|sad|excited|angry|whisper)\]/i.test(chunk)
          ? `[neutral] ${chunk}`
          : chunk;
        enqueueSpeech(spoken, runId);
      });

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
              const content = data.choices?.[0]?.delta?.content ?? "";
              if (!content) continue;
              setAnswer((current) => appendText(current, content));
              chunker.push(content);
            } catch {}
          }
        }
      }

      chunker.finish();
      await audioQueueRef.current;
      if (runId === runIdRef.current) setState("idle");
    } catch (err) {
      if (runId !== runIdRef.current) return;
      setError(err instanceof Error ? err.message : "AI response failed.");
      setState("error");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(input);
  }

  const busy = state === "thinking" || state === "speaking";

  return (
    <div className="mx-auto max-w-2xl border border-gray-200 bg-white text-left rounded-lg overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentColor }}>Text a problem</p>
          <p className="text-xs text-gray-500 mt-0.5">{voiceModeLabel(voiceMode)}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
          {state === "thinking" ? "thinking" : state === "speaking" ? "speaking" : latencyMs !== null ? `${transport} · ${latencyMs}ms` : transport || "ready"}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 min-h-44">
        {!question && !answer ? (
          <div className="text-sm text-gray-400 py-3">No typed message yet.</div>
        ) : (
          <>
            {question && (
              <div className="flex justify-end">
                <div className="max-w-[86%] rounded-lg text-white px-4 py-3" style={{ backgroundColor: accentColor }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-1">you</p>
                  <p className="text-sm leading-relaxed">{question}</p>
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

      <form onSubmit={onSubmit} className="border-t border-gray-100 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={busy}
            placeholder="I need help comparing the plans"
            className="min-h-12 flex-1 rounded-lg border border-gray-200 px-4 text-sm outline-none disabled:bg-gray-50"
            style={{ outlineColor: accentColor }}
          />
          {busy ? (
            <button
              type="button"
              onClick={stopAudio}
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="h-4 w-4" />
              Speak
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((sample) => (
            <button
              key={sample}
              type="button"
              disabled={busy}
              onClick={() => void submit(sample)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-gray-300 disabled:opacity-40"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
