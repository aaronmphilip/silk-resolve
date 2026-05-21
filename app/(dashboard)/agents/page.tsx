import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { getAgents } from "@/lib/dal";
import { AGENTS } from "@/lib/mock-data";
import { statusDot } from "@/lib/utils";
import type { AgentStatus } from "@/lib/types";

const STATUS_ORDER: AgentStatus[] = ["live", "paused", "draft", "error"];

function StatusCount({
  label,
  count,
  active,
}: {
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 border-r border-black last:border-r-0 ${
        active ? "bg-black/5" : ""
      }`}
    >
      <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold">{count}</p>
    </div>
  );
}

export default async function AgentsPage() {
  const dbAgents = await getAgents();
  const agents = dbAgents.length ? dbAgents : AGENTS;

  const live = agents.filter((a) => a.status === "live");
  const paused = agents.filter((a) => a.status === "paused");
  const draft = agents.filter((a) => a.status === "draft");

  const sorted = [...agents].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / agents /
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            deployed agents.
          </h1>
          <Link
            href="/canvas"
            className="flex items-center gap-2 bg-black text-[#f0ebe0] px-4 py-2.5 text-xs font-mono hover:opacity-75 transition-opacity"
          >
            <Plus size={11} />
            new agent
          </Link>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Status strip */}
        <div className="grid grid-cols-4 border border-black mb-8">
          <StatusCount label="live" count={live.length} active={true} />
          <StatusCount label="paused" count={paused.length} active={false} />
          <StatusCount label="draft" count={draft.length} active={false} />
          <StatusCount label="total" count={agents.length} active={false} />
        </div>

        {/* Agents table */}
        <div className="border border-black">
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-3 border-b border-black bg-black/[0.03]">
            <div className="col-span-4">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                agent
              </p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                total calls
              </p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                empathy
              </p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                resolved
              </p>
            </div>
            <div className="col-span-1 text-right">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                nodes
              </p>
            </div>
            <div className="col-span-1 text-right">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                status
              </p>
            </div>
          </div>

          {/* Rows */}
          {sorted.map((agent, i) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-black/5 transition-colors ${
                i < sorted.length - 1 ? "border-b border-black" : ""
              } ${agent.status === "draft" ? "opacity-50" : ""}`}
            >
              {/* Agent name */}
              <div className="col-span-4 flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(agent.status)}`}
                />
                <div>
                  <p className="font-semibold text-sm">{agent.name}</p>
                  <p className="text-[10px] opacity-40 mt-0.5">{agent.client}</p>
                  <div className="flex gap-1 mt-1.5">
                    {agent.pillars.map((p) => (
                      <span
                        key={p}
                        className="text-[8px] font-mono border border-black/25 px-1.5 py-0.5 opacity-50"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="col-span-2 text-right">
                <p className="text-sm font-mono">
                  {agent.stats.totalCalls > 0
                    ? agent.stats.totalCalls.toLocaleString()
                    : "—"}
                </p>
                <p className="text-[9px] opacity-30 font-mono">
                  {agent.stats.callsToday > 0
                    ? `+${agent.stats.callsToday} today`
                    : "no calls today"}
                </p>
              </div>

              <div className="col-span-2 text-right">
                <p className="text-sm font-mono">
                  {agent.stats.empathyScore > 0
                    ? `${agent.stats.empathyScore}%`
                    : "—"}
                </p>
                <p className="text-[9px] opacity-30 font-mono">avg score</p>
              </div>

              <div className="col-span-2 text-right">
                <p className="text-sm font-mono">
                  {agent.stats.resolvedRate > 0
                    ? `${agent.stats.resolvedRate}%`
                    : "—"}
                </p>
                <p className="text-[9px] opacity-30 font-mono">resolution</p>
              </div>

              <div className="col-span-1 text-right">
                <p className="text-sm font-mono">{agent.nodeCount}</p>
              </div>

              <div className="col-span-1 flex justify-end">
                <span
                  className={`text-[10px] font-mono px-2 py-1 border ${
                    agent.status === "live"
                      ? "border-black"
                      : agent.status === "error"
                      ? "border-black font-bold"
                      : "border-black/25"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty draft CTA */}
        <div className="mt-8 border border-dashed border-black/30 px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold opacity-50">
              ready to deploy a new agent?
            </p>
            <p className="text-xs opacity-30 mt-0.5 font-mono">
              open the canvas to map your business logic and deploy in minutes.
            </p>
          </div>
          <Link
            href="/canvas"
            className="flex items-center gap-1.5 text-xs font-mono border border-black px-4 py-2 hover:bg-black hover:text-[#f0ebe0] transition-colors"
          >
            open canvas
            <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </div>
  );
}
