"use client";

import { FormEvent, useRef, useState } from "react";
import { Loader2, Send, Square, Volume2 } from "lucide-react";

interface NovaTextSpeakerProps {
  systemPrompt: string;
}

type SpeakerState = "idle" | "thinking" | "speaking" | "error";

const SAMPLE_QUESTIONS = [
  "What are the plans?",
  "How do claims work?",
  "Do you have network hospitals?",
];

function stripVoiceMarkers(text: string): string {
  return text
    .replace(/^\s*\[(neutral|happy|sad|excited|angry|whisper)\]\s*/i, "")
    .replace(/<(laugh|sigh|hmm|pause|breathe)>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function appendText(current: string, next: string): string {
  const clean = stripVoiceMarkers(next);
  if (!clean) return current;
  return `${current}${current && !current.endsWith(" ") ? " " : ""}${clean}`.replace(/\s+/g, " ").trim();
}

function readSsePayloads(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  return { events: parts.slice(0, -1), rest: parts[parts.length - 1] ?? "" };
}

export default function NovaTextSpeaker({ systemPrompt }: NovaTextSpeakerProps) {
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<SpeakerState>("idle");
  const [error, setError] = useState("");
  const [transport, setTransport] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const runIdRef = useRef(0);
  const audioQueueRef = useRef<Promise<void>>(Promise.resolve());

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

  function enqueueSpeech(text: string, runId: number) {
    const speakable = text.trim();
    if (!speakable) return;

    audioQueueRef.current = audioQueueRef.current
      .then(async () => {
        if (runId !== runIdRef.current) return;
        const res = await fetch("/api/voice/silk-tts?transport=ws", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: speakable, sampleRate: 24000 }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "MUGA speech failed.");
        }

        setTransport(res.headers.get("x-silk-transport") ?? "");
        const sampleRate = Number(res.headers.get("x-audio-sample-rate") ?? 24000);
        await playPcm(await res.arrayBuffer(), sampleRate, runId);
      })
      .catch((err) => {
        if (runId !== runIdRef.current) return;
        setError(err instanceof Error ? err.message : "MUGA speech failed.");
        setState("error");
      });
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
    setState("thinking");

    try {
      const res = await fetch("/api/voice/vapi-llm?voice=silk", {
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
        throw new Error(detail || "AI response failed.");
      }

      setState("speaking");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              enqueueSpeech(content, runId);
            } catch {}
          }
        }
      }

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
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0055ff]">Typed question</p>
          <p className="text-xs text-gray-500 mt-0.5">NovaCare support</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
          {state === "thinking" ? "thinking" : state === "speaking" ? "speaking" : transport || "ready"}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 min-h-44">
        {!question && !answer ? (
          <div className="text-sm text-gray-400 py-3">No typed message yet.</div>
        ) : (
          <>
            {question && (
              <div className="flex justify-end">
                <div className="max-w-[86%] rounded-lg bg-[#0055ff] text-white px-4 py-3">
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
            className="min-h-12 flex-1 rounded-lg border border-gray-200 px-4 text-sm outline-none focus:border-[#0055ff] disabled:bg-gray-50"
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
              className="min-h-12 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0055ff] px-5 text-sm font-semibold text-white disabled:opacity-40"
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
