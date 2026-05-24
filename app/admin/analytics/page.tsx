"use client";
import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Phone, CheckCircle, Zap, Clock } from "lucide-react";

interface Kpis {
  totalCalls: number;
  callsThisMonth: number;
  resolvedPct: number;
  avgTension: number;
  avgDuration: number;
}
interface DayData  { date: string; count: number; }
interface Breakdown { label: string; count: number; }
interface TopTenant { name: string; calls: number; }
interface RecentCall {
  id: string; tenantName: string; status: string; resolution: string;
  tension: number; turns: number; duration: number | null; startedAt: string;
}
interface Analytics {
  kpis: Kpis;
  callsByDay: DayData[];
  resolutionBreakdown: Breakdown[];
  topTenants: TopTenant[];
  recentCalls: RecentCall[];
}

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-[#f0ebe0]/30" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm font-mono text-[#f0ebe0]/30">failed to load analytics</p>
      </div>
    );
  }

  const { kpis, callsByDay, resolutionBreakdown, topTenants, recentCalls } = data;
  const maxDay = Math.max(...callsByDay.map((d) => d.count), 1);
  const maxTenant = Math.max(...topTenants.map((t) => t.calls), 1);

  const statusColor: Record<string, string> = {
    resolved:  "text-emerald-400",
    escalated: "text-amber-400",
    abandoned: "text-red-400",
    active:    "text-sky-400",
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#f0ebe0]/10 px-8 py-6">
        <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-1.5">/ admin / analytics /</p>
        <h1 className="text-2xl font-bold text-[#f0ebe0] tracking-tight">platform analytics.</h1>
        <p className="text-xs font-mono text-[#f0ebe0]/30 mt-1">all tenants · all time</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[#f0ebe0]/10">
        {[
          { label: "total calls",      value: kpis.totalCalls.toLocaleString(),          icon: Phone       },
          { label: "this month",       value: kpis.callsThisMonth.toLocaleString(),       icon: TrendingUp  },
          { label: "resolved %",       value: `${kpis.resolvedPct}%`,                    icon: CheckCircle },
          { label: "avg tension",      value: kpis.avgTension.toFixed(1),                icon: Zap         },
          { label: "avg duration",     value: fmtDuration(kpis.avgDuration),             icon: Clock       },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className={`px-6 py-5 ${i < 4 ? "border-r border-[#f0ebe0]/10" : ""} ${i > 1 ? "border-t sm:border-t-0 border-[#f0ebe0]/10" : ""}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={10} className="text-[#f0ebe0]/25" />
              <p className="text-[9px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest">{kpi.label}</p>
            </div>
            <p className="text-2xl font-bold text-[#f0ebe0]">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="px-8 py-8 space-y-10">

        {/* Calls by Day — bar chart */}
        <div>
          <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-5">calls · last 30 days</p>
          <div className="flex items-end gap-[2px] h-28">
            {callsByDay.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full bg-[#f0ebe0]/20 hover:bg-[#f0ebe0]/50 transition-colors"
                  style={{ height: `${Math.max(2, (d.count / maxDay) * 100)}%` }}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#f0ebe0]/20 px-2 py-1 text-[9px] font-mono text-[#f0ebe0] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {d.date.slice(5)}: {d.count}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-[9px] font-mono text-[#f0ebe0]/20">{callsByDay[0]?.date?.slice(5)}</p>
            <p className="text-[9px] font-mono text-[#f0ebe0]/20">{callsByDay[callsByDay.length - 1]?.date?.slice(5)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

          {/* Resolution Breakdown */}
          <div>
            <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-4">resolution breakdown</p>
            {resolutionBreakdown.length === 0 ? (
              <p className="text-xs font-mono text-[#f0ebe0]/20">no data yet</p>
            ) : (
              <div className="space-y-3">
                {resolutionBreakdown.map((item) => {
                  const total = resolutionBreakdown.reduce((s, i) => s + i.count, 0);
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono text-[#f0ebe0]/60 capitalize">{item.label}</span>
                        <span className="text-xs font-mono text-[#f0ebe0]/40">{item.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#f0ebe0]/10">
                        <div
                          className="h-1.5 bg-[#f0ebe0]/40 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Tenants */}
          <div>
            <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-4">top tenants · this month</p>
            {topTenants.length === 0 ? (
              <p className="text-xs font-mono text-[#f0ebe0]/20">no data yet</p>
            ) : (
              <div className="space-y-3">
                {topTenants.map((t) => (
                  <div key={t.name}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono text-[#f0ebe0]/60 truncate max-w-[70%]">{t.name}</span>
                      <span className="text-xs font-mono text-[#f0ebe0]/40">{t.calls.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[#f0ebe0]/10">
                      <div
                        className="h-1.5 bg-[#f0ebe0]/30 transition-all"
                        style={{ width: `${Math.max(2, (t.calls / maxTenant) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Calls Table */}
        <div>
          <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-4">recent calls</p>
          {recentCalls.length === 0 ? (
            <div className="border border-[#f0ebe0]/10 px-8 py-10 text-center">
              <p className="text-sm font-mono text-[#f0ebe0]/20">no calls recorded yet</p>
            </div>
          ) : (
            <div className="border border-[#f0ebe0]/10 overflow-x-auto">
              {/* Header */}
              <div className="grid grid-cols-12 px-5 py-3 border-b border-[#f0ebe0]/10 bg-[#f0ebe0]/[0.02]">
                {["tenant", "status", "resolution", "tension", "turns", "duration", "started"].map((h, i) => (
                  <div
                    key={h}
                    className={`text-[9px] font-mono text-[#f0ebe0]/20 uppercase tracking-widest ${
                      i === 0 ? "col-span-3" : i === 1 ? "col-span-2" : "col-span-1"
                    }`}
                  >
                    {h}
                  </div>
                ))}
              </div>
              {recentCalls.map((c, i) => (
                <div
                  key={c.id}
                  className={`grid grid-cols-12 px-5 py-3.5 items-center ${
                    i < recentCalls.length - 1 ? "border-b border-[#f0ebe0]/5" : ""
                  } hover:bg-[#f0ebe0]/[0.02] transition-colors`}
                >
                  <div className="col-span-3">
                    <p className="text-xs font-mono text-[#f0ebe0]/70 truncate">{c.tenantName}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-[10px] font-mono capitalize ${statusColor[c.status] ?? "text-[#f0ebe0]/40"}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono text-[#f0ebe0]/40 capitalize">{c.resolution}</p>
                  </div>
                  <div className="col-span-1">
                    <p className={`text-xs font-mono ${c.tension > 7 ? "text-red-400" : c.tension > 5 ? "text-amber-400" : "text-[#f0ebe0]/40"}`}>
                      {c.tension.toFixed(1)}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs font-mono text-[#f0ebe0]/40">{c.turns}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs font-mono text-[#f0ebe0]/40">
                      {c.duration != null ? fmtDuration(c.duration) : "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-mono text-[#f0ebe0]/25">{c.startedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
