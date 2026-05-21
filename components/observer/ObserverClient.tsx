"use client";
import { useState, useEffect, useRef } from "react";
import { HIDDEN_INTENT_EVENTS, SILK_PAYLOADS } from "@/lib/mock-data";
import type { HiddenIntentEvent, SilkPayload } from "@/lib/types";

type Pillar = "PEEK" | "MESH" | "SILK" | "ACTION";

interface DetectionEvent {
  time: string;
  pillar: Pillar;
  event: string;
  value: string;
}

interface TranscriptLine {
  speaker: "USER" | "AGENT";
  text: string;
  tags?: string[];
}

// ── Simulation data ──────────────────────────────────────────────────────────

const TRANSCRIPT: TranscriptLine[] = [
  { speaker: "USER", text: "Hello? I've been waiting for my medical report for 4 days now." },
  { speaker: "AGENT", text: "I understand. Can I get your patient ID to look into this right away?", tags: ["<warm>"] },
  { speaker: "USER", text: "It's APL-2847. This is completely unprofessional, I need it today." },
  { speaker: "AGENT", text: "Arre yaar, you're absolutely right and I sincerely apologise for this delay.", tags: ["<apologetic_whisper>"] },
  { speaker: "AGENT", text: "I'm jumping your request to priority queue right now. You'll have it in 10 minutes.", tags: ["<warm>", "queue_skip"] },
  { speaker: "USER", text: "Okay... thank you. That's more like it." },
  { speaker: "AGENT", text: "It's on its way to your registered email. Is there anything else I can help you with today?", tags: ["<warm_closing>"] },
  { speaker: "USER", text: "No, that's fine. Thank you." },
];

const EVENTS: DetectionEvent[] = [
  { time: "00:04", pillar: "PEEK", event: "Vocal tension detected", value: "6.2 / 10" },
  { time: "00:08", pillar: "MESH", event: "User record recalled", value: "delay_march_2026" },
  { time: "00:13", pillar: "PEEK", event: "Tension escalated → URGENT", value: "8.5 / 10" },
  { time: "00:16", pillar: "SILK", event: "Mid-sentence tag injected", value: "<apologetic_whisper>" },
  { time: "00:19", pillar: "MESH", event: "Emotional debt applied", value: "empathy_boost +15%" },
  { time: "00:23", pillar: "ACTION", event: "Queue priority elevated", value: "pos 47 → 1" },
  { time: "00:27", pillar: "SILK", event: "Tag injected", value: "<warm>" },
  { time: "00:32", pillar: "PEEK", event: "Tension dropping", value: "8.5 → 3.1 / 10" },
  { time: "00:39", pillar: "SILK", event: "Closing sequence injected", value: "<warm_closing>" },
];

const EMPATHY_CURVE = [
  { at: 0, val: 42 }, { at: 3000, val: 51 }, { at: 7000, val: 60 },
  { at: 11000, val: 71 }, { at: 15000, val: 79 }, { at: 19000, val: 87 },
  { at: 24000, val: 93 }, { at: 28000, val: 96 },
];

const TENSION_CURVE = [
  { at: 0, val: 4.2 }, { at: 4000, val: 8.5 }, { at: 9000, val: 8.1 },
  { at: 14000, val: 6.3 }, { at: 18000, val: 4.7 },
  { at: 23000, val: 3.1 }, { at: 30000, val: 1.8 },
];

// Ingress analysis (fires in first 5 seconds)
const INGRESS = {
  environment: "hospital",
  pitch: 187,
  jitter: 4.2,
  noiseDb: 28,
  language: "Hinglish (hi-IN)",
  confidence: 94,
};

export default function ObserverClient() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "ingress" | "processing">("idle");
  const [ingressDone, setIngressDone] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [empathy, setEmpathy] = useState(42);
  const [tension, setTension] = useState(4.2);
  const [silkSync, setSilkSync] = useState(0);
  const [hiddenIntents, setHiddenIntents] = useState<HiddenIntentEvent[]>([]);
  const [silkPayloads, setSilkPayloads] = useState<SilkPayload[]>([]);
  const [activeTab, setActiveTab] = useState<"detection" | "intent" | "payload">("detection");

  // Ingress animated values
  const [ingressPitch, setIngressPitch] = useState(0);
  const [ingressJitter, setIngressJitter] = useState(0);
  const [ingressConf, setIngressConf] = useState(0);
  const [ingressEnv, setIngressEnv] = useState("detecting...");

  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-start
  useEffect(() => {
    const t = setTimeout(() => {
      setRunning(true);
      setPhase("ingress");
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Ingress animation (0-5s)
  useEffect(() => {
    if (!running) return;
    const timers = [
      setTimeout(() => setIngressPitch(INGRESS.pitch), 400),
      setTimeout(() => setIngressJitter(INGRESS.jitter), 800),
      setTimeout(() => setIngressConf(INGRESS.confidence), 1200),
      setTimeout(() => setIngressEnv(INGRESS.environment), 1600),
      setTimeout(() => {
        setIngressDone(true);
        setPhase("processing");
      }, 4800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [running]);

  // Clock
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [running]);

  // Transcript drip
  useEffect(() => {
    if (!running) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    TRANSCRIPT.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setTranscript((prev) => [...prev, line]);
          setTimeout(() => {
            transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
          }, 60);
        }, i * 4200 + 600)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [running]);

  // Events drip
  useEffect(() => {
    if (!running) return;
    const timers = EVENTS.map((ev, i) =>
      setTimeout(() => setEvents((prev) => [ev, ...prev]), i * 3600 + 1800)
    );
    return () => timers.forEach(clearTimeout);
  }, [running]);

  // Empathy curve
  useEffect(() => {
    if (!running) return;
    const timers = EMPATHY_CURVE.map(({ at, val }) =>
      setTimeout(() => setEmpathy(val), at)
    );
    return () => timers.forEach(clearTimeout);
  }, [running]);

  // Tension curve
  useEffect(() => {
    if (!running) return;
    const timers = TENSION_CURVE.map(({ at, val }) =>
      setTimeout(() => setTension(val), at)
    );
    return () => timers.forEach(clearTimeout);
  }, [running]);

  useEffect(() => {
    setSilkSync(Math.min(99, Math.round(empathy * 1.02)));
  }, [empathy]);

  // Hidden intent drip
  useEffect(() => {
    if (!running) return;
    const timers = HIDDEN_INTENT_EVENTS.map((ev, i) =>
      setTimeout(() => setHiddenIntents((prev) => [ev, ...prev]), i * 4800 + 6000)
    );
    return () => timers.forEach(clearTimeout);
  }, [running]);

  // Silk payload drip
  useEffect(() => {
    if (!running) return;
    const timers = SILK_PAYLOADS.map((p, i) =>
      setTimeout(() => setSilkPayloads((prev) => [p, ...prev]), i * 10000 + 8000)
    );
    return () => timers.forEach(clearTimeout);
  }, [running]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const pillarLabel: Record<Pillar, string> = { PEEK: "intent", MESH: "memory", SILK: "voice", ACTION: "execute" };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left: Transcript ──────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-black overflow-hidden">
        <div className="px-6 py-3 border-b border-black flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-mono opacity-35 uppercase tracking-widest">
              live transcript
            </p>
            <span
              className={`text-[9px] font-mono border px-2 py-0.5 ${
                phase === "ingress"
                  ? "border-black animate-pulse"
                  : phase === "processing"
                  ? "border-black"
                  : "border-black/20 opacity-30"
              }`}
            >
              {phase === "idle" ? "idle" : phase === "ingress" ? "INGRESS" : "PROCESSING"}
            </span>
          </div>
          <p className="text-xs font-mono opacity-50">{fmt(elapsed)}</p>
        </div>

        {/* Ingress Analysis Panel */}
        <div
          className={`border-b border-black transition-all duration-500 overflow-hidden ${
            phase === "ingress" || (ingressDone && phase === "processing") ? "max-h-40" : "max-h-0"
          }`}
        >
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest">
                ingress · first 5s analysis
              </p>
              {ingressDone && (
                <span className="text-[9px] font-mono opacity-50">· complete</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "environment", value: ingressEnv || "..." },
                { label: "pitch", value: ingressPitch ? `${ingressPitch} Hz` : "..." },
                { label: "jitter", value: ingressJitter ? `${ingressJitter} ms` : "..." },
                { label: "noise", value: `${INGRESS.noiseDb} dB` },
                { label: "confidence", value: ingressConf ? `${ingressConf}%` : "..." },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[8px] font-mono opacity-30 uppercase tracking-widest mb-1">
                    {s.label}
                  </p>
                  <p
                    className={`text-xs font-mono font-semibold transition-all duration-300 ${
                      s.value === "..." ? "opacity-25 animate-pulse" : ""
                    }`}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            {ingressDone && (
              <p className="text-[9px] font-mono opacity-40 mt-2">
                mesh recall triggered · language model: hinglish-warm ·{" "}
                <span className="font-bold">processing phase initiated</span>
              </p>
            )}
          </div>
        </div>

        <div
          ref={transcriptRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
        >
          {transcript.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs font-mono opacity-25 animate-pulse">
                {phase === "ingress" ? "analysing ingress..." : "call connecting..."}
              </p>
            </div>
          )}
          {transcript.map((line, i) => (
            <div
              key={i}
              className={`flex ${line.speaker === "AGENT" ? "justify-start" : "justify-end"}`}
            >
              <div className="max-w-[72%]">
                <p className="text-[10px] font-mono opacity-30 mb-1.5">{line.speaker}</p>
                <div
                  className={`px-4 py-3 border border-black text-sm leading-relaxed ${
                    line.speaker === "AGENT" ? "bg-black/5" : "bg-transparent"
                  }`}
                >
                  {line.text}
                </div>
                {line.tags && line.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {line.tags.map((t, j) => (
                      <span key={j} className="text-[10px] font-mono bg-black text-[#f0ebe0] px-2 py-0.5">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Metrics ────────────────────────────────── */}
      <div className="w-[340px] flex flex-col overflow-hidden border-l border-black flex-shrink-0">
        {/* Empathy score */}
        <div className="px-6 pt-6 pb-5 border-b border-black">
          <p className="text-[10px] font-mono opacity-35 uppercase tracking-widest mb-3">
            empathy match
          </p>
          <div
            className="text-[64px] font-bold tracking-tight leading-none transition-all duration-700"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {empathy}%
          </div>
          <div className="mt-4 h-1.5 bg-black/10">
            <div
              className="h-1.5 bg-black transition-all duration-700 ease-out"
              style={{ width: `${empathy}%` }}
            />
          </div>
          <p className="text-[10px] font-mono opacity-30 mt-1.5">
            {empathy < 60 ? "calibrating..." : empathy < 80 ? "empathy building" : empathy < 92 ? "strong match" : "optimal resolution"}
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-3 border-b border-black">
          {[
            { name: "PEEK", value: `${tension.toFixed(1)}/10`, label: "tension", blink: tension > 7 },
            { name: "MESH", value: "ACTIVE", label: "memory", blink: false },
            { name: "SILK", value: `${silkSync}%`, label: "voice sync", blink: false },
          ].map((p, i) => (
            <div key={i} className={`px-3 py-4 text-center ${i < 2 ? "border-r border-black" : ""}`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full bg-black ${p.blink ? "animate-ping" : ""}`} />
                <p className="text-[10px] font-mono font-bold">{p.name}</p>
              </div>
              <p className="text-sm font-mono font-semibold transition-all duration-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                {p.value}
              </p>
              <p className="text-[9px] opacity-35 mt-0.5 font-mono">{p.label}</p>
            </div>
          ))}
        </div>

        {/* Tabbed feed */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab strip */}
          <div className="grid grid-cols-3 border-b border-black flex-shrink-0">
            {(["detection", "intent", "payload"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-2.5 text-[9px] font-mono uppercase tracking-widest transition-all ${
                  activeTab === tab ? "bg-black text-[#f0ebe0]" : "opacity-35 hover:opacity-70"
                }`}
              >
                {tab === "detection" ? "feed" : tab === "intent" ? "intent" : "silk"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Detection feed */}
            {activeTab === "detection" && (
              <>
                {events.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[10px] font-mono opacity-25 animate-pulse">monitoring active...</p>
                  </div>
                )}
                <div className="divide-y divide-black/10">
                  {events.map((e, i) => (
                    <div key={i} className={`px-4 py-3 ${i === 0 ? "bg-black/5" : ""}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold border border-black px-1.5 py-0.5">
                          {e.pillar}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono opacity-30">{pillarLabel[e.pillar]}</span>
                          <span className="text-[10px] font-mono opacity-40">{e.time}</span>
                        </div>
                      </div>
                      <p className="text-xs leading-snug">{e.event}</p>
                      {e.value && (
                        <p className="text-[10px] font-mono opacity-55 mt-0.5 font-semibold">{e.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Hidden Intent Monitor */}
            {activeTab === "intent" && (
              <>
                {hiddenIntents.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[10px] font-mono opacity-25 animate-pulse">peek analysing...</p>
                  </div>
                )}
                <div className="divide-y divide-black/10">
                  {hiddenIntents.map((ev, i) => (
                    <div key={ev.id} className={`px-4 py-3.5 ${i === 0 ? "bg-black/5" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono font-bold border border-black px-1.5 py-0.5 uppercase">
                          {ev.type.replace("_", " ")}
                        </span>
                        <span className="text-[9px] font-mono opacity-40">{ev.time}</span>
                      </div>
                      <p className="text-xs font-semibold mb-1">{ev.label}</p>
                      <p className="text-[10px] opacity-55 leading-snug mb-2">{ev.detail}</p>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-[8px] font-mono opacity-30 mb-0.5">arousal</p>
                          <div className="h-0.5 bg-black/10">
                            <div className="h-0.5 bg-black" style={{ width: `${ev.arousalScore * 10}%` }} />
                          </div>
                        </div>
                        <span className="text-[9px] font-mono opacity-50">{ev.arousalScore}/10</span>
                      </div>
                      <p className="text-[9px] font-mono opacity-40">↳ {ev.triggered}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Silk Payload viewer */}
            {activeTab === "payload" && (
              <>
                {silkPayloads.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[10px] font-mono opacity-25 animate-pulse">silk synthesizing...</p>
                  </div>
                )}
                <div className="divide-y divide-black/10">
                  {silkPayloads.map((p, i) => (
                    <div key={p.id} className={`px-4 py-3.5 ${i === 0 ? "bg-black/5" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono font-bold">{p.targetEmotion}</span>
                        <span className="text-[9px] font-mono opacity-40">{p.time}</span>
                      </div>
                      {/* Prosody-tagged payload render */}
                      <div className="text-[10px] leading-relaxed mb-3 border border-black/10 px-3 py-2 bg-black/[0.02]">
                        {p.segments.map((seg, j) => (
                          seg.type === "text" ? (
                            <span key={j} className="opacity-80">{seg.value}</span>
                          ) : (
                            <span key={j} className="font-mono text-[9px] bg-black text-[#f0ebe0] px-1 mx-0.5 py-0.5">
                              {seg.value}
                            </span>
                          )
                        ))}
                      </div>
                      <p className="text-[8px] font-mono opacity-30 uppercase tracking-widest mb-0.5">mesh input</p>
                      <p className="text-[9px] font-mono opacity-45 mb-1.5">{p.meshInput}</p>
                      <p className="text-[8px] font-mono opacity-30 uppercase tracking-widest mb-0.5">peek input</p>
                      <p className="text-[9px] font-mono opacity-45">{p.peekInput}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
