import Link from "next/link";
import { getCalls, getCallAnalysis } from "@/lib/dal";
import { outcomeBorder } from "@/lib/utils";
import CallHeatmap from "@/components/analytics/CallHeatmap";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Mini SVG heatmap — no extra component overhead
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
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="opacity-60 dark:opacity-50">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default async function AnalyticsPage() {
  const allCalls = await getCalls({ limit: 100 });

  const total = allCalls.length;
  const resolved = allCalls.filter((c) => c.outcome === "resolved").length;
  const empathyCalls = allCalls.filter((c) => c.empathyScore > 0);
  const avgEmpathy = empathyCalls.length
    ? Math.round(empathyCalls.reduce((s, c) => s + c.empathyScore, 0) / empathyCalls.length)
    : 0;
  const optimalCalls = allCalls.filter((c) => c.empathyScore >= 85).length;
  const deEscRate = total ? Math.round((resolved / total) * 100) : 0;

  // Best resolved call for the featured heatmap
  const bestCall = allCalls.find((c) => c.outcome === "resolved" && c.empathyScore > 0) ?? null;
  const bestAnalysis = bestCall ? await getCallAnalysis(bestCall.id) : null;

  // Recent calls (last 10) for the list
  const recentCalls = allCalls.slice(0, 10);

  const isEmpty = total === 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-1.5">
          / analytics /
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">emotional analytics.</h1>
          <p className="text-xs text-black/40 dark:text-[#e8dece]/40 font-mono hidden sm:block">
            / peek · mesh · sentiment health /
          </p>
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8">

        {/* ── Empty state ── */}
        {isEmpty && (
          <div className="border border-black px-6 py-12 text-center mb-8">
            <p className="text-sm font-mono text-black/30 dark:text-[#e8dece]/30">
              no call data yet — run a test call to start building analytics
            </p>
            <Link href="/test-call"
              className="inline-flex items-center gap-2 mt-4 text-xs font-mono border border-black dark:border-[#e8dece]/40 px-4 py-2.5 hover:bg-black hover:text-[#e8dece] dark:hover:bg-[#e8dece] dark:hover:text-[#0a0a0a] transition-colors">
              start test call →
            </Link>
          </div>
        )}

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-black mb-8 sm:mb-10">
          {[
            { label: "total calls",        value: String(total)  },
            { label: "de-escalation rate", value: `${deEscRate}%` },
            { label: "avg empathy",        value: avgEmpathy > 0 ? `${avgEmpathy}%` : "—" },
            { label: "optimal calls",      value: String(optimalCalls), sub: "empathy ≥ 85%" },
          ].map((m, i) => (
            <div key={m.label} className={`px-4 sm:px-6 py-5 border-r border-black last:border-r-0 ${i < 2 ? "border-b sm:border-b-0 border-black" : ""}`}>
              <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-2.5">{m.label}</p>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight leading-none">{m.value}</p>
              {m.sub && <p className="text-[10px] text-black/30 dark:text-[#e8dece]/30 mt-2 font-mono">{m.sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Featured heatmap (best resolved call with deep analysis) ── */}
        {bestAnalysis && bestCall && (
          <div className="border border-black mb-8 sm:mb-10">
            <div className="px-5 sm:px-6 py-4 border-b border-black flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-1">
                  emotional heatmap · featured call
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-sm">{bestCall.id}</span>
                  <span className="text-xs text-black/40 dark:text-[#e8dece]/40">{bestCall.agentName}</span>
                  <span className="text-xs font-mono">{bestCall.duration}</span>
                  <span className="text-xs font-mono font-bold">{bestCall.empathyScore}% empathy</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(bestCall.outcome)}`}>
                    {bestCall.outcome}
                  </span>
                </div>
              </div>
              <Link
                href={`/calls/${bestCall.id}`}
                className="text-xs font-mono border border-black dark:border-[#e8dece]/40 px-3 py-1.5 hover:bg-black hover:text-[#e8dece] dark:hover:bg-[#e8dece] dark:hover:text-[#0a0a0a] transition-colors flex-shrink-0"
              >
                full analysis →
              </Link>
            </div>
            <div className="px-5 sm:px-6 py-5">
              <CallHeatmap data={bestAnalysis.heatmap} height={140} />
            </div>
          </div>
        )}

        {/* ── Recent calls list ── */}
        {recentCalls.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest">
                recent calls
              </p>
              <Link href="/calls" className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 hover:text-black dark:hover:text-[#e8dece] transition-colors underline">
                view all →
              </Link>
            </div>
            <div className="border border-black">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-12 px-5 py-3 border-b border-black bg-black/[0.03] dark:bg-[#e8dece]/[0.03]">
                {[
                  { label: "call id",   span: "col-span-2" },
                  { label: "agent",     span: "col-span-3" },
                  { label: "duration",  span: "col-span-2" },
                  { label: "empathy",   span: "col-span-2" },
                  { label: "outcome",   span: "col-span-2" },
                  { label: "time",      span: "col-span-1" },
                ].map((c) => (
                  <div key={c.label} className={c.span}>
                    <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest">{c.label}</p>
                  </div>
                ))}
              </div>

              {recentCalls.map((call, i) => (
                <Link
                  key={call.id}
                  href={`/calls/${call.id}`}
                  className={`flex sm:grid sm:grid-cols-12 px-5 py-3.5 items-center gap-3 sm:gap-0 hover:bg-black/[0.03] dark:hover:bg-[#e8dece]/[0.03] transition-colors ${
                    i < recentCalls.length - 1 ? "border-b border-black" : ""
                  }`}
                >
                  <div className="col-span-2 min-w-0">
                    <p className="text-xs font-mono text-black/60 dark:text-[#e8dece]/60 truncate">{call.id.slice(0, 16)}</p>
                  </div>
                  <div className="col-span-3 flex-1 sm:flex-none min-w-0">
                    <p className="text-xs font-medium truncate">{call.agentName}</p>
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <p className="text-xs font-mono">{call.duration}</p>
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <p className="text-xs font-mono font-bold">{call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(call.outcome)}`}>{call.outcome}</span>
                  </div>
                  <div className="col-span-1 hidden sm:block">
                    <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40">{call.timestamp?.slice(11, 16)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
