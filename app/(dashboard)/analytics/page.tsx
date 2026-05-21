import Link from "next/link";
import { CALLS, CALL_ANALYSES } from "@/lib/mock-data";
import { outcomeBorder } from "@/lib/utils";
import CallHeatmap from "@/components/analytics/CallHeatmap";

// Calls that have full analysis data
const ANALYSED_CALLS = CALLS.filter((c) => CALL_ANALYSES[c.id]);

// Mini heatmap — inline SVG (no component overhead)
function MiniHeatmap({ points }: { points: { t: number; tension: number }[] }) {
  if (points.length < 2) return null;
  const W = 120, H = 30;
  const maxT = points[points.length - 1].t;
  const toX = (t: number) => 2 + (t / maxT) * (W - 4);
  const toY = (v: number) => H - 2 - (v / 100) * (H - 4);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)},${toY(p.tension).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="opacity-70">
      <path d={d} fill="none" stroke="#0a0a0a" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function AnalyticsPage() {
  const avgTensionStart = Math.round(
    ANALYSED_CALLS.reduce((s, c) => s + (CALL_ANALYSES[c.id]?.heatmap[0]?.tension ?? 0), 0) /
      ANALYSED_CALLS.length
  );
  const avgTensionEnd = Math.round(
    ANALYSED_CALLS.reduce(
      (s, c) => {
        const h = CALL_ANALYSES[c.id]?.heatmap;
        return s + (h ? h[h.length - 1].tension : 0);
      },
      0
    ) / ANALYSED_CALLS.length
  );
  const deEscRate = Math.round(
    (CALLS.filter((c) => c.outcome === "resolved").length / CALLS.length) * 100
  );
  const optimalCalls = CALLS.filter((c) => c.empathyScore >= 93).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / analytics /
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            emotional analytics.
          </h1>
          <p className="text-xs opacity-40 font-mono">
            / the silk mesh · sentiment health /
          </p>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Sentiment summary */}
        <div className="grid grid-cols-4 border border-black mb-10">
          {[
            {
              label: "avg tension · start",
              value: `${avgTensionStart}%`,
              sub: "across all ingress calls",
            },
            {
              label: "avg tension · end",
              value: `${avgTensionEnd}%`,
              sub: `↓ ${avgTensionStart - avgTensionEnd}% de-escalation`,
            },
            {
              label: "de-escalation rate",
              value: `${deEscRate}%`,
              sub: "first-call resolution",
            },
            {
              label: "optimal calls",
              value: String(optimalCalls),
              sub: "empathy score ≥ 93%",
            },
          ].map((m, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < 3 ? "border-r border-black" : ""}`}
            >
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2.5">
                {m.label}
              </p>
              <p className="text-4xl font-bold tracking-tight leading-none">
                {m.value}
              </p>
              <p className="text-[10px] opacity-30 mt-2 font-mono">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Featured heatmap — most recent resolved call with analysis */}
        {(() => {
          const featured = ANALYSED_CALLS.find((c) => c.outcome === "resolved");
          if (!featured) return null;
          const analysis = CALL_ANALYSES[featured.id];
          return (
            <div className="border border-black mb-10">
              <div className="px-6 py-4 border-b border-black flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">
                    emotional heatmap · featured call
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm">{featured.id}</span>
                    <span className="text-xs opacity-40">{featured.agentName}</span>
                    <span className="text-xs font-mono">{featured.duration}</span>
                    <span className="text-xs font-mono font-bold">
                      {featured.empathyScore}% final empathy
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(featured.outcome)}`}
                    >
                      {featured.outcome}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/calls/${featured.id}`}
                  className="text-xs font-mono border border-black px-3 py-1.5 hover:bg-black hover:text-[#f0ebe0] transition-colors"
                >
                  full analysis →
                </Link>
              </div>
              <div className="px-6 py-5">
                <CallHeatmap data={analysis.heatmap} height={140} />
              </div>
              {/* Event annotations */}
              <div className="px-6 pb-5 flex flex-wrap gap-3">
                {analysis.heatmap
                  .filter((p) => p.event)
                  .map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 border border-black/20 px-3 py-1.5"
                    >
                      <span className="text-[9px] font-mono font-bold bg-black text-[#f0ebe0] px-1.5 py-0.5">
                        {p.event}
                      </span>
                      <span className="text-[10px] font-mono opacity-50">
                        {p.t}s
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {p.eventLabel}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })()}

        {/* Call list with mini heatmaps */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
            calls with analysis
          </p>
          <Link
            href="/calls"
            className="text-[10px] font-mono underline opacity-40 hover:opacity-100 transition-opacity"
          >
            view all calls →
          </Link>
        </div>
        <div className="border border-black">
          {ANALYSED_CALLS.map((call, i) => {
            const analysis = CALL_ANALYSES[call.id];
            const heatPts = analysis.heatmap.map((p) => ({
              t: p.t,
              tension: p.tension,
            }));
            const startTension = analysis.heatmap[0]?.tension ?? 0;
            const endTension =
              analysis.heatmap[analysis.heatmap.length - 1]?.tension ?? 0;
            return (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className={`flex items-center justify-between px-5 py-4 hover:bg-black/5 transition-colors ${
                  i < ANALYSED_CALLS.length - 1 ? "border-b border-black" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-mono opacity-40">{call.id}</p>
                    <p className="text-sm font-semibold mt-0.5">{call.agentName}</p>
                    <p className="text-[10px] opacity-35">{call.client}</p>
                  </div>
                </div>

                {/* Mini heatmap */}
                <div className="flex-1 flex justify-center px-8">
                  <MiniHeatmap points={heatPts} />
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs font-mono">
                      {startTension}% → {endTension}%
                    </p>
                    <p className="text-[9px] opacity-30 font-mono">tension arc</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold">
                      {call.empathyScore}%
                    </p>
                    <p className="text-[9px] opacity-30 font-mono">final empathy</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(call.outcome)}`}
                  >
                    {call.outcome}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Ingress analysis summary */}
        <div className="mt-10">
          <div className="mb-4">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
              ingress analysis · environment breakdown
            </p>
            <p className="text-xs opacity-40 mt-0.5 font-mono">
              / first-5-seconds pitch · jitter · environment detection /
            </p>
          </div>
          <div className="border border-black">
            <div className="grid grid-cols-5 px-5 py-3 border-b border-black bg-black/[0.03]">
              {["call id", "environment", "pitch (hz)", "jitter (ms)", "confidence"].map((h) => (
                <p key={h} className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                  {h}
                </p>
              ))}
            </div>
            {ANALYSED_CALLS.map((call, i) => {
              const ia = CALL_ANALYSES[call.id]?.ingressAnalysis;
              if (!ia) return null;
              return (
                <div
                  key={call.id}
                  className={`grid grid-cols-5 px-5 py-3.5 items-center ${
                    i < ANALYSED_CALLS.length - 1 ? "border-b border-black" : ""
                  }`}
                >
                  <p className="text-xs font-mono">{call.id}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono border border-black/25 px-2 py-0.5 opacity-60">
                      {ia.environment.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs font-mono">{ia.pitch} Hz</p>
                  <p className="text-xs font-mono">{ia.jitter} ms</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-16 bg-black/10">
                      <div
                        className="h-1 bg-black"
                        style={{ width: `${ia.confidence * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono opacity-50">
                      {(ia.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
