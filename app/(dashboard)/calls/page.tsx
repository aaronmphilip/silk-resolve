import Link from "next/link";
import { getCalls, getAgents } from "@/lib/dal";
import { CALLS, AGENTS, CALL_ANALYSES } from "@/lib/mock-data";
import { outcomeBorder } from "@/lib/utils";
import type { CallOutcome } from "@/lib/types";

export default async function CallsPage() {
  const [dbCalls, dbAgents] = await Promise.all([getCalls(), getAgents()]);
  const calls = dbCalls.length ? dbCalls : CALLS;
  const agents = dbAgents.length ? dbAgents : AGENTS;

  const total = calls.length;
  const resolved = calls.filter((c) => c.outcome === "resolved").length;
  const escalated = calls.filter((c) => c.outcome === "escalated").length;
  const abandoned = calls.filter((c) => c.outcome === "abandoned").length;
  const empCalls = calls.filter((c) => c.empathyScore > 0);
  const avgEmpathy = empCalls.length
    ? Math.round(empCalls.reduce((acc, c) => acc + c.empathyScore, 0) / empCalls.length)
    : 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / call logs /
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">call history.</h1>
          <p className="text-xs opacity-40 font-mono">
            showing {total} calls · today
          </p>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Summary strip */}
        <div className="grid grid-cols-5 border border-black mb-8">
          {[
            { label: "total", value: total },
            { label: "resolved", value: resolved },
            { label: "escalated", value: escalated },
            { label: "abandoned", value: abandoned },
            { label: "avg empathy", value: `${avgEmpathy}%` },
          ].map((s, i) => (
            <div
              key={i}
              className={`px-5 py-4 ${i < 4 ? "border-r border-black" : ""}`}
            >
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
                {s.label}
              </p>
              <p className="text-3xl font-bold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter strip */}
        <div className="flex items-center gap-3 mb-6">
          <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mr-2">
            filter:
          </p>
          {["all", "resolved", "escalated", "abandoned"].map((f) => (
            <button
              key={f}
              className={`text-xs font-mono px-3 py-1.5 border ${
                f === "all"
                  ? "border-black bg-black text-[#f0ebe0]"
                  : "border-black/25 opacity-50 hover:opacity-100 hover:border-black transition-all"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <p className="text-[10px] font-mono opacity-30">agent:</p>
            <select className="text-xs font-mono border border-black/25 bg-transparent px-3 py-1.5 focus:outline-none focus:border-black opacity-60 hover:opacity-100 transition-opacity">
              <option>all agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calls table */}
        <div className="border border-black">
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-3 border-b border-black bg-black/[0.03]">
            {[
              { label: "call id", span: 2 },
              { label: "agent", span: 3 },
              { label: "duration", span: 1 },
              { label: "empathy", span: 1 },
              { label: "outcome", span: 1 },
              { label: "tags", span: 3 },
              { label: "time", span: 1 },
            ].map((col) => (
              <div
                key={col.label}
                className={`col-span-${col.span} ${col.label === "tags" || col.label === "time" ? "" : ""}`}
              >
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                  {col.label}
                </p>
              </div>
            ))}
          </div>

          {/* Rows */}
          {calls.map((call, i) => (
            <Link
              key={call.id}
              href={`/calls/${call.id}`}
              className={`grid grid-cols-12 px-5 py-3.5 items-center hover:bg-black/5 transition-colors ${CALL_ANALYSES[call.id] ? "cursor-pointer" : "cursor-default"} ${
                i < calls.length - 1 ? "border-b border-black" : ""
              } ${call.outcome === "abandoned" ? "opacity-40" : ""}`}
            >
              {/* ID */}
              <div className="col-span-2">
                <p className="text-xs font-mono">{call.id}</p>
              </div>

              {/* Agent */}
              <div className="col-span-3">
                <p className="text-xs font-medium">{call.agentName}</p>
                <p className="text-[9px] opacity-40">{call.client}</p>
              </div>

              {/* Duration */}
              <div className="col-span-1">
                <p className="text-xs font-mono">{call.duration}</p>
              </div>

              {/* Empathy */}
              <div className="col-span-1">
                <p className="text-xs font-mono font-semibold">
                  {call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}
                </p>
              </div>

              {/* Outcome */}
              <div className="col-span-1">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 border inline-block ${outcomeBorder(call.outcome)}`}
                >
                  {call.outcome}
                </span>
              </div>

              {/* Tags */}
              <div className="col-span-3 flex flex-wrap gap-1">
                {call.tags.slice(0, 3).map((t, j) => (
                  <span
                    key={j}
                    className="text-[9px] font-mono bg-black/5 border border-black/10 px-1.5 py-0.5"
                  >
                    {t}
                  </span>
                ))}
                {call.tags.length > 3 && (
                  <span className="text-[9px] font-mono opacity-30">
                    +{call.tags.length - 3}
                  </span>
                )}
              </div>

              {/* Time */}
              <div className="col-span-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-mono opacity-40">
                    {call.timestamp.slice(11, 16)}
                  </p>
                  {CALL_ANALYSES[call.id] && (
                    <span className="text-[8px] font-mono border border-black/30 px-1 opacity-40">
                      analysis
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination stub */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs font-mono opacity-30">
            showing 1–{calls.length} of {calls.length} calls
          </p>
          <div className="flex items-center gap-2">
            <button className="text-xs font-mono border border-black/20 px-3 py-1.5 opacity-30 cursor-not-allowed">
              ← prev
            </button>
            <span className="text-xs font-mono border border-black px-3 py-1.5">
              1
            </span>
            <button className="text-xs font-mono border border-black/20 px-3 py-1.5 opacity-30 cursor-not-allowed">
              next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
