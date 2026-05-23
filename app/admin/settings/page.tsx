"use client";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, Eye, EyeOff, Zap, Cpu, Mic, Shield, AlertCircle } from "lucide-react";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai-providers";

type Settings = Record<string, string>;

function Field({
  label, hint, value, onChange, secret = false, placeholder = "", mono = true,
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  secret?: boolean; placeholder?: string; mono?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isSet = secret && value === "set";
  return (
    <div className="py-4 border-b border-black/10 last:border-b-0">
      <label className="block text-xs font-semibold text-black mb-1">{label}</label>
      {hint && <p className="text-[11px] text-black/50 mb-2">{hint}</p>}
      <div className="relative">
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? "key is set — type new value to replace" : placeholder}
          className={`w-full bg-white border-2 border-black/20 focus:border-black text-sm text-black placeholder:text-black/30 focus:outline-none px-3 py-2.5 pr-10 transition-colors ${mono ? "font-mono" : ""}`}
        />
        {secret && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {isSet && (
        <p className="text-[11px] text-emerald-700 font-mono mt-1 flex items-center gap-1">
          <Check size={10} /> key is saved — enter a new value to replace it
        </p>
      )}
    </div>
  );
}

function Section({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-black">
      <div className="bg-black px-5 py-4 flex items-center gap-3">
        <div className="text-[#e8dece]">{icon}</div>
        <div>
          <h2 className="text-sm font-bold text-[#e8dece]">{title}</h2>
          <p className="text-[11px] text-[#e8dece]/60 font-mono mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 bg-white">{children}</div>
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
    if (res.ok) {
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Save failed — check console for details");
    }
  }

  async function testAI() {
    const key = settings.ai_api_key;
    if (!key || key === "set") { setError("Enter an API key first to test it"); return; }
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
        <Loader2 size={18} className="animate-spin text-black/40" />
      </div>
    );
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app";

  return (
    <div className="min-h-screen bg-[#e8dece]">
      {/* Header */}
      <div className="border-b-2 border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-1.5">/ admin / platform config /</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">platform configuration.</h1>
        <p className="text-xs text-black/50 mt-1 font-mono">
          API keys here are platform-wide. Only platform admins can access this page.
        </p>
      </div>

      <div className="px-5 sm:px-8 py-8 space-y-8 max-w-2xl">

        {/* ── AI Provider ── */}
        <Section icon={<Cpu size={16} />} title="AI Provider" subtitle="Powers LLM responses on every call">
          <div className="space-y-2 py-4">
            {AI_PROVIDERS.map((p) => {
              const active = settings.ai_provider === p.id || (!settings.ai_provider && p.id === "anthropic");
              return (
                <button
                  key={p.id}
                  onClick={() => set("ai_provider")(p.id)}
                  className={`w-full text-left border-2 p-4 transition-all ${active ? "border-black bg-black/5" : "border-black/20 hover:border-black/50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-black">{p.label}</p>
                        <span className="text-[10px] font-mono border border-black/30 px-1.5 py-0.5 text-black/60">{p.model}</span>
                      </div>
                      <p className="text-xs text-black/60">{p.note}</p>
                      <p className="text-[10px] font-mono text-black/40 mt-0.5">key format: {p.keyHint}</p>
                    </div>
                    {active && (
                      <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={11} className="text-[#e8dece]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Field
            label="API Key"
            hint="Paste your API key for the selected provider above"
            value={settings.ai_api_key ?? ""}
            onChange={set("ai_api_key")}
            secret
            placeholder="sk-... or similar"
          />

          <div className="py-4 flex flex-wrap items-center gap-4 border-t border-black/10">
            <button
              onClick={testAI}
              disabled={testing}
              className="flex items-center gap-2 text-xs font-mono border-2 border-black px-4 py-2 hover:bg-black hover:text-[#e8dece] transition-colors disabled:opacity-40"
            >
              {testing ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
              {testing ? "testing..." : "test key"}
            </button>
            {testResult && (
              <p className={`text-xs font-mono font-semibold ${testResult.ok ? "text-emerald-700" : "text-red-600"}`}>
                {testResult.ok ? "✓ key works" : `✗ ${testResult.error}`}
              </p>
            )}
          </div>

          <p className="text-[10px] font-mono text-black/40 pb-4">
            Env fallbacks: ANTHROPIC_API_KEY · OPENAI_API_KEY · GEMINI_API_KEY · XAI_API_KEY
          </p>
        </Section>

        {/* ── Vapi ── */}
        <Section icon={<Mic size={16} />} title="Vapi — Call Routing" subtitle="Handles STT, call orchestration, and inbound routing">
          <div className="pt-2">
            <div className="bg-amber-50 border-2 border-amber-300 px-4 py-3 my-4">
              <p className="text-xs font-semibold text-amber-800 mb-1">Where to find your Vapi keys</p>
              <p className="text-[11px] text-amber-700">
                Vapi Dashboard → Account → API Keys. You&apos;ll see a <strong>Public Key</strong> (starts with a shorter string) and a <strong>Private Key</strong> (longer, starts with your account prefix). Add both below.
              </p>
            </div>

            <Field
              label="Public Key (browser SDK)"
              hint="Used by the Talk button and test-call page. Safe to use in the browser."
              value={settings.vapi_public_key ?? ""}
              onChange={set("vapi_public_key")}
              secret
              placeholder="vapi public key from dashboard"
            />
            <Field
              label="Private Key (server only)"
              hint="Used server-side to list calls, pull transcripts, etc. Never sent to browser."
              value={settings.vapi_private_key ?? ""}
              onChange={set("vapi_private_key")}
              secret
              placeholder="vapi private key from dashboard"
            />
            <Field
              label="Phone Number (optional)"
              hint="Your Vapi/Twilio inbound number. Leave blank if using browser calls only."
              value={settings.vapi_phone_number ?? ""}
              onChange={set("vapi_phone_number")}
              placeholder="+91XXXXXXXXXX or +1XXXXXXXXXX"
            />

            <div className="bg-black/5 border border-black/20 px-4 py-3 my-4">
              <p className="text-[10px] font-mono text-black/50 mb-1.5 font-semibold uppercase tracking-widest">Webhook URL</p>
              <p className="text-xs font-mono text-black break-all select-all">{appUrl}/api/voice/vapi-incoming</p>
              <p className="text-[10px] text-black/40 mt-1">Paste this into Vapi → Phone Numbers → your number → Server URL</p>
            </div>

            <p className="text-[10px] font-mono text-black/40 pb-4">
              Env fallbacks: VAPI_PUBLIC_KEY · VAPI_PRIVATE_KEY · VAPI_PHONE_NUMBER
            </p>
          </div>
        </Section>

        {/* ── SILK by Rumik ── */}
        <Section icon={<Mic size={16} />} title="SILK by Rumik — Voice Model" subtitle="Primary voice synthesis. Overrides ElevenLabs when configured.">
          <div className="bg-emerald-50 border-2 border-emerald-300 px-4 py-3 my-4">
            <p className="text-xs font-semibold text-emerald-800">
              When your SILK API key is added here, every call automatically switches from ElevenLabs to SILK. No code change needed.
            </p>
          </div>
          <Field
            label="SILK API Key"
            hint="Add when Rumik gives you access"
            value={settings.silk_api_key ?? ""}
            onChange={set("silk_api_key")}
            secret
            placeholder="silk key from Rumik"
          />
          <Field
            label="Voice / Model ID"
            hint="Leave blank to use the default SILK voice"
            value={settings.silk_voice_id ?? ""}
            onChange={set("silk_voice_id")}
            placeholder="silk-1"
          />
          <Field
            label="API Base URL"
            value={settings.silk_base_url ?? ""}
            onChange={set("silk_base_url")}
            placeholder="https://api.rumik.ai/v1"
          />
          <p className="text-[10px] font-mono text-black/40 pb-4">Env fallbacks: SILK_API_KEY · SILK_VOICE_ID · SILK_BASE_URL</p>
        </Section>

        {/* ── ElevenLabs ── */}
        <Section icon={<Mic size={16} />} title="ElevenLabs — Voice Fallback" subtitle="Used when SILK is not configured. Free tier available.">
          <Field
            label="API Key"
            value={settings.elevenlabs_api_key ?? ""}
            onChange={set("elevenlabs_api_key")}
            secret
            placeholder="your ElevenLabs API key"
          />
          <Field
            label="Voice ID"
            hint="Find voice IDs in ElevenLabs → Voice Library"
            value={settings.elevenlabs_voice_id ?? ""}
            onChange={set("elevenlabs_voice_id")}
            placeholder="EXAVITQu4vr4xnSDxMaL"
          />
          <p className="text-[10px] font-mono text-black/40 pb-4">Env fallbacks: ELEVENLABS_API_KEY · ELEVENLABS_VOICE_ID</p>
        </Section>

        {/* ── Platform Admins ── */}
        <Section icon={<Shield size={16} />} title="Platform Admins" subtitle="Who can access this /admin panel">
          <div className="py-4">
            <label className="block text-xs font-semibold text-black mb-1">Admin Emails</label>
            <p className="text-[11px] text-black/50 mb-2">Comma-separated. These users can access /admin regardless of their tenant.</p>
            <textarea
              value={settings.admin_emails ?? ""}
              onChange={(e) => set("admin_emails")(e.target.value)}
              placeholder="you@company.com, colleague@company.com"
              rows={3}
              className="w-full bg-white border-2 border-black/20 focus:border-black text-sm font-mono text-black placeholder:text-black/30 focus:outline-none px-3 py-2.5 transition-colors resize-none"
            />
            <p className="text-[10px] font-mono text-black/40 mt-2">
              Also set PLATFORM_ADMIN_EMAILS in Vercel env as a backup (comma-separated).
            </p>
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 border-2 border-red-400 bg-red-50 px-4 py-3">
            <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-mono text-red-700">{error}</p>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-4 pb-8">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-black text-[#e8dece] px-8 py-3 text-sm font-bold hover:bg-black/80 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saving ? "saving..." : saved ? "saved!" : "save platform config"}
          </button>
          {saved && <p className="text-sm font-mono text-emerald-700">All settings saved successfully.</p>}
        </div>
      </div>
    </div>
  );
}
