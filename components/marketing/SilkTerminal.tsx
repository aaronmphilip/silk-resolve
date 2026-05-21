"use client";
import { useEffect, useState } from "react";

const EVENTS = [
  { t: 400,  type: "CALL",   line: "inbound · +91 98201 44821 · Apollo Healthcare" },
  { t: 900,  type: "PEEK",   line: "pitch: 204hz  jitter: 6.1%  arousal: 7.8/10" },
  { t: 1500, type: "PEEK",   line: "intent: suppressed_frustration  latency_spike: 340ms" },
  { t: 2200, type: "MESH",   line: "loading Rajesh Iyer · 18 interactions retrieved" },
  { t: 2800, type: "MESH",   line: "debt: -42 (negative)  flag: report_delayed_3mo" },
  { t: 3400, type: "MESH",   line: "preferred_address: Sir  last_outcome: escalated" },
  { t: 4100, type: "SILK",   line: "<apologetic_whisper> Sir, main personally dekhta hoon. </apologetic_whisper>" },
  { t: 4700, type: "SILK",   line: "<warm> Aapka report abhi queue mein hai — 47 se 1 pe aa gaya. </warm>" },
  { t: 5400, type: "ACTION", line: "queue_skip · priority_flag · empathy_boost +15%" },
  { t: 6100, type: "SILK",   line: "<warm_closing> Pakka 4 ghante mein milega. Dhanyavaad. </warm_closing>" },
  { t: 6800, type: "RESULT", line: "outcome: resolved  empathy_score: 96  duration: 3m 12s" },
];

const TYPE_COLOR: Record<string, string> = {
  CALL:   "text-[#f0ebe0]/40",
  PEEK:   "text-amber-400/80",
  MESH:   "text-blue-400/80",
  SILK:   "text-[#f0ebe0]",
  ACTION: "text-emerald-400/80",
  RESULT: "text-emerald-300",
};

export default function SilkTerminal() {
  const [visible, setVisible] = useState<number[]>([]);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setVisible([]);
    const timers = EVENTS.map((ev, i) =>
      setTimeout(() => setVisible((v) => [...v, i]), ev.t)
    );
    const reset = setTimeout(() => {
      setVisible([]);
      setCycle((c) => c + 1);
    }, 9500);
    return () => { timers.forEach(clearTimeout); clearTimeout(reset); };
  }, [cycle]);

  return (
    <div className="border border-[#f0ebe0]/10 bg-[#0a0a0a] font-mono text-xs leading-relaxed overflow-hidden">
      {/* Terminal bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#f0ebe0]/10">
        <div className="w-2.5 h-2.5 rounded-full bg-[#f0ebe0]/15" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f0ebe0]/15" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#f0ebe0]/15" />
        <span className="ml-3 text-[#f0ebe0]/25 text-[10px] tracking-widest uppercase">silk · live observer</span>
        <span className="ml-auto flex items-center gap-1.5 text-[#f0ebe0]/25 text-[10px]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f0ebe0]/50" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#f0ebe0]/60" />
          </span>
          live
        </span>
      </div>
      {/* Events */}
      <div className="px-4 py-4 space-y-2 min-h-[280px]">
        {EVENTS.map((ev, i) => (
          <div
            key={`${cycle}-${i}`}
            className={`flex items-start gap-3 transition-all duration-300 ${
              visible.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            <span className={`flex-shrink-0 text-[9px] font-bold tracking-widest w-12 pt-px ${
              ev.type === "RESULT" ? "text-emerald-300" : "text-[#f0ebe0]/30"
            }`}>{ev.type}</span>
            <span className={`${TYPE_COLOR[ev.type]} break-all`}>{ev.line}</span>
          </div>
        ))}
        {visible.length > 0 && visible.length < EVENTS.length && (
          <div className="flex items-center gap-1 text-[#f0ebe0]/20 text-[10px] pt-1">
            <span className="animate-pulse">▋</span>
          </div>
        )}
      </div>
    </div>
  );
}
