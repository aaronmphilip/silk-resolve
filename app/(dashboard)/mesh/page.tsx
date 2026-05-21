import Link from "next/link";
import { getMeshProfiles } from "@/lib/dal";
import { USER_MESH_PROFILES } from "@/lib/mock-data";
import type { EmotionalDebtLevel, CompanionVibe } from "@/lib/types";

function DebtBar({ score }: { score: number }) {
  const pct = Math.abs(score);
  const positive = score >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-black/10 relative">
        <div
          className={`absolute top-0 h-1.5 transition-all ${positive ? "bg-black" : "bg-black/40"}`}
          style={{ width: `${pct}%`, left: positive ? "50%" : `${50 - pct / 2}%` }}
        />
        <div className="absolute top-0 left-1/2 w-px h-1.5 bg-black/30" />
      </div>
      <span className={`text-[10px] font-mono w-10 text-right ${positive ? "font-bold" : "opacity-60"}`}>
        {score > 0 ? "+" : ""}{score}
      </span>
    </div>
  );
}

function DebtLevelBadge({ level }: { level: EmotionalDebtLevel }) {
  const styles: Record<EmotionalDebtLevel, string> = {
    positive: "border-black font-bold",
    neutral: "border-black/40 opacity-60",
    negative: "border-black/60 opacity-70",
    critical: "border-black bg-black text-[#f0ebe0]",
  };
  return (
    <span className={`text-[9px] font-mono border px-2 py-0.5 ${styles[level]}`}>
      {level}
    </span>
  );
}

function VibeBadge({ vibe }: { vibe: CompanionVibe }) {
  return (
    <span className="text-[9px] font-mono border border-black/20 px-1.5 py-0.5 opacity-50">
      {vibe}
    </span>
  );
}

export default async function MeshPage() {
  const dbProfiles = await getMeshProfiles();
  const profiles = dbProfiles.length ? dbProfiles : USER_MESH_PROFILES;

  const critical = profiles.filter((p) => p.emotionalDebtLevel === "critical").length;
  const negative = profiles.filter((p) => p.emotionalDebtLevel === "negative").length;
  const positive = profiles.filter((p) => p.emotionalDebtLevel === "positive").length;
  const totalAnchors = profiles.reduce((s, p) => s + p.contextualAnchors.filter((a) => a.active).length, 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / mesh · relationship stack /
        </p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">digital souls.</h1>
            <p className="text-sm opacity-40 mt-1">
              every user is a relationship object. not a ticket.
            </p>
          </div>
          <p className="text-xs opacity-35 font-mono">
            / emotional debt · identity profiles · contextual anchors /
          </p>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Summary strip */}
        <div className="grid grid-cols-4 border border-black mb-8">
          {[
            { label: "total profiles", value: profiles.length },
            { label: "critical debt", value: critical },
            { label: "negative debt", value: negative },
            { label: "active anchors", value: totalAnchors },
          ].map((m, i) => (
            <div key={i} className={`px-6 py-5 ${i < 3 ? "border-r border-black" : ""}`}>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">
                {m.label}
              </p>
              <p className="text-4xl font-bold tracking-tight">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Profile table header */}
        <div className="grid grid-cols-12 px-5 py-3 border border-black border-b-0 bg-black/[0.03]">
          {[
            { label: "user", span: 3 },
            { label: "client", span: 2 },
            { label: "interactions", span: 1 },
            { label: "emotional debt", span: 3 },
            { label: "companion vibe", span: 1 },
            { label: "anchors", span: 1 },
            { label: "last seen", span: 1 },
          ].map((col) => (
            <div key={col.label} className={`col-span-${col.span}`}>
              <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest">
                {col.label}
              </p>
            </div>
          ))}
        </div>

        <div className="border border-black">
          {profiles.map((profile, i) => (
            <Link
              key={profile.id}
              href={`/mesh/${profile.id}`}
              className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-black/5 transition-colors ${
                i < profiles.length - 1 ? "border-b border-black" : ""
              } ${profile.emotionalDebtLevel === "critical" ? "bg-black/[0.02]" : ""}`}
            >
              {/* User */}
              <div className="col-span-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 border border-black flex items-center justify-center text-[9px] font-mono font-bold flex-shrink-0">
                    {profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{profile.name}</p>
                    <p className="text-[9px] opacity-35 font-mono">{profile.phone}</p>
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="col-span-2">
                <p className="text-xs opacity-60">{profile.client}</p>
              </div>

              {/* Interactions */}
              <div className="col-span-1">
                <p className="text-sm font-mono">{profile.totalInteractions}</p>
              </div>

              {/* Emotional debt */}
              <div className="col-span-3 pr-6">
                <div className="flex items-center gap-3 mb-1.5">
                  <DebtLevelBadge level={profile.emotionalDebtLevel} />
                </div>
                <DebtBar score={profile.emotionalDebtScore} />
              </div>

              {/* Companion vibe */}
              <div className="col-span-1">
                <VibeBadge vibe={profile.identityProfile.companionVibe} />
              </div>

              {/* Anchors */}
              <div className="col-span-1">
                <p className="text-sm font-mono">
                  {profile.contextualAnchors.filter((a) => a.active).length}
                </p>
              </div>

              {/* Last seen */}
              <div className="col-span-1">
                <p className="text-[10px] font-mono opacity-40">{profile.lastSeen.slice(5)}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Philosophy note */}
        <div className="mt-8 border border-black/20 border-dashed px-6 py-5">
          <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-2">
            mesh philosophy
          </p>
          <p className="text-xs opacity-40 leading-relaxed max-w-3xl">
            Each profile is a living Relationship Object. Emotional Debt is the net sentiment score across every interaction — positive debt means the system has earned goodwill, negative means it owes empathy. Contextual Anchors are sticky facts that persist across calls: "daughter's exam tomorrow," "prefers WhatsApp," "triggered by the word 'policy.'" SILK reads these before speaking.
          </p>
        </div>
      </div>
    </div>
  );
}
