import { TENANT, API_KEYS, WEBHOOKS, TEAM_MEMBERS } from "@/lib/mock-data";
import { planLabel } from "@/lib/utils";
import { Key, Globe, Users, Zap } from "lucide-react";

export default function SettingsPage() {
  const usagePct = Math.round(
    (TENANT.callsThisMonth / TENANT.callLimit) * 100
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / settings /
        </p>
        <h1 className="text-3xl font-bold tracking-tight">settings.</h1>
      </div>

      <div className="px-8 py-8 space-y-10">
        {/* ── 1. General ───────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Zap size={13} />
            <h2 className="text-base font-bold">1. general</h2>
            <p className="text-[10px] font-mono opacity-30">
              / tenant configuration /
            </p>
          </div>
          <div className="border border-black">
            {/* Tenant name */}
            <div className="grid grid-cols-3 px-6 py-4 border-b border-black items-center">
              <div>
                <p className="text-xs font-semibold">tenant name</p>
                <p className="text-[10px] opacity-40 mt-0.5 font-mono">
                  your organisation name
                </p>
              </div>
              <div className="col-span-2">
                <input
                  defaultValue={TENANT.name}
                  className="w-full max-w-xs border border-black bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] transition-shadow"
                />
              </div>
            </div>

            {/* Timezone */}
            <div className="grid grid-cols-3 px-6 py-4 border-b border-black items-center">
              <div>
                <p className="text-xs font-semibold">timezone</p>
                <p className="text-[10px] opacity-40 mt-0.5 font-mono">
                  for call timestamps
                </p>
              </div>
              <div className="col-span-2">
                <select className="border border-black bg-[#f0ebe0] px-3 py-2 text-sm font-mono focus:outline-none">
                  <option>{TENANT.timezone}</option>
                  <option>UTC</option>
                  <option>America/New_York</option>
                </select>
              </div>
            </div>

            {/* Language */}
            <div className="grid grid-cols-3 px-6 py-4 border-b border-black items-center">
              <div>
                <p className="text-xs font-semibold">primary language</p>
                <p className="text-[10px] opacity-40 mt-0.5 font-mono">
                  silk voice language config
                </p>
              </div>
              <div className="col-span-2">
                <input
                  defaultValue={TENANT.language}
                  className="w-full max-w-xs border border-black bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] transition-shadow"
                />
              </div>
            </div>

            {/* Escalation email */}
            <div className="grid grid-cols-3 px-6 py-4 border-b border-black items-center">
              <div>
                <p className="text-xs font-semibold">escalation email</p>
                <p className="text-[10px] opacity-40 mt-0.5 font-mono">
                  notified on human handoff
                </p>
              </div>
              <div className="col-span-2">
                <input
                  defaultValue={TENANT.escalationEmail}
                  className="w-full max-w-xs border border-black bg-transparent px-3 py-2 text-sm font-mono focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] transition-shadow"
                />
              </div>
            </div>

            {/* Plan */}
            <div className="grid grid-cols-3 px-6 py-4 items-center">
              <div>
                <p className="text-xs font-semibold">plan</p>
                <p className="text-[10px] opacity-40 mt-0.5 font-mono">
                  current billing tier
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-4">
                <span className="text-xs font-mono border border-black px-3 py-1.5 font-bold">
                  {TENANT.plan}
                </span>
                <div>
                  <p className="text-xs font-mono">
                    {TENANT.callsThisMonth.toLocaleString()} /{" "}
                    {TENANT.callLimit.toLocaleString()} calls this month
                  </p>
                  <div className="mt-1.5 h-1 w-48 bg-black/10">
                    <div
                      className="h-1 bg-black"
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-mono opacity-30 mt-0.5">
                    {usagePct}% used
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <button className="text-xs font-mono bg-black text-[#f0ebe0] px-4 py-2 hover:opacity-75 transition-opacity">
              save changes
            </button>
          </div>
        </section>

        {/* ── 2. API Keys ──────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Key size={13} />
            <h2 className="text-base font-bold">2. api keys</h2>
            <p className="text-[10px] font-mono opacity-30">
              / credentials /
            </p>
            <button className="ml-auto text-xs font-mono border border-black px-3 py-1.5 hover:bg-black hover:text-[#f0ebe0] transition-colors">
              + generate key
            </button>
          </div>
          <div className="border border-black">
            {API_KEYS.map((key, i) => (
              <div
                key={key.id}
                className={`px-5 py-4 flex items-center justify-between ${
                  i < API_KEYS.length - 1 ? "border-b border-black" : ""
                } ${key.status === "revoked" ? "opacity-35" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-semibold">{key.name}</p>
                    <p className="text-xs font-mono opacity-40 mt-0.5">
                      {key.prefix}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8 text-right">
                  <div>
                    <p className="text-xs font-mono opacity-40">
                      {key.permissions.join(" · ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono">
                      {key.lastUsed ?? "never used"}
                    </p>
                    <p className="text-[9px] opacity-30 font-mono">last used</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono">{key.createdAt}</p>
                    <p className="text-[9px] opacity-30 font-mono">created</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-1 border ${
                      key.status === "active"
                        ? "border-black"
                        : "border-black/25"
                    }`}
                  >
                    {key.status}
                  </span>
                  {key.status === "active" && (
                    <button className="text-[10px] font-mono opacity-30 hover:opacity-100 transition-opacity underline">
                      revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. Webhooks ─────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Globe size={13} />
            <h2 className="text-base font-bold">3. webhooks</h2>
            <p className="text-[10px] font-mono opacity-30">
              / outbound endpoints /
            </p>
            <button className="ml-auto text-xs font-mono border border-black px-3 py-1.5 hover:bg-black hover:text-[#f0ebe0] transition-colors">
              + add endpoint
            </button>
          </div>
          <div className="border border-black">
            {WEBHOOKS.map((wh, i) => (
              <div
                key={wh.id}
                className={`px-5 py-4 ${
                  i < WEBHOOKS.length - 1 ? "border-b border-black" : ""
                } ${wh.status === "paused" ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-mono font-medium">{wh.url}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          className="text-[9px] font-mono border border-black/25 px-1.5 py-0.5 opacity-60"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 ml-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-mono">
                        {wh.deliverySuccess}%
                      </p>
                      <p className="text-[9px] opacity-30 font-mono">
                        success rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono">
                        {wh.lastDelivery ?? "never"}
                      </p>
                      <p className="text-[9px] opacity-30 font-mono">
                        last delivery
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-1 border ${
                        wh.status === "active"
                          ? "border-black"
                          : "border-black/25"
                      }`}
                    >
                      {wh.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Team ─────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Users size={13} />
            <h2 className="text-base font-bold">4. team</h2>
            <p className="text-[10px] font-mono opacity-30">
              / access management /
            </p>
            <button className="ml-auto text-xs font-mono border border-black px-3 py-1.5 hover:bg-black hover:text-[#f0ebe0] transition-colors">
              + invite member
            </button>
          </div>
          <div className="border border-black">
            {TEAM_MEMBERS.map((member, i) => (
              <div
                key={member.id}
                className={`px-5 py-4 flex items-center justify-between ${
                  i < TEAM_MEMBERS.length - 1 ? "border-b border-black" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-black flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className="text-xs opacity-40 font-mono">
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs font-mono">{member.lastSeen}</p>
                    <p className="text-[9px] opacity-30 font-mono">last seen</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono">{member.joinedAt}</p>
                    <p className="text-[9px] opacity-30 font-mono">joined</p>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-1 border ${
                      member.role === "owner"
                        ? "border-black font-bold"
                        : "border-black/30"
                    }`}
                  >
                    {member.role}
                  </span>
                  {member.role !== "owner" && (
                    <button className="text-[10px] font-mono opacity-25 hover:opacity-60 transition-opacity">
                      remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
