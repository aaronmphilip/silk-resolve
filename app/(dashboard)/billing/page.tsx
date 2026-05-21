import { BILLING_PLAN, USAGE_RECORDS, INVOICES, TENANT } from "@/lib/mock-data";

function UsageChart({ records }: { records: typeof USAGE_RECORDS }) {
  const max = Math.max(...records.map((r) => r.minutesUsed));
  const W = 720, H = 80, barW = Math.floor(W / records.length) - 2;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ fontFamily: "JetBrains Mono, monospace" }}>
      {records.map((r, i) => {
        const barH = Math.max(2, (r.minutesUsed / max) * H);
        const x = i * (W / records.length);
        const isWeekend = [0, 6].includes(new Date(r.date).getDay());
        return (
          <g key={r.date}>
            <rect x={x + 1} y={H - barH} width={barW} height={barH}
              fill={isWeekend ? "rgba(0,0,0,0.15)" : r.minutesUsed > 600 ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.5)"} />
            {i % 7 === 0 && (
              <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={7} fill="rgba(0,0,0,0.3)">
                {r.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function BillingPage() {
  const totalMinutes = USAGE_RECORDS.reduce((s, r) => s + r.minutesUsed, 0);
  const thisMonth = USAGE_RECORDS.slice(-21).reduce((s, r) => s + r.minutesUsed, 0); // ~month
  const usagePct = (TENANT.callsThisMonth / BILLING_PLAN.minutesIncluded) * 100;
  const overage = Math.max(0, TENANT.callsThisMonth - BILLING_PLAN.minutesIncluded);
  const overageCost = +(overage * BILLING_PLAN.pricePerMinute).toFixed(2);
  const totalThisMonth = BILLING_PLAN.monthlyBase + overageCost;

  return (
    <div className="min-h-screen">
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ billing /</p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">usage & billing.</h1>
          <p className="text-xs opacity-35 font-mono">/ per-minute voice infrastructure · {BILLING_PLAN.name} plan /</p>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Plan + usage side by side */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Current plan */}
          <div className="border border-black">
            <div className="px-6 py-4 border-b border-black">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">current plan</p>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs opacity-40">plan</span>
                <span className="text-sm font-mono font-bold capitalize border border-black px-2.5 py-0.5">{BILLING_PLAN.name}</span>
              </div>
              {[
                { label: "monthly base", value: `$${BILLING_PLAN.monthlyBase.toLocaleString()}/mo` },
                { label: "minutes included", value: `${BILLING_PLAN.minutesIncluded.toLocaleString()} min/mo` },
                { label: "overage rate", value: `$${BILLING_PLAN.pricePerMinute}/min` },
                { label: "max agents", value: String(BILLING_PLAN.maxAgents) },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs opacity-40">{r.label}</span>
                  <span className="text-xs font-mono">{r.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-black/10">
                <button className="text-[10px] font-mono underline opacity-40 hover:opacity-80">upgrade plan →</button>
              </div>
            </div>
          </div>

          {/* This month */}
          <div className="border border-black">
            <div className="px-6 py-4 border-b border-black flex items-center justify-between">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">this month · may 2026</p>
              <p className="text-xs font-mono opacity-40">21 days elapsed</p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-end justify-between mb-3">
                <div>
                  <p className="text-5xl font-bold tracking-tight leading-none">{TENANT.callsThisMonth.toLocaleString()}</p>
                  <p className="text-[10px] font-mono opacity-30 mt-1">minutes used of {BILLING_PLAN.minutesIncluded.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${totalThisMonth.toFixed(2)}</p>
                  <p className="text-[10px] font-mono opacity-30">estimated bill</p>
                </div>
              </div>
              <div className="h-2 bg-black/10 mb-1.5">
                <div className={`h-2 transition-all ${usagePct > 90 ? "bg-black" : "bg-black/60"}`} style={{ width: `${Math.min(100, usagePct)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono opacity-30">{usagePct.toFixed(1)}% of plan used</p>
                {overage > 0 && <p className="text-[10px] font-mono font-bold">+{overage} min overage · +${overageCost}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-black/10">
                {[
                  { label: "base plan", value: `$${BILLING_PLAN.monthlyBase}` },
                  { label: "overage", value: overage > 0 ? `$${overageCost}` : "—" },
                  { label: "total calls", value: "5,341" },
                  { label: "avg min/call", value: (TENANT.callsThisMonth / 5341).toFixed(1) },
                ].map((r) => (
                  <div key={r.label}>
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-0.5">{r.label}</p>
                    <p className="text-sm font-mono font-semibold">{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Usage chart */}
        <div className="border border-black mb-8">
          <div className="px-6 py-4 border-b border-black flex items-center justify-between">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">daily usage · last 30 days</p>
            <p className="text-[10px] font-mono opacity-30">total {totalMinutes.toLocaleString()} min · {USAGE_RECORDS.reduce((s, r) => s + r.callCount, 0).toLocaleString()} calls</p>
          </div>
          <div className="px-6 py-6">
            <UsageChart records={USAGE_RECORDS} />
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-black/85" /><p className="text-[9px] font-mono opacity-40">high (&gt;600 min)</p></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-black/50" /><p className="text-[9px] font-mono opacity-40">normal</p></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-2 bg-black/15" /><p className="text-[9px] font-mono opacity-40">weekend</p></div>
            </div>
          </div>
        </div>

        {/* Invoices */}
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">invoice history</p>
        <div className="border border-black">
          <div className="grid grid-cols-5 px-5 py-3 border-b border-black bg-black/[0.03]">
            {["period", "minutes used", "amount", "status", ""].map((h) => (
              <p key={h} className="text-[9px] font-mono opacity-40 uppercase tracking-widest">{h}</p>
            ))}
          </div>
          {INVOICES.map((inv, i) => (
            <div key={inv.id} className={`grid grid-cols-5 px-5 py-4 items-center ${i < INVOICES.length - 1 ? "border-b border-black" : ""}`}>
              <p className="text-sm font-medium">{inv.period}</p>
              <p className="text-sm font-mono">{inv.minutesUsed.toLocaleString()} min</p>
              <p className="text-sm font-mono font-semibold">${inv.amount.toFixed(2)}</p>
              <span className={`text-[9px] font-mono border px-2 py-0.5 w-fit ${
                inv.status === "paid" ? "border-black/30 opacity-50" : inv.status === "pending" ? "border-black font-bold" : "border-black bg-black text-[#f0ebe0]"
              }`}>{inv.status}</span>
              <button className="text-[10px] font-mono underline opacity-30 hover:opacity-70 text-right">download PDF</button>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-dashed border-black/20 px-6 py-5">
          <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-2">billing model</p>
          <p className="text-xs opacity-40 leading-relaxed max-w-3xl">
            Silk Resolver bills per minute of active voice. Your plan includes {BILLING_PLAN.minutesIncluded.toLocaleString()} minutes monthly at ${BILLING_PLAN.monthlyBase}/mo. Minutes are counted from the moment the call connects to the moment it ends — hold time included. Overage is billed at ${BILLING_PLAN.pricePerMinute}/min. Invoices are issued on the 1st of each month, due within 14 days.
          </p>
        </div>
      </div>
    </div>
  );
}
