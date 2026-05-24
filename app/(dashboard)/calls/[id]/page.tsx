import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Phone, Clock, Gauge, Tag, MessageSquare, AlertTriangle } from "lucide-react";
import { getCallById, getCallAnalysis } from "@/lib/dal";
import { outcomeBorder } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ id: string }>;
}

const ENV_LABELS: Record<string, string> = {
  quiet: "Quiet room",
  noisy_market: "Noisy market",
  vehicle: "In vehicle",
  hospital: "Hospital",
  office: "Office",
};

function formatTime(ts: number | undefined): string {
  if (typeof ts !== "number") return "";
  const m = Math.floor(ts / 60);
  const s = Math.round(ts % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function CallDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [call, analysis] = await Promise.all([
    getCallById(id),
    getCallAnalysis(id),
  ]);

  if (!call) notFound();

  const hasTranscript = call.transcript.length > 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-5 sm:px-8 py-5">
        <Link
          href="/calls"
          className="inline-flex items-center gap-2 text-xs font-mono text-black/40 dark:text-[#e8dece]/40 hover:text-black dark:hover:text-[#e8dece] transition-colors mb-4"
        >
          <ArrowLeft size={11} />
          back to call logs
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-1.5">
              / {id} /
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{call.agentName}</h1>
              <span className={`text-xs font-mono px-3 py-1 border ${outcomeBorder(call.outcome)}`}>
                {call.outcome}
              </span>
            </div>
            <p className="text-sm text-black/40 dark:text-[#e8dece]/40 mt-1">
              {call.callerPhone ? `caller: ${call.callerPhone}` : call.client}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}
            </p>
            <p className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35 mt-0.5">
              empathy score
            </p>
          </div>
        </div>

        {/* Meta strip */}
        <div className="flex items-center gap-4 sm:gap-6 mt-4 flex-wrap">
          {[
            { icon: Clock, label: "duration", value: call.duration },
            { icon: Phone, label: "time", value: call.timestamp.slice(0, 16).replace("T", " ") },
            { icon: Gauge, label: "agent", value: call.agentName },
          ].map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <m.icon size={10} className="text-black/30 dark:text-[#e8dece]/30" />
              <span className="text-[9px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest">
                {m.label}
              </span>
              <span className="text-xs font-mono">{m.value}</span>
            </div>
          ))}
          {call.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 ml-1">
              {call.tags.map((t, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono bg-black/5 dark:bg-[#e8dece]/5 border border-black/15 dark:border-[#e8dece]/15 px-1.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8 space-y-6">

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border border-black">
          {[
            { label: "duration", value: call.duration },
            { label: "empathy", value: call.empathyScore > 0 ? `${call.empathyScore}%` : "—" },
            { label: "outcome", value: call.outcome },
            { label: "turns", value: String(call.transcript.filter((m) => m.role === "customer").length) },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-4 sm:px-5 py-4 ${i < 3 ? "border-r border-black" : ""} ${i < 2 ? "border-b sm:border-b-0 border-black" : ""}`}
            >
              <p className="text-[9px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-1.5">
                {s.label}
              </p>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Deep analysis (from call_analyses table) */}
        {analysis && (
          <>
            {/* Ingress */}
            <div className="border border-black">
              <div className="px-5 sm:px-6 py-4 border-b border-black">
                <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest">
                  ingress analysis · first 5 seconds
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-black">
                {[
                  { label: "environment", value: ENV_LABELS[analysis.ingressAnalysis.environment] ?? analysis.ingressAnalysis.environment },
                  { label: "pitch", value: `${analysis.ingressAnalysis.pitch} Hz` },
                  { label: "jitter", value: `${analysis.ingressAnalysis.jitter} ms` },
                  { label: "noise level", value: `${analysis.ingressAnalysis.noiseLevel} dB` },
                  { label: "language", value: analysis.ingressAnalysis.language },
                ].map((s) => (
                  <div key={s.label} className="px-4 sm:px-5 py-4">
                    <p className="text-[9px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-2">{s.label}</p>
                    <p className="text-sm font-semibold leading-tight">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Mesh context */}
            {analysis.meshContext && (
              <div className="border border-black">
                <div className="px-5 sm:px-6 py-4 border-b border-black">
                  <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest">
                    mesh context recalled
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-black">
                  <div className="px-5 sm:px-6 py-5 space-y-3">
                    {[
                      { label: "preferred address", value: `"${analysis.meshContext.preferredAddress}"` },
                      { label: "last outcome", value: analysis.meshContext.lastOutcome },
                      { label: "last interaction", value: analysis.meshContext.lastTimestamp },
                      { label: "interactions retrieved", value: `${analysis.meshContext.interactionsRetrieved} records` },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-black/40 dark:text-[#e8dece]/40">{r.label}</span>
                        <span className="text-xs font-mono">{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 sm:px-6 py-5">
                    <p className="text-[9px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-2">
                      emotional debt note
                    </p>
                    <p className="text-sm leading-relaxed text-black/70 dark:text-[#e8dece]/70">
                      {analysis.meshContext.emotionalDebt ?? "No emotional debt on record."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Full transcript ────────────────────────────────────────────────── */}
        <div className="border border-black">
          <div className="px-5 sm:px-6 py-4 border-b border-black flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-0.5">
                call transcript
              </p>
              <p className="text-xs text-black/40 dark:text-[#e8dece]/40 font-mono">
                {hasTranscript
                  ? `${call.transcript.length} messages · saved from voice session`
                  : "no transcript saved for this call"}
              </p>
            </div>
            <MessageSquare size={14} className="text-black/20 dark:text-[#e8dece]/20" />
          </div>

          {!hasTranscript ? (
            <div className="px-6 py-10 text-center">
              <AlertTriangle size={16} className="text-black/20 dark:text-[#e8dece]/20 mx-auto mb-2" />
              <p className="text-xs font-mono text-black/30 dark:text-[#e8dece]/30">
                Transcript data is saved from the end-of-call Vapi webhook.
                <br />Calls made before this update will not have transcripts.
              </p>
            </div>
          ) : (
            <div className="px-4 sm:px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {call.transcript.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "customer" ? "flex-row-reverse" : ""}`}
                >
                  {/* Role badge */}
                  <div className="flex-shrink-0 mt-1">
                    <span
                      className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${
                        msg.role === "agent"
                          ? "border-black/20 dark:border-[#e8dece]/20 text-black/40 dark:text-[#e8dece]/40"
                          : "border-black/40 dark:border-[#e8dece]/40 bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#0a0a0a]"
                      }`}
                    >
                      {msg.role === "agent" ? "agent" : "you"}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`flex-1 px-4 py-3 border ${
                      msg.role === "agent"
                        ? "border-black/10 dark:border-[#e8dece]/10 bg-black/[0.02] dark:bg-[#e8dece]/[0.02]"
                        : "border-black/20 dark:border-[#e8dece]/20 bg-black/[0.04] dark:bg-[#e8dece]/[0.04]"
                    } max-w-[85%]`}
                  >
                    <p className="text-xs leading-relaxed text-black/80 dark:text-[#e8dece]/80">
                      {msg.content}
                    </p>
                    {msg.time !== undefined && (
                      <p className="text-[9px] font-mono text-black/25 dark:text-[#e8dece]/25 mt-1">
                        {formatTime(msg.time)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Call metadata */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="border border-black px-5 sm:px-6 py-5">
            <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-4">
              call details
            </p>
            <div className="space-y-2.5">
              {[
                { label: "call id", value: call.id },
                { label: "agent", value: call.agentName },
                { label: "caller", value: call.callerPhone ?? call.client },
                { label: "duration", value: call.duration },
                { label: "empathy", value: call.empathyScore > 0 ? `${call.empathyScore}%` : "—" },
                { label: "outcome", value: call.outcome },
                { label: "timestamp", value: call.timestamp.slice(0, 16).replace("T", " ") },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-black/40 dark:text-[#e8dece]/40">{r.label}</span>
                  <span className="text-xs font-mono truncate max-w-[60%] text-right">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-black px-5 sm:px-6 py-5">
            <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-4">
              tags
            </p>
            {call.tags.length === 0 ? (
              <p className="text-xs font-mono text-black/25 dark:text-[#e8dece]/25">no tags</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {call.tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono border border-black dark:border-[#e8dece]/40 px-3 py-1.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
