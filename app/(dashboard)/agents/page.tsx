import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { getAgents } from "@/lib/dal";
import { statusDot } from "@/lib/utils";
import type { AgentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_ORDER: AgentStatus[] = ["live", "paused", "draft", "error"];

export default async function AgentsPage() {
  const agents = await getAgents();
  const live   = agents.filter(a => a.status === "live");
  const paused = agents.filter(a => a.status === "paused");
  const draft  = agents.filter(a => a.status === "draft");
  const sorted = [...agents].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b-2 border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-1.5">/ agents /</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">deployed agents.</h1>
          <Link href="/agents/new"
            className="flex items-center gap-2 bg-black text-[#e8dece] px-4 sm:px-5 py-2.5 text-xs font-mono hover:opacity-75 transition-opacity whitespace-nowrap">
            <Plus size={11} /> new agent
          </Link>
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-black mb-6 sm:mb-8">
          {[
            { label: "live",   count: live.length },
            { label: "paused", count: paused.length },
            { label: "draft",  count: draft.length },
            { label: "total",  count: agents.length },
          ].map((s, i) => (
            <div key={s.label} className={`px-5 py-4 ${i % 2 === 0 ? "border-r border-black" : ""} ${i < 2 ? "border-b sm:border-b-0 border-black" : ""} sm:border-r sm:last:border-r-0`}>
              <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.count}</p>
            </div>
          ))}
        </div>

        {agents.length === 0 ? (
          <div className="border-2 border-dashed border-black/30 px-8 py-16 text-center">
            <p className="text-sm font-semibold text-black/50">no agents yet</p>
            <p className="text-xs text-black/40 mt-1 font-mono">create your first agent to start taking calls</p>
            <Link href="/agents/new"
              className="inline-flex items-center gap-2 mt-5 text-xs font-mono border-2 border-black px-5 py-2.5 hover:bg-black hover:text-[#e8dece] transition-colors">
              <Plus size={11} /> create agent
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block border-2 border-black">
              <div className="grid grid-cols-12 px-5 py-3 border-b-2 border-black bg-black/[0.04]">
                {[
                  { label: "agent",       span: 4 },
                  { label: "calls",       span: 2 },
                  { label: "empathy",     span: 2 },
                  { label: "resolved",    span: 2 },
                  { label: "handle time", span: 1 },
                  { label: "status",      span: 1 },
                ].map(col => (
                  <div key={col.label} className={`col-span-${col.span} ${col.span < 4 ? "text-right" : ""}`}>
                    <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest font-semibold">{col.label}</p>
                  </div>
                ))}
              </div>

              {sorted.map((agent, i) => (
                <Link key={agent.id} href={`/agents/${agent.id}`}
                  className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-black/5 transition-colors ${i < sorted.length - 1 ? "border-b border-black" : ""} ${agent.status === "draft" ? "opacity-60" : ""}`}>
                  <div className="col-span-4 flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(agent.status)}`} />
                    <div>
                      <p className="font-semibold text-sm text-black">{agent.name}</p>
                      <p className="text-[11px] text-black/50 mt-0.5">{agent.client}</p>
                      <div className="flex gap-1 mt-1.5">
                        {["PEEK", "MESH", "SILK", "ACTION"].map(p => (
                          <span key={p} className="text-[8px] font-mono border border-black/30 px-1.5 py-0.5 text-black/50">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-mono text-black">{agent.stats.totalCalls > 0 ? agent.stats.totalCalls.toLocaleString() : "—"}</p>
                    <p className="text-[10px] text-black/40 font-mono">{agent.stats.callsToday > 0 ? `+${agent.stats.callsToday} today` : "no calls today"}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-mono text-black">{agent.stats.empathyScore > 0 ? `${agent.stats.empathyScore}%` : "—"}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-mono text-black">{agent.stats.resolvedRate > 0 ? `${agent.stats.resolvedRate}%` : "—"}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-sm font-mono text-black">{agent.stats.avgHandleTime}</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <span className={`text-[10px] font-mono px-2 py-1 border font-semibold ${
                      agent.status === "live" ? "border-black bg-black text-[#e8dece]" :
                      agent.status === "paused" ? "border-black/40 text-black/60" :
                      "border-black/20 text-black/40"
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {sorted.map((agent) => (
                <Link key={agent.id} href={`/agents/${agent.id}`}
                  className={`block border-2 border-black p-4 hover:bg-black/5 transition-colors ${agent.status === "draft" ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${statusDot(agent.status)}`} />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-black truncate">{agent.name}</p>
                        <p className="text-[11px] text-black/50 mt-0.5 truncate">{agent.client}</p>
                        <div className="flex gap-1 mt-2">
                          {["PEEK", "MESH", "SILK", "ACTION"].map(p => (
                            <span key={p} className="text-[8px] font-mono border border-black/30 px-1.5 py-0.5 text-black/50">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 border font-semibold flex-shrink-0 ${
                      agent.status === "live" ? "border-black bg-black text-[#e8dece]" :
                      agent.status === "paused" ? "border-black/40 text-black/60" :
                      "border-black/20 text-black/40"
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-black/10">
                    <div>
                      <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">calls</p>
                      <p className="text-sm font-bold text-black mt-0.5">{agent.stats.totalCalls > 0 ? agent.stats.totalCalls.toLocaleString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">empathy</p>
                      <p className="text-sm font-bold text-black mt-0.5">{agent.stats.empathyScore > 0 ? `${agent.stats.empathyScore}%` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">resolved</p>
                      <p className="text-sm font-bold text-black mt-0.5">{agent.stats.resolvedRate > 0 ? `${agent.stats.resolvedRate}%` : "—"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mt-6 sm:mt-8 border-2 border-dashed border-black/25 px-5 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-black/50">deploy a new agent</p>
            <p className="text-xs text-black/40 mt-0.5 font-mono">PEEK + MESH + SILK are always active. You configure the prompt and tools.</p>
          </div>
          <Link href="/canvas"
            className="flex items-center gap-1.5 text-xs font-mono border-2 border-black px-4 py-2 hover:bg-black hover:text-[#e8dece] transition-colors whitespace-nowrap">
            open canvas <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
