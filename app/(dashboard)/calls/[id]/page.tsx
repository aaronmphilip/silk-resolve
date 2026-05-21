import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CALLS, CALL_ANALYSES } from "@/lib/mock-data";
import { outcomeBorder } from "@/lib/utils";
import CallHeatmap from "@/components/analytics/CallHeatmap";

interface PageProps {
  params: { id: string };
}

export function generateStaticParams() {
  return CALLS.map((c) => ({ id: c.id }));
}

const ENV_LABELS: Record<string, string> = {
  quiet: "Quiet room",
  noisy_market: "Noisy market",
  vehicle: "In vehicle",
  hospital: "Hospital",
  office: "Office",
};

export default function CallDetailPage({ params }: PageProps) {
  const call = CALLS.find((c) => c.id === params.id);
  if (!call) notFound();

  const analysis = CALL_ANALYSES[call.id] ?? null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-5">
        <Link
          href="/calls"
          className="flex items-center gap-2 text-xs font-mono opacity-40 hover:opacity-100 transition-opacity mb-4"
        >
          <ArrowLeft size={11} />
          back to call logs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
              / {call.id} /
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">
                {call.agentName}
              </h1>
              <span
                className={`text-xs font-mono px-3 py-1 border ${outcomeBorder(call.outcome)}`}
              >
                {call.outcome}
              </span>
            </div>
            <p className="text-sm opacity-40 mt-1">{call.client}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tracking-tight">
              {call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}
            </p>
            <p className="text-[10px] font-mono opacity-35 mt-0.5">
              final empathy score
            </p>
          </div>
        </div>

        {/* Meta strip */}
        <div className="flex items-center gap-6 mt-4">
          {[
            { label: "duration", value: call.duration },
            { label: "timestamp", value: call.timestamp },
            { label: "agent", value: call.agentId },
          ].map((m) => (
            <div key={m.label}>
              <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest mr-2">
                {m.label}
              </span>
              <span className="text-xs font-mono">{m.value}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-1 ml-2">
            {call.tags.map((t, i) => (
              <span
                key={i}
                className="text-[9px] font-mono bg-black/5 border border-black/15 px-1.5 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        {analysis ? (
          <>
            {/* Ingress Analysis */}
            <div className="border border-black mb-8">
              <div className="px-6 py-4 border-b border-black">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">
                  ingress analysis · first 5 seconds
                </p>
                <p className="text-xs opacity-40 font-mono">
                  / peek engine · pitch · jitter · environment detection /
                </p>
              </div>
              <div className="grid grid-cols-5 divide-x divide-black">
                {[
                  {
                    label: "environment",
                    value: ENV_LABELS[analysis.ingressAnalysis.environment] ?? analysis.ingressAnalysis.environment,
                  },
                  {
                    label: "pitch",
                    value: `${analysis.ingressAnalysis.pitch} Hz`,
                  },
                  {
                    label: "jitter",
                    value: `${analysis.ingressAnalysis.jitter} ms`,
                  },
                  {
                    label: "noise level",
                    value: `${analysis.ingressAnalysis.noiseLevel} dB`,
                  },
                  {
                    label: "language detected",
                    value: analysis.ingressAnalysis.language,
                  },
                ].map((s) => (
                  <div key={s.label} className="px-5 py-4">
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">
                      {s.label}
                    </p>
                    <p className="text-sm font-semibold leading-tight">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Emotional Heatmap */}
            <div className="border border-black mb-8">
              <div className="px-6 py-4 border-b border-black">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">
                  emotional heatmap
                </p>
                <p className="text-xs opacity-40 font-mono">
                  / tension arc vs empathy build across call duration /
                </p>
              </div>
              <div className="px-6 py-6">
                <CallHeatmap data={analysis.heatmap} height={150} />
              </div>
              {/* Event row */}
              <div className="px-6 pb-5 border-t border-black/10 pt-4">
                <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-3">
                  detection timeline
                </p>
                <div className="flex flex-wrap gap-2">
                  {analysis.heatmap
                    .filter((p) => p.event)
                    .map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 border border-black px-3 py-1.5"
                      >
                        <span className="text-[9px] font-mono font-bold bg-black text-[#f0ebe0] px-1.5 py-0.5">
                          {p.event}
                        </span>
                        <span className="text-[10px] font-mono opacity-40">
                          {p.t}s
                        </span>
                        <span className="text-[10px] font-mono">{p.eventLabel}</span>
                        <div className="text-[9px] font-mono opacity-35 border-l border-black/20 pl-2">
                          T:{p.tension}% → E:{p.empathy}%
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Mesh Context */}
            <div className="border border-black mb-8">
              <div className="px-6 py-4 border-b border-black">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">
                  mesh context recalled
                </p>
                <p className="text-xs opacity-40 font-mono">
                  / relationship vault · emotional debt · personalisation /
                </p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-black">
                <div className="px-6 py-5 space-y-3">
                  {[
                    {
                      label: "interactions retrieved",
                      value: `${analysis.meshContext.interactionsRetrieved} records`,
                    },
                    {
                      label: "preferred address",
                      value: `"${analysis.meshContext.preferredAddress}"`,
                    },
                    {
                      label: "last interaction outcome",
                      value: analysis.meshContext.lastOutcome,
                    },
                    {
                      label: "last interaction",
                      value: analysis.meshContext.lastTimestamp,
                    },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs opacity-40">{r.label}</span>
                      <span className="text-xs font-mono">{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-5">
                  <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">
                    emotional debt note
                  </p>
                  <p className="text-sm leading-relaxed opacity-70">
                    {analysis.meshContext.emotionalDebt ?? "No emotional debt on record."}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="border border-black px-6 py-10 text-center mb-8">
            <p className="text-xs font-mono opacity-30">
              no deep analysis available for this call.
            </p>
          </div>
        )}

        {/* Call metadata */}
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-black px-6 py-5">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
              call summary
            </p>
            <div className="space-y-2.5">
              {[
                { label: "call id", value: call.id },
                { label: "agent", value: call.agentName },
                { label: "client", value: call.client },
                { label: "duration", value: call.duration },
                { label: "empathy score", value: call.empathyScore > 0 ? `${call.empathyScore}%` : "—" },
                { label: "outcome", value: call.outcome },
                { label: "timestamp", value: call.timestamp },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs opacity-40">{r.label}</span>
                  <span className="text-xs font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-black px-6 py-5">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
              tags injected
            </p>
            <div className="flex flex-wrap gap-2">
              {call.tags.map((t, i) => (
                <span
                  key={i}
                  className="text-xs font-mono border border-black px-3 py-1.5"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
