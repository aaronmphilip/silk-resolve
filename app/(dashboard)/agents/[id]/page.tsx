import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Eye } from "lucide-react";
import { AGENTS, CALLS } from "@/lib/mock-data";
import { statusDot, outcomeBorder } from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return AGENTS.map((a) => ({ id: a.id }));
}

export default function AgentDetailPage({ params }: PageProps) {
  const agent = AGENTS.find((a) => a.id === params.id);
  if (!agent) notFound();

  const agentCalls = CALLS.filter((c) => c.agentId === agent.id);

  const statCards = [
    {
      label: "total calls",
      value: agent.stats.totalCalls.toLocaleString(),
      sub: `+${agent.stats.callsToday} today`,
    },
    {
      label: "empathy score",
      value:
        agent.stats.empathyScore > 0 ? `${agent.stats.empathyScore}%` : "—",
      sub: "avg across all calls",
    },
    {
      label: "resolved rate",
      value:
        agent.stats.resolvedRate > 0 ? `${agent.stats.resolvedRate}%` : "—",
      sub: "autonomous resolutions",
    },
    {
      label: "avg handle time",
      value: agent.stats.avgHandleTime,
      sub: "per call",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-5">
        <Link
          href="/agents"
          className="flex items-center gap-2 text-xs font-mono opacity-40 hover:opacity-100 transition-opacity mb-4"
        >
          <ArrowLeft size={11} />
          back to agents
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot(agent.status)}`}
              />
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
                / {agent.id} /
              </p>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
            <p className="text-sm opacity-40 mt-1">{agent.client}</p>
            {agent.description && (
              <p className="text-xs opacity-50 mt-2 max-w-lg leading-relaxed">
                {agent.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/observer"
              className="flex items-center gap-2 text-xs font-mono border border-black px-4 py-2.5 hover:bg-black/5 transition-colors"
            >
              <Eye size={11} />
              observer
            </Link>
            <Link
              href="/canvas"
              className="flex items-center gap-2 text-xs font-mono bg-black text-[#f0ebe0] px-4 py-2.5 hover:opacity-75 transition-opacity"
            >
              open canvas
              <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 border border-black mb-8">
          {statCards.map((s, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < 3 ? "border-r border-black" : ""}`}
            >
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">
                {s.label}
              </p>
              <p className="text-4xl font-bold tracking-tight leading-none">
                {s.value}
              </p>
              <p className="text-[10px] opacity-30 mt-2 font-mono">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Calls table */}
          <div className="col-span-2">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
              recent calls
            </p>
            {agentCalls.length === 0 ? (
              <div className="border border-black px-6 py-10 text-center">
                <p className="text-xs opacity-30 font-mono">no calls yet.</p>
              </div>
            ) : (
              <div className="border border-black">
                {agentCalls.map((call, i) => (
                  <div
                    key={call.id}
                    className={`px-5 py-4 ${
                      i < agentCalls.length - 1 ? "border-b border-black" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono opacity-40">
                        {call.id}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono opacity-40">
                          {call.timestamp.slice(11, 16)}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(call.outcome)}`}
                        >
                          {call.outcome}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono opacity-50">
                        {call.duration}
                      </span>
                      <span className="text-xs font-mono font-semibold">
                        {call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {call.tags.map((t, j) => (
                        <span
                          key={j}
                          className="text-[9px] font-mono bg-black/5 border border-black/10 px-1.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent config */}
          <div className="col-span-1">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
              configuration
            </p>
            <div className="border border-black">
              <div className="px-5 py-4 border-b border-black">
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-2">
                  active pillars
                </p>
                <div className="space-y-2">
                  {(["PEEK", "MESH", "SILK", "ACTION"] as const).map((p) => {
                    const active = agent.pillars.includes(p);
                    return (
                      <div
                        key={p}
                        className={`flex items-center justify-between ${
                          !active ? "opacity-25" : ""
                        }`}
                      >
                        <span className="text-xs font-mono font-bold">{p}</span>
                        <span className="text-[10px] font-mono opacity-50">
                          {active ? "active" : "inactive"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="px-5 py-4 border-b border-black">
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-2">
                  workflow
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-60">nodes</span>
                  <span className="text-xs font-mono">{agent.nodeCount}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-60">created</span>
                  <span className="text-xs font-mono">{agent.createdAt}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs opacity-60">last active</span>
                  <span className="text-xs font-mono">{agent.lastActive}</span>
                </div>
              </div>

              {agent.webhookUrl && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-2">
                    webhook
                  </p>
                  <p className="text-[10px] font-mono opacity-50 break-all leading-relaxed">
                    {agent.webhookUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
