import Link from "next/link";
import { ArrowUpRight, Plus, PhoneCall, Sparkles } from "lucide-react";
import { getAgents, getCalls, getMetrics } from "@/lib/dal";
import { statusDot, outcomeBorder } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [agents, recentCalls, metrics] = await Promise.all([
    getAgents(),
    getCalls({ limit: 5 }),
    getMetrics(),
  ]);

  const liveAgents = agents.filter(a => a.status !== "draft");
  const isEmpty = agents.length === 0;

  return (
    <div className="min-h-screen">
      <div className="border-b-2 border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-1.5">/ overview /</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">resolution infrastructure.</h1>
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8">

        {/* ── First-time empty state ── */}
        {isEmpty && (
          <div className="border-2 border-black mb-8">
            <div className="bg-black px-6 py-4">
              <p className="text-sm font-bold text-[#e8dece]">get started in 3 steps</p>
              <p className="text-[11px] text-[#e8dece]/50 font-mono mt-0.5">Your workspace is ready — here&apos;s what to do first.</p>
            </div>
            <div className="divide-y-2 divide-black">
              {[
                {
                  num: "01", done: false,
                  label: "Add your API keys",
                  hint: "Add VAPI_PRIVATE_KEY and XAI_API_KEY to your Vercel environment variables.",
                  href: "/admin/tenants",
                  cta: "go to admin →",
                },
                {
                  num: "02", done: false,
                  label: "Create your first agent",
                  hint: "3 fields. AI writes the system prompt for you.",
                  href: "/agents/new",
                  cta: "create agent →",
                },
                {
                  num: "03", done: false,
                  label: "Test with the Talk button",
                  hint: "Browser call — no phone number needed.",
                  href: "/test-call",
                  cta: "try test call →",
                },
              ].map(step => (
                <div key={step.num} className="flex items-center justify-between px-6 py-4 hover:bg-black/[0.03] transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold font-mono text-black/15 w-8 flex-shrink-0">{step.num}</span>
                    <div>
                      <p className="text-sm font-semibold text-black">{step.label}</p>
                      <p className="text-[11px] text-black/50 mt-0.5">{step.hint}</p>
                    </div>
                  </div>
                  <Link href={step.href}
                    className="text-xs font-mono text-black/50 hover:text-black border border-black/20 hover:border-black px-3 py-1.5 transition-all whitespace-nowrap flex-shrink-0">
                    {step.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-2 border-black mb-6 sm:mb-8">
          {metrics.length > 0 ? metrics.map((m, i) => (
            <div key={i} className={`px-5 py-5 ${i % 2 === 0 ? "border-r border-black" : ""} ${i < 2 ? "border-b sm:border-b-0 border-black" : ""} sm:border-r sm:last:border-r-0`}>
              <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-2">{m.label}</p>
              <p className="text-3xl font-bold tracking-tight leading-none">{m.value}</p>
              <p className="text-[10px] text-black/30 mt-1.5 font-mono">{m.sub}</p>
            </div>
          )) : (
            <>
              {[["total calls", "0", "no calls yet"], ["empathy", "—", "avg across all agents"], ["resolved", "—", "resolution rate"], ["active agents", agents.length.toString(), "deployed"]].map(([label, val, sub], i) => (
                <div key={label} className={`px-5 py-5 ${i % 2 === 0 ? "border-r border-black" : ""} ${i < 2 ? "border-b sm:border-b-0 border-black" : ""} sm:border-r sm:last:border-r-0`}>
                  <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-3xl font-bold tracking-tight leading-none">{val}</p>
                  <p className="text-[10px] text-black/30 mt-1.5 font-mono">{sub}</p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Agents + Recent calls ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">

          {/* Agents */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest font-semibold">agents</p>
              <Link href="/agents" className="text-[10px] font-mono text-black/40 hover:text-black transition-colors">view all →</Link>
            </div>
            <div className="border-2 border-black">
              {liveAgents.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-black/40 font-mono">no agents deployed yet</p>
                  <Link href="/agents/new"
                    className="inline-flex items-center gap-2 mt-4 text-xs font-mono border-2 border-black px-4 py-2.5 hover:bg-black hover:text-[#e8dece] transition-colors">
                    <Plus size={11} /> create your first agent
                  </Link>
                </div>
              ) : liveAgents.map((a, i) => (
                <Link key={a.id} href={`/agents/${a.id}`}
                  className={`flex items-center justify-between px-5 py-4 hover:bg-black/5 transition-colors ${i < liveAgents.length - 1 ? "border-b border-black" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot(a.status)}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{a.name}</p>
                      <p className="text-[10px] text-black/40 mt-0.5 truncate">{a.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-mono">{a.stats.callsToday}</p>
                      <p className="text-[9px] text-black/30 font-mono">today</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-mono">{a.stats.empathyScore > 0 ? `${a.stats.empathyScore}%` : "—"}</p>
                      <p className="text-[9px] text-black/30 font-mono">empathy</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-1 border font-semibold ${a.status === "live" ? "border-black bg-black text-[#e8dece]" : "border-black/25 text-black/50"}`}>
                      {a.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent calls */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest font-semibold">recent calls</p>
              <Link href="/calls" className="text-[10px] font-mono text-black/40 hover:text-black transition-colors">view all →</Link>
            </div>
            <div className="border-2 border-black">
              {recentCalls.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-black/40 font-mono">no calls yet</p>
                  <Link href="/test-call"
                    className="inline-flex items-center gap-2 mt-4 text-xs font-mono border-2 border-black px-4 py-2.5 hover:bg-black hover:text-[#e8dece] transition-colors">
                    <PhoneCall size={11} /> try a test call
                  </Link>
                </div>
              ) : recentCalls.map((r, i) => (
                <div key={r.id} className={`px-5 py-4 ${i < recentCalls.length - 1 ? "border-b border-black" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-black/40 truncate max-w-[120px]">{r.id}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${outcomeBorder(r.outcome)}`}>{r.outcome}</span>
                  </div>
                  <p className="text-xs font-semibold truncate">{r.agentName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-black/40 font-mono">{r.duration}</span>
                    <span className="text-[10px] text-black/20">·</span>
                    <span className="text-[10px] font-mono font-semibold">{r.empathyScore > 0 ? `${r.empathyScore}%` : "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/agents/new"
            className="flex items-center justify-between p-5 border-2 border-black hover:bg-black hover:text-[#e8dece] transition-all group">
            <div>
              <p className="font-semibold text-sm">new agent</p>
              <p className="text-[11px] text-black/50 mt-0.5 group-hover:text-[#e8dece]/50">3 fields · AI writes the prompt</p>
            </div>
            <Sparkles size={16} className="text-black/30 group-hover:text-[#e8dece]/50" />
          </Link>
          <Link href="/test-call"
            className="flex items-center justify-between p-5 border-2 border-black hover:bg-black hover:text-[#e8dece] transition-all group">
            <div>
              <p className="font-semibold text-sm">test call</p>
              <p className="text-[11px] text-black/50 mt-0.5 group-hover:text-[#e8dece]/50">browser · no phone needed</p>
            </div>
            <PhoneCall size={16} className="text-black/30 group-hover:text-[#e8dece]/50" />
          </Link>
          <Link href="/observer"
            className="flex items-center justify-between p-5 border-2 border-black hover:bg-black hover:text-[#e8dece] transition-all group">
            <div>
              <p className="font-semibold text-sm">live observer</p>
              <p className="text-[11px] text-black/50 mt-0.5 group-hover:text-[#e8dece]/50">watch PEEK · MESH · SILK fire</p>
            </div>
            <ArrowUpRight size={16} className="text-black/30 group-hover:text-[#e8dece]/50" />
          </Link>
        </div>
      </div>
    </div>
  );
}
