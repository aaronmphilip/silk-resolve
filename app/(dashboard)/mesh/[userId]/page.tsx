import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { USER_MESH_PROFILES } from "@/lib/mock-data";
import type { EmotionalDebtLevel, CompanionVibe, ContextualAnchor } from "@/lib/types";

interface PageProps {
  params: { userId: string };
}

export function generateStaticParams() {
  return USER_MESH_PROFILES.map((p) => ({ userId: p.id }));
}

function DebtLevelBadge({ level }: { level: EmotionalDebtLevel }) {
  const styles: Record<EmotionalDebtLevel, string> = {
    positive: "border-black font-bold",
    neutral: "border-black/40 opacity-60",
    negative: "border-black/60",
    critical: "border-black bg-black text-[#f0ebe0]",
  };
  return (
    <span className={`text-[10px] font-mono border px-2.5 py-1 ${styles[level]}`}>
      {level} debt
    </span>
  );
}

function DebtTimeline({ history }: { history: { date: string; note: string; callId: string; delta: number }[] }) {
  const max = Math.max(...history.map((h) => Math.abs(h.delta)));
  return (
    <div className="space-y-3">
      {history.map((h, i) => (
        <div key={i} className="flex gap-4 items-start">
          <div className="flex-shrink-0 text-right w-20">
            <p className="text-[9px] font-mono opacity-30">{h.date.slice(5)}</p>
            <p className="text-[9px] font-mono opacity-25">{h.callId}</p>
          </div>
          <div className="flex-shrink-0 w-16 pt-1">
            <div className="h-1 bg-black/10">
              <div
                className={`h-1 ${h.delta >= 0 ? "bg-black" : "bg-black/35"}`}
                style={{ width: `${(Math.abs(h.delta) / max) * 100}%` }}
              />
            </div>
            <p className={`text-[9px] font-mono mt-0.5 ${h.delta >= 0 ? "font-bold" : "opacity-50"}`}>
              {h.delta > 0 ? "+" : ""}{h.delta}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs opacity-60 leading-snug">{h.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnchorCard({ anchor }: { anchor: ContextualAnchor }) {
  return (
    <div className={`border border-black px-4 py-3.5 ${!anchor.active ? "opacity-35" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[9px] font-mono border px-1.5 py-0.5 ${
          anchor.pillar === "PEEK" ? "border-black/60" : "border-black/30"
        } opacity-60`}>
          {anchor.pillar}
        </span>
        <span className="text-[9px] font-mono opacity-25">{anchor.callId}</span>
      </div>
      <p className="text-sm leading-snug">{anchor.text}</p>
      <p className="text-[9px] font-mono opacity-25 mt-2">{anchor.addedAt}</p>
      {!anchor.active && (
        <p className="text-[9px] font-mono opacity-30 mt-1">· expired</p>
      )}
    </div>
  );
}

export default function MeshProfilePage({ params }: PageProps) {
  const profile = USER_MESH_PROFILES.find((p) => p.id === params.userId);
  if (!profile) notFound();

  const initials = profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
  const activeAnchors = profile.contextualAnchors.filter((a) => a.active);
  const inactiveAnchors = profile.contextualAnchors.filter((a) => !a.active);
  const debtTrajectory = profile.emotionalDebtHistory[profile.emotionalDebtHistory.length - 1]?.delta ?? 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-5">
        <Link
          href="/mesh"
          className="flex items-center gap-2 text-xs font-mono opacity-40 hover:opacity-100 transition-opacity mb-4"
        >
          <ArrowLeft size={11} />
          back to relationship stack
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-black flex items-center justify-center text-lg font-bold font-mono flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">
                / digital soul /
              </p>
              <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-sm opacity-40">{profile.phone}</p>
                <span className="text-xs opacity-20">·</span>
                <p className="text-sm opacity-40">{profile.client}</p>
                <span className="text-xs opacity-20">·</span>
                <DebtLevelBadge level={profile.emotionalDebtLevel} />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">
              debt score
            </p>
            <p className="text-5xl font-bold tracking-tight">
              {profile.emotionalDebtScore > 0 ? "+" : ""}{profile.emotionalDebtScore}
            </p>
            <p className={`text-[10px] font-mono mt-1 ${debtTrajectory >= 0 ? "opacity-50" : "opacity-40"}`}>
              last interaction: {debtTrajectory > 0 ? "+" : ""}{debtTrajectory}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-6 mt-4">
          {[
            { label: "total interactions", value: String(profile.totalInteractions) },
            { label: "first seen", value: profile.firstSeen },
            { label: "last seen", value: profile.lastSeen },
            { label: "avg empathy", value: `${profile.avgEmpathyScore}%` },
            { label: "last resolution", value: profile.lastResolution },
          ].map((m) => (
            <div key={m.label}>
              <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest mr-1.5">
                {m.label}
              </span>
              <span className="text-xs font-mono">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Identity Profile */}
          <div className="border border-black">
            <div className="px-6 py-4 border-b border-black">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">
                identity profile
              </p>
              <p className="text-xs opacity-40 font-mono">
                / language · companion vibe · address preference /
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { label: "language", value: profile.identityProfile.language },
                { label: "preferred address", value: `"${profile.identityProfile.preferredAddress}"` },
                {
                  label: "companion vibe",
                  value: profile.identityProfile.companionVibe,
                  bold: true,
                },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs opacity-40">{r.label}</span>
                  <span className={`text-xs font-mono ${r.bold ? "font-bold border border-black px-2 py-0.5" : ""}`}>
                    {r.value}
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t border-black/10">
                <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">
                  linguistic notes
                </p>
                <p className="text-sm opacity-60 leading-relaxed">
                  {profile.identityProfile.linguisticNotes}
                </p>
              </div>
            </div>
          </div>

          {/* Emotional Debt Timeline */}
          <div className="border border-black">
            <div className="px-6 py-4 border-b border-black">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">
                emotional debt history
              </p>
              <p className="text-xs opacity-40 font-mono">
                / net sentiment across all interactions /
              </p>
            </div>
            <div className="px-6 py-5">
              <DebtTimeline history={profile.emotionalDebtHistory} />
            </div>
          </div>
        </div>

        {/* Contextual Anchors */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">
              contextual anchors
            </p>
            <span className="text-[9px] font-mono border border-black px-2 py-0.5 opacity-50">
              {activeAnchors.length} active
            </span>
            <p className="text-[10px] opacity-30 font-mono">
              / sticky facts silk reads before speaking /
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {activeAnchors.map((anchor) => (
              <AnchorCard key={anchor.id} anchor={anchor} />
            ))}
            {inactiveAnchors.map((anchor) => (
              <AnchorCard key={anchor.id} anchor={anchor} />
            ))}
          </div>
        </div>

        {/* Silk read-out */}
        <div className="border border-black/20 border-dashed px-6 py-5">
          <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-2">
            next call — mesh pre-load
          </p>
          <p className="text-xs font-mono opacity-50 leading-relaxed">
            <span className="font-bold opacity-80">Identity:</span>{" "}
            {profile.identityProfile.language} · address as "{profile.identityProfile.preferredAddress}" · vibe: {profile.identityProfile.companionVibe}
            {" "}·{" "}
            <span className="font-bold opacity-80">Debt:</span>{" "}
            score {profile.emotionalDebtScore > 0 ? "+" : ""}{profile.emotionalDebtScore} ({profile.emotionalDebtLevel}) · {profile.emotionalDebtHistory.length} prior interactions recalled
            {" "}·{" "}
            <span className="font-bold opacity-80">Anchors:</span>{" "}
            {activeAnchors.map((a, i) => (
              <span key={a.id}>{i > 0 ? " · " : ""}"{a.text.slice(0, 48)}..."</span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
