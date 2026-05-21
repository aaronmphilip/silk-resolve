"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Eye, EyeOff, Zap, Cpu, Mic, Shield } from "lucide-react";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai-providers";

type Settings = Record<string, string>;

const VOICE_PROVIDERS = [
  { id: "twilio", label: "Twilio", note: "Phone number management, inbound call routing, SIP trunking." },
  { id: "elevenlabs", label: "ElevenLabs", note: "Neural voice synthesis for SILK prosody tags. Ultra-low latency." },
];

function Field({ label, value, onChange, secret = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  secret?: boolean; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="px-5 py-4 border-b border-[#f0ebe0]/10 last:border-b-0">
      <label className="block text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || (secret && value === "set" ? "key is set — enter new value to replace" : "")}
          className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1 pr-7"
        />
        {secret && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-0 top-0 opacity-30 hover:opacity-70">
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {value === "set" && <p className="text-[9px] font-mono opacity-20 mt-1">currently set — clear to remove, or type a new value to replace</p>}
    </div>
  );
}

function Section({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="opacity-40">{icon}</div>
        <div>
          <h2 className="text-sm font-bold text-[#f0ebe0]">{title}</h2>
          <p className="text-[10px] font-mono opacity-30">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setSettings(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: string) => (val: string) => setSettings((s) => ({ ...s, [key]: val }));

  async function save() {
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); await load(); setTimeout(() => setSaved(false), 3000); }
    else { const d = await res.json(); setError(d.error ?? "save failed"); }
  }

  async function testAI() {
    const key = settings.ai_api_key;
    if (!key || key === "set") { setError("enter an API key first to test it"); return; }
    setTesting(true); setTestResult(null); setError("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: settings.ai_provider ?? "anthropic", apiKey: key }),
    });
    setTesting(false);
    setTestResult(await res.json());
  }

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
        <p className="text-[10px] font-mono opacity-25 uppercase tracking-widest mb-1.5">/ admin / platform config /</p>
        <h1 className="text-2xl font-bold text-[#f0ebe0] tracking-tight">platform configuration.</h1>
        <p className="text-xs opacity-30 mt-1 font-mono">API keys configured here are used by all tenants. Only platform admins can access this page.</p>
      </div>

      <div className="px-8 py-8 space-y-10 max-w-2xl">

        {/* ── AI Provider ── */}
        <Section icon={<Cpu size={14} />} title="AI provider" subtitle="used for script generation and refinement across all tenants">
          <div className="space-y-2 mb-5">
            {AI_PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => set("ai_provider")(p.id)}
                className={`w-full text-left border p-4 transition-all ${settings.ai_provider === p.id || (!settings.ai_provider && p.id === "anthropic") ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-50 hover:opacity-80 hover:border-[#f0ebe0]/20"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-sm text-[#f0ebe0]">{p.label}</p>
                      <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-40">{p.model}</span>
                    </div>
                    <p className="text-xs opacity-40">{p.note}</p>
                    <p className="text-[10px] font-mono opacity-20 mt-0.5">key format: {p.keyHint}</p>
                  </div>
                  {(settings.ai_provider === p.id || (!settings.ai_provider && p.id === "anthropic")) && (
                    <div className="w-4 h-4 border border-[#f0ebe0]/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={10} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="border border-[#f0ebe0]/10">
            <Field label="api key" value={settings.ai_api_key ?? ""} onChange={set("ai_api_key")} secret placeholder="paste your API key" />
            <div className="px-5 py-3 flex items-center gap-4 border-t border-[#f0ebe0]/10">
              <button onClick={testAI} disabled={testing}
                className="flex items-center gap-2 text-xs font-mono border border-[#f0ebe0]/20 px-4 py-2 hover:border-[#f0ebe0]/50 transition-colors disabled:opacity-40">
                {testing ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                {testing ? "testing..." : "test key"}
              </button>
              {testResult && (
                <p className={`text-xs font-mono ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {testResult.ok ? "✓ working" : `✗ ${testResult.error}`}
                </p>
              )}
            </div>
          </div>

          <div className="mt-2 border border-[#f0ebe0]/5 bg-[#f0ebe0]/[0.02] px-4 py-3">
            <p className="text-[10px] font-mono opacity-25 leading-relaxed">
              You can also set <span className="text-[#f0ebe0]/50">ANTHROPIC_API_KEY</span> / <span className="text-[#f0ebe0]/50">OPENAI_API_KEY</span> / <span className="text-[#f0ebe0]/50">GEMINI_API_KEY</span> as Vercel environment variables.
              The DB value here takes priority over env vars.
            </p>
          </div>
        </Section>

        {/* ── Voice Provider ── */}
        <Section icon={<Mic size={14} />} title="voice infrastructure" subtitle="Vapi handles inbound calls · ElevenLabs handles voice synthesis">
          <div className="border border-[#f0ebe0]/10">

            {/* Vapi */}
            <div className="px-5 py-4 border-b border-[#f0ebe0]/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">vapi · call routing</p>
                <a href="https://vapi.ai" target="_blank" rel="noopener noreferrer"
                  className="text-[9px] font-mono opacity-20 hover:opacity-60 transition-opacity">vapi.ai ↗</a>
              </div>
              <div className="space-y-0">
                <Field label="api key" value={settings.vapi_api_key ?? ""} onChange={set("vapi_api_key")} secret placeholder="your Vapi API key" />
                <Field label="phone number" value={settings.vapi_phone_number ?? ""} onChange={set("vapi_phone_number")} placeholder="+91XXXXXXXXXX or +1XXXXXXXXXX" />
              </div>
              <div className="mt-3 bg-[#f0ebe0]/5 border border-[#f0ebe0]/10 px-4 py-3">
                <p className="text-[9px] font-mono opacity-30 mb-1.5">webhook url — paste into Vapi phone number settings</p>
                <p className="text-[10px] font-mono opacity-50 break-all">
                  {typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/api/voice/vapi-incoming
                </p>
              </div>
            </div>

            {/* SILK by Rumik */}
            <div className="px-5 py-4 border-b border-[#f0ebe0]/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">rumik silk · voice model</p>
                <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-30">highest priority</span>
              </div>
              <p className="text-[9px] font-mono opacity-20 mb-3">
                When set, SILK overrides ElevenLabs automatically. Add your key when Rumik gives you access.
              </p>
              <div className="space-y-0">
                <Field label="silk api key" value={settings.silk_api_key ?? ""} onChange={set("silk_api_key")} secret placeholder="paste SILK API key when available" />
                <Field label="voice / model id" value={settings.silk_voice_id ?? ""} onChange={set("silk_voice_id")} placeholder="silk-1 (leave blank for default)" />
                <Field label="api base url" value={settings.silk_base_url ?? ""} onChange={set("silk_base_url")} placeholder="https://api.rumik.ai/v1" />
              </div>
            </div>

            {/* ElevenLabs */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">elevenlabs · voice synthesis</p>
                <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer"
                  className="text-[9px] font-mono opacity-20 hover:opacity-60 transition-opacity">free tier available ↗</a>
              </div>
              <div className="space-y-0">
                <Field label="api key" value={settings.elevenlabs_api_key ?? ""} onChange={set("elevenlabs_api_key")} secret placeholder="your ElevenLabs API key" />
                <Field label="voice id" value={settings.elevenlabs_voice_id ?? ""} onChange={set("elevenlabs_voice_id")} placeholder="EXAVITQu4vr4xnSDxMaL" />
              </div>
              <p className="text-[9px] font-mono opacity-20 mt-2 leading-relaxed">
                Used for testing until SILK is available. If neither key is set, Vapi's built-in PlayHT voice is the fallback.
              </p>
            </div>
          </div>
          <p className="text-[9px] font-mono opacity-20 mt-2">
            Env fallbacks: VAPI_API_KEY · VAPI_PHONE_NUMBER · SILK_API_KEY · SILK_VOICE_ID · ELEVENLABS_API_KEY · ELEVENLABS_VOICE_ID
          </p>
        </Section>

        {/* ── Platform Admins ── */}
        <Section icon={<Shield size={14} />} title="platform admins" subtitle="who can access this admin panel">
          <div className="border border-[#f0ebe0]/10">
            <div className="px-5 py-4">
              <label className="block text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">admin emails</label>
              <input
                value={settings.admin_emails ?? ""}
                onChange={(e) => set("admin_emails")(e.target.value)}
                placeholder="you@company.com, colleague@company.com"
                className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
              />
              <p className="text-[9px] font-mono opacity-20 mt-1.5">Comma-separated. These users can access /admin. Also set PLATFORM_ADMIN_EMAILS in Vercel env as a backup.</p>
            </div>
          </div>
        </Section>

        {error && <p className="text-xs font-mono text-red-400 border border-red-400/20 px-3 py-2">{error}</p>}

        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-[#f0ebe0] text-[#0a0a0a] px-7 py-3 rounded-full text-sm font-medium hover:bg-[#f0ebe0]/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saving ? "saving..." : saved ? "saved!" : "save platform config"}
        </button>
      </div>
    </div>
  );
}
