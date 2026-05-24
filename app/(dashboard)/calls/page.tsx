import { getCalls, getAgents } from "@/lib/dal";
import { outcomeBorder } from "@/lib/utils";
import type { CallOutcome } from "@/lib/types";
import CallsClient from "./_components/CallsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CallsPage() {
  const [dbCalls, dbAgents] = await Promise.all([getCalls({ limit: 200 }), getAgents()]);

  const total = dbCalls.length;
  const resolved = dbCalls.filter((c) => c.outcome === "resolved").length;
  const escalated = dbCalls.filter((c) => c.outcome === "escalated").length;
  const abandoned = dbCalls.filter((c) => c.outcome === "abandoned").length;
  const empCalls = dbCalls.filter((c) => c.empathyScore > 0);
  const avgEmpathy = empCalls.length
    ? Math.round(empCalls.reduce((s, c) => s + c.empathyScore, 0) / empCalls.length)
    : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest mb-1.5">
          / call logs /
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">call history.</h1>
          <p className="text-xs text-black/40 dark:text-[#e8dece]/40 font-mono hidden sm:block">
            {total} total calls
          </p>
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8">
        {/* Summary strip */}
        <div className="grid grid-cols-3 sm:grid-cols-5 border border-black mb-6 sm:mb-8">
          {[
            { label: "total", value: total },
            { label: "resolved", value: resolved },
            { label: "escalated", value: escalated },
            { label: "abandoned", value: abandoned, hideMobile: true },
            { label: "avg empathy", value: `${avgEmpathy}%`, hideMobile: true },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-4 sm:px-5 py-4 border-r border-black last:border-r-0 ${s.hideMobile ? "hidden sm:block" : ""}`}
            >
              <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-1.5">
                {s.label}
              </p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Client component handles filtering, sorting, pagination */}
        <CallsClient calls={dbCalls} agents={dbAgents} />
      </div>
    </div>
  );
}
