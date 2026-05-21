import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAgents, getCalls, getMetrics } from "@/lib/dal";
import { AGENTS, CALLS, METRICS, RELATIONSHIP_PULSE } from "@/lib/mock-data";
import { statusDot, outcomeBorder } from "@/lib/utils";

export default async function DashboardPage() {
  // Try real DB first; fall back to mock data if empty
  const [dbAgents, dbCalls, dbMetrics] = await Promise.all([
    getAgents(), getCalls({ limit: 5 }), getMetrics(),
  ]);

  const agents = dbAgents.length ? dbAgents : AGENTS;
  const recentCalls = dbCalls.length ? dbCalls : CALLS.slice(0, 5);
  const metrics = dbCalls.length ? dbMetrics : METRICS;

  return (
    <div className="min-h-screen">
      <div className="fixed top-3 right-4 pointer-events-none select-none opacity-[0.1] font-mono text-[10px] leading-relaxed text-right z-0">
        <div>11111111</div><div>111011 1</div><div>000 10</div><div>11111</div><div>0001111</div><div>0000000</div>
      </div>

      <div className="border-b border-black px-8 py-6 relative z-10">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ overview /</p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">resolution infrastructure.</h1>
          <p className="text-xs opacity-40 font-mono">Wed 21 May 2026 · 14:34 IST</p>
        </div>
      </div>

      <div className="px-8 py-8 relative z-10">
        {/* Metrics */}
        <div className="grid grid-cols-4 border border-black mb-10">
          {metrics.map((m, i) => (
            <div key={i} className={`px-6 py-5 ${i < 3 ? "border-r border-black" : ""}`}>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2.5">{m.label}</p>
              <p className="text-4xl font-bold tracking-tight leading-none">{m.value}</p>
              <p className="text-[10px] opacity-30 mt-2 font-mono">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Agents + Recent calls */}
        <div className="grid grid-cols-5 gap-8 mb-10">
          <div className="col-span-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">deployed agents</p>
              <Link href="/agents" className="text-[10px] font-mono underline opacity-50 hover:opacity-100 transition-opacity">view all →</Link>
            </div>
            <div className="border border-black">
              {agents.filter((a) => a.status !== "draft").map((a, i, arr) => (
                <Link key={a.id} href={`/agents/${a.id}`}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-black/5 transition-colors ${i < arr.length - 1 ? "border-b border-black" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(a.status)}`} />
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-[10px] opacity-40 mt-0.5">{a.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-7">
                    <div className="text-right"><p className="text-sm font-mono">{a.stats.callsToday.toLocaleString()}</p><p className="text-[9px] opacity-30 font-mono">today</p></div>
                    <div className="text-right"><p className="text-sm font-mono">{a.stats.empathyScore > 0 ? `${a.stats.empathyScore}%` : "—"}</p><p className="text-[9px] opacity-30 font-mono">empathy</p></div>
                    <div className="text-right"><p className="text-sm font-mono">{a.nodeCount}</p><p className="text-[9px] opacity-30 font-mono">nodes</p></div>
                    <span className={`text-[10px] font-mono px-2 py-1 border ${a.status === "live" ? "border-black" : "border-black/25 opacity-40"}`}>{a.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">recent resolutions</p>
              <Link href="/calls" className="text-[10px] font-mono underline opacity-50 hover:opacity-100 transition-opacity">view all →</Link>
            </div>
            <div className="border border-black">
              {recentCalls.map((r, i) => (
                <div key={r.id} className={`px-5 py-4 ${i < recentCalls.length - 1 ? "border-b border-black" : ""}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono opacity-40">{r.id}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(r.outcome)}`}>{r.outcome}</span>
                  </div>
                  <p className="text-xs font-medium">{r.agentName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] opacity-35 font-mono">{r.duration}</span>
                    <span className="text-[10px] opacity-20">·</span>
                    <span className="text-[10px] font-mono font-semibold">{r.empathyScore > 0 ? `${r.empathyScore}%` : "—"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.map((t, j) => (
                      <span key={j} className="text-[9px] font-mono bg-black/5 border border-black/10 px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Relationship Pulse */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">relationship pulse</p>
              <p className="text-[11px] opacity-40 font-mono">/ humanity measurement · last 4 interactions /</p>
            </div>
            <Link href="/mesh" className="text-[10px] font-mono underline opacity-50 hover:opacity-100 transition-opacity">view all souls →</Link>
          </div>
          <div className="grid grid-cols-4 border border-black">
            {RELATIONSHIP_PULSE.map((p, i) => (
              <Link key={p.callId} href={`/mesh/${p.userId}`}
                className={`px-5 py-5 hover:bg-black/5 transition-colors ${i < 3 ? "border-r border-black" : ""}`}>
                <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">{p.name.split(" ")[0]}</p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono opacity-50">{p.before}</span>
                  <span className="text-[10px] opacity-25">→</span>
                  <span className="text-xs font-bold">{p.after}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-1 flex-1 bg-black/10 mr-3"><div className="h-1 bg-black" style={{ width: `${p.empathy}%` }} /></div>
                  <span className="text-[10px] font-mono font-bold">{p.empathy}%</span>
                </div>
                <p className="text-[9px] font-mono opacity-25 mt-1.5">{p.callId} · debt {p.debtDelta > 0 ? "+" : ""}{p.debtDelta}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Three pillars */}
        <p className="text-sm opacity-45 mb-0">this requires mastering 3 essentials:</p>
        <div className="grid grid-cols-3 border border-black mb-8">
          {[
            { num: "1.", name: "voice", codename: "/ codename: silk /", desc: "Emotional reactor. Injects mid-sentence prosody tags — <whisper>, <warm>, <apologetic> — matched to user tension level in real-time." },
            { num: "2.", name: "memory", codename: "/ codename: mesh /", desc: "Relationship vault. Recalls emotional debt from past interactions to calibrate today's greeting and escalation threshold." },
            { num: "3.", name: "context", codename: "/ codename: peek /", desc: 'Intent radar. Identifies when "Theek hai" means frustrated. Triggers high-priority workflows before explicit complaint.' },
          ].map((p, i) => (
            <div key={i} className={`px-7 py-6 ${i < 2 ? "border-r border-black" : ""}`}>
              <div className="mb-1"><span className="text-3xl font-bold">{p.num} </span><span className="text-3xl font-bold">{p.name}</span></div>
              <p className="text-[10px] font-mono opacity-30 mb-4">{p.codename}</p>
              <p className="text-sm opacity-50 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick launch */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/canvas" className="flex items-center justify-between p-5 border border-black hover:bg-black/5 transition-colors group">
            <div><p className="font-semibold text-sm">open logic canvas</p><p className="text-xs opacity-40 mt-0.5">build & deploy a new agent workflow</p></div>
            <ArrowUpRight size={15} className="opacity-25 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link href="/observer" className="flex items-center justify-between p-5 border border-black hover:bg-black/5 transition-colors group">
            <div><p className="font-semibold text-sm">live observer</p><p className="text-xs opacity-40 mt-0.5">watch peek · mesh · silk fire in real-time</p></div>
            <ArrowUpRight size={15} className="opacity-25 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>
      </div>
    </div>
  );
}
