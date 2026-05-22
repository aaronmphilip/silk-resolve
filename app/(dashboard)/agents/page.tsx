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
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ agents /</p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">deployed agents.</h1>
          <Link href="/agents/new"
            className="flex items-center gap-2 bg-black text-[#f0ebe0] px-5 py-2.5 rounded-full text-xs font-mono hover:opacity-75 transition-opacity">
            <Plus size={11} /> new agent
          </Link>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-4 border border-black mb-8">
          {[
            { label: "live",   count: live.length },
            { label: "paused", count: paused.length },
            { label: "draft",  count: draft.length },
            { label: "total",  count: agents.length },
          ].map((s, i) => (
            <div key={s.label} className={`px-5 py-4 ${i < 3 ? "border-r border-black" : ""}`}>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.count}</p>
            </div>
          ))}
        </div>

        {agents.length === 0 ? (
          <div className="border border-dashed border-black/30 px-8 py-16 text-center">
            <p className="text-sm font-semibold opacity-40">no agents yet</p>
            <p className="text-xs opacity-25 mt-1 font-mono">create your first agent to start taking calls</p>
            <Link href="/agents/new"
              className="inline-flex items-center gap-2 mt-5 text-xs font-mono border border-black px-5 py-2.5 hover:bg-black hover:text-[#f0ebe0] transition-colors">
              <Plus size={11} /> create agent
            </Link>
          </div>
        ) : (
          <div className="border border-black">
            <div className="grid grid-cols-12 px-5 py-3 border-b border-black bg-black/[0.03]">
              {[
                { label: "agent",     span: 4 },
                { label: "calls",     span: 2 },
                { label: "empathy",   span: 2 },
                { label: "resolved",  span: 2 },
                { label: "handle time", span: 1 },
                { label: "status",    span: 1 },
              ].map(col => (
                <div key={col.label} className={`col-span-${col.span} ${col.span < 4 ? "text-right" : ""}`}>
                  <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">{col.label}</p>
                </div>
              ))}
            </div>

            {sorted.map((agent, i) => (
              <Link key={agent.id} href={`/agents/${agent.id}`}
                className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-black/5 transition-colors ${i < sorted.length - 1 ? "border-b border-black" : ""} ${agent.status === "draft" ? "opacity-50" : ""}`}>
                <div className="col-span-4 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(agent.status)}`} />
                  <div>
                    <p className="font-semibold text-sm">{agent.name}</p>
                    <p className="text-[10px] opacity-40 mt-0.5">{agent.client}</p>
                    <div className="flex gap-1 mt-1.5">
                      {/* PEEK + MESH are always on — show as permanent badges */}
                      {["PEEK", "MESH", "SILK", "ACTION"].map(p => (
                        <span key={p} className="text-[8px] font-mono border border-black/25 px-1.5 py-0.5 opacity-50">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-mono">{agent.stats.totalCalls > 0 ? agent.stats.totalCalls.toLocaleString() : "—"}</p>
                  <p className="text-[9px] opacity-30 font-mono">{agent.stats.callsToday > 0 ? `+${agent.stats.callsToday} today` : "no calls today"}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-mono">{agent.stats.empathyScore > 0 ? `${agent.stats.empathyScore}%` : "—"}</p>
                </div>
                <div className="col-span-2 text-right">
                  <p className="text-sm font-mono">{agent.stats.resolvedRate > 0 ? `${agent.stats.resolvedRate}%` : "—"}</p>
                </div>
                <div className="col-span-1 text-right">
                  <p className="text-sm font-mono">{agent.stats.avgHandleTime}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <span className={`text-[10px] font-mono px-2 py-1 border ${agent.status === "live" ? "border-black" : "border-black/25"}`}>
                    {agent.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 border border-dashed border-black/25 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-40">deploy a new agent</p>
            <p className="text-xs opacity-25 mt-0.5 font-mono">PEEK + MESH + SILK are always active. You configure the prompt and tools.</p>
          </div>
          <Link href="/canvas"
            className="flex items-center gap-1.5 text-xs font-mono border border-black px-4 py-2 hover:bg-black hover:text-[#f0ebe0] transition-colors">
            open canvas <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
