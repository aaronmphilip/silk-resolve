"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, User, Globe, Users } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  createdAt: string;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  callsThisMonth: number;
  callLimit: number;
  timezone: string;
  language: string;
  escalationEmail: string;
}

type Tab = "profile" | "workspace" | "team";

const TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Singapore", "Asia/Dubai"];
const LANGUAGES = ["Hinglish (hi-IN / en-IN)", "Hindi (hi-IN)", "English (en-IN)", "Tamil (ta-IN)", "Telugu (te-IN)", "Marathi (mr-IN)"];

// ── Save button helper ────────────────────────────────────────────────────────

function SaveBtn({ onClick, loading, saved, label = "save changes" }: { onClick: () => void; loading: boolean; saved: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 text-xs font-mono bg-black text-[#f0ebe0] px-5 py-2.5 rounded-full hover:bg-black/80 transition-colors disabled:opacity-50">
      {loading ? <Loader2 size={11} className="animate-spin" /> : saved ? <Check size={11} /> : null}
      {loading ? "saving..." : saved ? "saved!" : label}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Workspace state
  const [wsName, setWsName] = useState("");
  const [wsTimezone, setWsTimezone] = useState("");
  const [wsLanguage, setWsLanguage] = useState("");
  const [wsEscalationEmail, setWsEscalationEmail] = useState("");
  const [wsSaving, setWsSaving] = useState(false);
  const [wsSaved, setWsSaved] = useState(false);
  const [wsError, setWsError] = useState("");


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const d = await res.json();
        setUser(d.user);
        setFirstName(d.user.firstName);
        setLastName(d.user.lastName);
        if (d.tenant) {
          setTenant(d.tenant);
          setWsName(d.tenant.name);
          setWsTimezone(d.tenant.timezone);
          setWsLanguage(d.tenant.language);
          setWsEscalationEmail(d.tenant.escalationEmail);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setProfileSaving(true); setProfileError("");
    const res = await fetch("/api/settings/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    setProfileSaving(false);
    if (res.ok) { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 3000); }
    else { const d = await res.json(); setProfileError(d.error ?? "save failed"); }
  }

  async function saveWorkspace() {
    setWsSaving(true); setWsError("");
    const res = await fetch("/api/settings/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: wsName, timezone: wsTimezone, language: wsLanguage, escalationEmail: wsEscalationEmail }),
    });
    setWsSaving(false);
    if (res.ok) { setWsSaved(true); setTimeout(() => setWsSaved(false), 3000); }
    else { const d = await res.json(); setWsError(d.error ?? "save failed"); }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={12} /> },
    { id: "workspace", label: "Workspace", icon: <Globe size={12} /> },
    { id: "team", label: "Team", icon: <Users size={12} /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-sm opacity-40">
          <Loader2 size={14} className="animate-spin" /> loading settings...
        </div>
      </div>
    );
  }

  const usagePct = tenant ? Math.round((tenant.callsThisMonth / tenant.callLimit) * 100) : 0;
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? "?");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ settings /</p>
        <h1 className="text-3xl font-bold tracking-tight">settings.</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-black flex">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-mono transition-all border-r border-black/10 ${tab === t.id ? "bg-black text-[#f0ebe0]" : "opacity-40 hover:opacity-80"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="px-8 py-8 max-w-2xl">

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && user && (
          <div className="space-y-8">
            {/* Avatar + IDs */}
            <div className="border border-black p-6 flex items-start gap-6">
              <div className="w-16 h-16 border border-black flex items-center justify-center text-xl font-bold font-mono flex-shrink-0 bg-black text-[#f0ebe0]">
                {initials}
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold">{firstName || lastName ? `${firstName} ${lastName}`.trim() : user.email}</p>
                  <span className="text-[10px] font-mono border border-black/30 px-2 py-0.5 opacity-50">{user.role}</span>
                </div>
                <p className="text-sm font-mono opacity-40">{user.email}</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3 pt-3 border-t border-black/10">
                  <div>
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">user id</p>
                    <p className="text-[11px] font-mono opacity-60 mt-0.5 break-all">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">tenant id</p>
                    <p className="text-[11px] font-mono opacity-60 mt-0.5 break-all">{user.tenantId ?? "—"}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">member since</p>
                    <p className="text-[11px] font-mono opacity-60 mt-0.5">{new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="mt-2">
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">plan</p>
                    <p className="text-[11px] font-mono opacity-60 mt-0.5 capitalize">{tenant?.plan ?? "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit name */}
            <div>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">display name</p>
              <div className="border border-black">
                <div className="grid grid-cols-2 border-b border-black">
                  <div className="px-5 py-4 border-r border-black">
                    <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">first name</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Aarush"
                      className="w-full bg-transparent text-sm font-mono focus:outline-none border-b border-transparent focus:border-black" />
                  </div>
                  <div className="px-5 py-4">
                    <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">last name</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                      placeholder="Mehta"
                      className="w-full bg-transparent text-sm font-mono focus:outline-none border-b border-transparent focus:border-black" />
                  </div>
                </div>
                <div className="px-5 py-4">
                  <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">email</label>
                  <p className="text-sm font-mono opacity-50">{user.email} <span className="text-[9px] border border-black/20 px-1.5 py-0.5 ml-2">read-only</span></p>
                </div>
              </div>
              {profileError && <p className="mt-2 text-xs font-mono text-red-700">{profileError}</p>}
              <div className="mt-3">
                <SaveBtn onClick={saveProfile} loading={profileSaving} saved={profileSaved} />
              </div>
            </div>

            {/* Role info */}
            <div className="border border-black/10 bg-black/[0.02] px-5 py-4">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">access level</p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono border border-black px-3 py-1.5 font-bold capitalize">{user.role}</span>
                <p className="text-xs opacity-40 font-mono">
                  {user.role === "owner" && "Full access — billing, team, all agents, all settings."}
                  {user.role === "admin" && "Can manage agents, scripts, integrations. Cannot change billing."}
                  {user.role === "viewer" && "Read-only access to calls, analytics, and agents."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── WORKSPACE TAB ── */}
        {tab === "workspace" && tenant && (
          <div className="space-y-8">
            {/* Usage */}
            <div className="border border-black p-5 flex items-start justify-between gap-6">
              <div>
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">current plan</p>
                <p className="text-2xl font-bold capitalize">{tenant.plan}</p>
                <p className="text-xs opacity-40 font-mono mt-1">{tenant.callsThisMonth.toLocaleString()} / {tenant.callLimit.toLocaleString()} calls this month</p>
              </div>
              <div className="flex-1 max-w-xs">
                <div className="h-2 bg-black/8 border border-black/10 mt-6">
                  <div className="h-full bg-black transition-all" style={{ width: `${Math.min(usagePct, 100)}%` }} />
                </div>
                <p className="text-[9px] font-mono opacity-30 mt-1">{usagePct}% used</p>
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">workspace config</p>
              <div className="border border-black">
                {[
                  { label: "company name", value: wsName, set: setWsName, placeholder: "Apollo Healthcare" },
                  { label: "escalation email", value: wsEscalationEmail, set: setWsEscalationEmail, placeholder: "oncall@company.com" },
                ].map(({ label, value, set, placeholder }, i, arr) => (
                  <div key={label} className={`px-5 py-4 ${i < arr.length - 1 ? "border-b border-black" : ""}`}>
                    <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">{label}</label>
                    <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                      className="w-full bg-transparent text-sm font-mono focus:outline-none border-b border-transparent focus:border-black" />
                  </div>
                ))}
                <div className="px-5 py-4 border-t border-black grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">timezone</label>
                    <select value={wsTimezone} onChange={(e) => setWsTimezone(e.target.value)}
                      className="w-full bg-transparent text-sm font-mono focus:outline-none appearance-none border-b border-black/20 pb-1">
                      {TIMEZONES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">primary language</label>
                    <select value={wsLanguage} onChange={(e) => setWsLanguage(e.target.value)}
                      className="w-full bg-transparent text-sm font-mono focus:outline-none appearance-none border-b border-black/20 pb-1">
                      {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              {wsError && <p className="mt-2 text-xs font-mono text-red-700">{wsError}</p>}
              <div className="mt-3">
                <SaveBtn onClick={saveWorkspace} loading={wsSaving} saved={wsSaved} />
              </div>
            </div>

            {/* IDs */}
            <div className="border border-black/10 bg-black/[0.02] px-5 py-4 space-y-2">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-3">workspace identifiers</p>
              {[
                { label: "tenant id", value: tenant.id },
                { label: "slug", value: tenant.slug },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest w-24">{label}</p>
                  <p className="text-xs font-mono opacity-60 break-all flex-1">{value}</p>
                  <button onClick={() => navigator.clipboard.writeText(value)}
                    className="text-[9px] font-mono opacity-30 hover:opacity-70 border border-black/20 px-2 py-1">copy</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEAM TAB ── */}
        {tab === "team" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">team members</p>
              <button className="text-xs font-mono border border-black px-4 py-2 rounded-full hover:bg-black hover:text-[#f0ebe0] transition-colors">
                + invite member
              </button>
            </div>

            {/* Current user always shown */}
            {user && (
              <div className="border border-black">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border border-black bg-black text-[#f0ebe0] flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{firstName || lastName ? `${firstName} ${lastName}`.trim() : "You"}</p>
                      <p className="text-xs opacity-40 font-mono">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono border border-black px-2.5 py-1 font-bold capitalize">{user.role}</span>
                    <span className="text-[10px] font-mono opacity-25">you</span>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-dashed border-black/20 px-5 py-8 text-center">
              <p className="text-xs opacity-40 font-mono mb-2">invite teammates to collaborate on agents and scripts</p>
              <p className="text-[10px] opacity-25 font-mono">team invitations coming soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
