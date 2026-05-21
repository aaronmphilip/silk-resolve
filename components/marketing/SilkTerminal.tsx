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
  { t: 4700, type: "SILK",   line: "<warm> Aapka report queue 47→1 pe aa gaya. </warm>" },
  { t: 5400, type: "ACTION", line: "queue_skip · priority_flag · empathy_boost +15%" },
  { t: 6100, type: "SILK",   line: "<warm_closing> Pakka 4 ghante mein milega. Dhanyavaad. </warm_closing>" },
  { t: 6800, type: "RESULT", line: "outcome: resolved  empathy_score: 96  duration: 3m 12s" },
];

interface Props { light?: boolean; }

export default function SilkTerminal({ light }: Props) {
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

  const bg     = light ? "bg-black/[0.03]"         : "bg-[#0a0a0a]";
  const border = light ? "border-black/12"          : "border-[#f0ebe0]/10";
  const bar    = light ? "border-black/10"          : "border-[#f0ebe0]/10";
  const dot    = light ? "bg-black/15"              : "bg-[#f0ebe0]/15";
  const label  = light ? "text-black/30"            : "text-[#f0ebe0]/25";
  const ping   = light ? "bg-black/50"              : "bg-[#f0ebe0]/50";
  const live   = light ? "bg-black/60"              : "bg-[#f0ebe0]/60";
  const liveT  = light ? "text-black/25"            : "text-[#f0ebe0]/25";
  const cursor = light ? "text-black/20"            : "text-[#f0ebe0]/20";

  const typeColor = (type: string, isLight: boolean) => {
    if (!isLight) {
      return {
        CALL: "text-[#f0ebe0]/40",   PEEK: "text-amber-400/80",
        MESH: "text-blue-400/80",    SILK: "text-[#f0ebe0]",
        ACTION: "text-emerald-400/80", RESULT: "text-emerald-300",
      }[type] ?? "text-[#f0ebe0]/50";
    }
    return {
      CALL:   "text-black/40",
      PEEK:   "text-amber-700/80",
      MESH:   "text-blue-700/80",
      SILK:   "text-black/80",
      ACTION: "text-emerald-700/80",
      RESULT: "text-emerald-700 font-semibold",
    }[type] ?? "text-black/50";
  };

  const typeLabel = (type: string, isLight: boolean) =>
    type === "RESULT"
      ? isLight ? "text-emerald-700" : "text-emerald-300"
      : isLight ? "text-black/25" : "text-[#f0ebe0]/30";

  return (
    <div className={`border ${border} ${bg} font-mono text-xs leading-relaxed overflow-hidden`}>
      {/* Terminal bar */}
      <div className={`flex items-center gap-1.5 px-4 py-3 border-b ${bar}`}>
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <div className={`w-2.5 h-2.5 rounded-full ${dot}`} />
        <span className={`ml-3 ${label} text-[10px] tracking-widest uppercase`}>
          silk · live observer
        </span>
        <span className={`ml-auto flex items-center gap-1.5 ${liveT} text-[10px]`}>
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${ping}`} />
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${live}`} />
          </span>
          live
        </span>
      </div>

      {/* Events */}
      <div className="px-4 py-4 space-y-2 min-h-[260px]">
        {EVENTS.map((ev, i) => (
          <div
            key={`${cycle}-${i}`}
            className={`flex items-start gap-3 transition-all duration-300 ${
              visible.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
          >
            <span className={`flex-shrink-0 text-[9px] font-bold tracking-widest w-12 pt-px ${typeLabel(ev.type, !!light)}`}>
              {ev.type}
            </span>
            <span className={`${typeColor(ev.type, !!light)} break-all`}>{ev.line}</span>
          </div>
        ))}
        {visible.length > 0 && visible.length < EVENTS.length && (
          <div className={`flex items-center gap-1 ${cursor} text-[10px] pt-1`}>
            <span className="animate-pulse">▋</span>
          </div>
        )}
      </div>
    </div>
  );
}
