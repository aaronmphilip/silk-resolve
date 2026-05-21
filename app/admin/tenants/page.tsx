"use client";
import { useState, useEffect } from "react";
import { Loader2, ArrowUpRight } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  industry: string;
  callsThisMonth: number;
  callLimit: number;
  usagePct: number;
  createdAt: string;
  timezone: string;
  hasOwner: boolean;
}

const PLAN_COLOR: Record<string, string> = {
  starter: "border-[#f0ebe0]/20",
  growth: "border-amber-400/40 text-amber-400",
  enterprise: "border-emerald-400/40 text-emerald-400",
};

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((data) => { setTenants(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const totalCalls = tenants.reduce((s, t) => s + t.callsThisMonth, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={14} className="animate-spin opacity-40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-[#f0ebe0]/10 px-8 py-6">
        <p className="text-[10px] font-mono opacity-25 uppercase tracking-widest mb-1.5">/ admin / tenants /</p>
        <h1 className="text-2xl font-bold text-[#f0ebe0] tracking-tight">tenant accounts.</h1>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 border-b border-[#f0ebe0]/10">
        {[
          { label: "total tenants", value: String(tenants.length) },
          { label: "calls this month", value: totalCalls.toLocaleString() },
          { label: "enterprise plans", value: String(tenants.filter((t) => t.plan === "enterprise").length) },
        ].map((s, i) => (
          <div key={s.label} className={`px-8 py-5 ${i < 2 ? "border-r border-[#f0ebe0]/10" : ""}`}>
            <p className="text-[10px] font-mono opacity-25 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-[#f0ebe0]">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-8 py-8">
        {tenants.length === 0 ? (
          <div className="border border-[#f0ebe0]/10 px-8 py-12 text-center">
            <p className="text-sm font-mono opacity-30">no tenants yet</p>
          </div>
        ) : (
          <div className="border border-[#f0ebe0]/10">
            {/* Header */}
            <div className="grid grid-cols-12 px-5 py-3 border-b border-[#f0ebe0]/10 bg-[#f0ebe0]/[0.02]">
              {["tenant", "industry", "plan", "calls / limit", "usage", "created"].map((h, i) => (
                <div key={h} className={`text-[9px] font-mono opacity-25 uppercase tracking-widest ${i === 0 ? "col-span-3" : i === 1 ? "col-span-2" : i === 3 ? "col-span-2 text-right" : i === 4 ? "col-span-2" : "col-span-1 text-right"}`}>
                  {h}
                </div>
              ))}
            </div>

            {tenants.map((t, i) => (
              <div key={t.id} className={`grid grid-cols-12 px-5 py-4 items-center gap-2 ${i < tenants.length - 1 ? "border-b border-[#f0ebe0]/5" : ""} hover:bg-[#f0ebe0]/[0.02] transition-colors`}>
                {/* Name + slug */}
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-[#f0ebe0]">{t.name}</p>
                  <p className="text-[9px] font-mono opacity-25 mt-0.5">{t.slug} · {t.timezone}</p>
                  {!t.hasOwner && <span className="text-[8px] font-mono text-amber-400 border border-amber-400/30 px-1 py-0.5 mt-0.5 inline-block">no owner</span>}
                </div>

                {/* Industry */}
                <div className="col-span-2">
                  <p className="text-xs font-mono opacity-50 capitalize">{t.industry ?? "—"}</p>
                </div>

                {/* Plan */}
                <div className="col-span-1">
                  <span className={`text-[9px] font-mono border px-2 py-0.5 capitalize ${PLAN_COLOR[t.plan] ?? "border-[#f0ebe0]/20"}`}>{t.plan}</span>
                </div>

                {/* Calls */}
                <div className="col-span-2 text-right">
                  <p className="text-xs font-mono opacity-60">{t.callsThisMonth.toLocaleString()} / {(t.callLimit / 1000).toFixed(0)}k</p>
                </div>

                {/* Usage bar */}
                <div className="col-span-2">
                  <div className="h-1 bg-[#f0ebe0]/10">
                    <div className={`h-1 transition-all ${t.usagePct > 80 ? "bg-red-400" : t.usagePct > 50 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(t.usagePct, 100)}%` }} />
                  </div>
                  <p className="text-[9px] font-mono opacity-25 mt-0.5">{t.usagePct}%</p>
                </div>

                {/* Created */}
                <div className="col-span-1 text-right">
                  <p className="text-xs font-mono opacity-30">{t.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border border-[#f0ebe0]/5 bg-[#f0ebe0]/[0.02] px-5 py-3">
          <p className="text-[10px] font-mono opacity-20">tenant IDs and full details available in Supabase dashboard</p>
        </div>
      </div>
    </div>
  );
}
