"use client";
import { use, useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Zap, Plus, Trash2, Sparkles, Loader2, Phone, Copy, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { AgentScript, ScriptTool, EscalationRule, Integration } from "@/lib/types";

const VIBES = ["protective", "professional", "casual"] as const;
const LANGUAGES = ["Hinglish (hi-IN / en-IN)", "Hindi (hi-IN)", "English (en-IN)", "Tamil (ta-IN)", "Telugu (te-IN)"];
const BUILTIN_TOOLS: Omit<ScriptTool, "enabled">[] = [
  { id: "bt-001", name: "escalate_to_human", description: "Transfer call to a human agent with full context package", source: "builtin", params: ["reason", "priority"] },
  { id: "bt-002", name: "send_confirmation", description: "Send SMS + email confirmation to customer", source: "builtin", params: ["customer_id", "message"] },
  { id: "bt-003", name: "schedule_callback", description: "Schedule a callback at customer's preferred time", source: "builtin", params: ["customer_id", "preferred_time"] },
  { id: "bt-004", name: "log_complaint", description: "Log a formal complaint with tracking number", source: "builtin", params: ["customer_id", "description", "category"] },
];

type Tab = "prompt" | "identity" | "tools" | "rules" | "voice";

function mapDbScript(r: Record<string, unknown>): AgentScript {
  return {
    id: r.id as string,
    agentId: r.agent_id as string,
    agentName: r.agent_name as string,
    name: r.name as string,
    version: r.version as number,
    status: r.status as AgentScript["status"],
    systemPrompt: r.system_prompt as string,
    companionVibe: r.companion_vibe as AgentScript["companionVibe"],
    language: r.language as string,
    preferredAddress: r.preferred_address as string,
    linguisticNotes: r.linguistic_notes as string,
    tools: (r.tools as ScriptTool[]) ?? [],
    escalationRules: (r.escalation_rules as EscalationRule[]) ?? [],
    noGoTopics: (r.no_go_topics as string[]) ?? [],
    createdAt: ((r.created_at as string) || "").slice(0, 10),
    updatedAt: ((r.updated_at as string) || "").slice(0, 10),
  };
}

export default function ScriptEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [script, setScript] = useState<AgentScript | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("prompt");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadScript = useCallback(async () => {
    try {
      const [scriptRes, intgRes] = await Promise.all([
        fetch(`/api/scripts/${id}`),
        fetch("/api/integrations"),
      ]);
      if (scriptRes.ok) {
        const data = await scriptRes.json();
        const mapped = mapDbScript(data);
        setScript(mapped);
        // Also load agent's twilio_phone
        const agentRes = await fetch(`/api/agents/${mapped.agentId}`);
        if (agentRes.ok) {
          const agent = await agentRes.json();
          setTwilioPhone(agent.twilio_phone ?? "");
        }
      }
      if (intgRes.ok) {
        setIntegrations(await intgRes.json());
      }
    } catch {
      setError("failed to load script");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadScript(); }, [loadScript]);

  const update = <K extends keyof AgentScript>(k: K, v: AgentScript[K]) =>
    setScript((s) => s ? { ...s, [k]: v } : s);

  function toggleTool(id: string) {
    setScript((s) => s ? { ...s, tools: s.tools.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t) } : s);
  }

  function addBuiltinTool(bt: Omit<ScriptTool, "enabled">) {
    if (!script || script.tools.find((t) => t.id === bt.id)) return;
    setScript((s) => s ? { ...s, tools: [...s.tools, { ...bt, enabled: true }] } : s);
  }

  function removeRule(id: string) {
    setScript((s) => s ? { ...s, escalationRules: s.escalationRules.filter((r) => r.id !== id) } : s);
  }

  function toggleNoGo(topic: string) {
    setScript((s) => !s ? s : {
      ...s,
      noGoTopics: s.noGoTopics.includes(topic)
        ? s.noGoTopics.filter((t) => t !== topic)
        : [...s.noGoTopics, topic],
    });
  }

  async function handleSave() {
    if (!script) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/scripts/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(script),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "save failed");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (!script) return;
    const newStatus = script.status === "active" ? "draft" : "active";
    const res = await fetch(`/api/scripts/${script.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...script, status: newStatus }),
    });
    if (res.ok) update("status", newStatus);
  }

  async function handleSavePhone() {
    if (!script) return;
    setSavingPhone(true);
    try {
      await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: script.agentId, twilioPhone }),
      });
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 3000);
    } catch {
      setError("failed to save phone number");
    } finally {
      setSavingPhone(false);
    }
  }

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleAIRefine() {
    if (!script || refining) return;
    setRefining(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refineMode: true,
          existingScript: {
            systemPrompt: script.systemPrompt,
            escalationRules: script.escalationRules,
            linguisticNotes: script.linguisticNotes,
            noGoTopics: script.noGoTopics,
          },
          industry: "enterprise",
          company: script.agentName,
          useCase: script.name,
        }),
      });
      if (res.ok) {
        const refined = await res.json();
        setScript((s) => s ? {
          ...s,
          systemPrompt: refined.systemPrompt ?? s.systemPrompt,
          linguisticNotes: refined.linguisticNotes ?? s.linguisticNotes,
          escalationRules: refined.escalationRules ?? s.escalationRules,
          noGoTopics: refined.noGoTopics ?? s.noGoTopics,
          preferredAddress: refined.preferredAddress ?? s.preferredAddress,
        } : s);
      } else {
        const d = await res.json();
        setError(d.error ?? "AI refinement failed");
      }
    } catch {
      setError("AI refinement failed");
    } finally {
      setRefining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-sm opacity-40">
          <Loader2 size={14} className="animate-spin" />
          loading script...
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-sm opacity-40">script not found</p>
        <Link href="/scripts" className="text-xs font-mono underline opacity-50 hover:opacity-100">← back to scripts</Link>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "prompt", label: "Prompt" },
    { id: "identity", label: "Identity" },
    { id: "tools", label: `Tools (${script.tools.filter((t) => t.enabled).length})` },
    { id: "rules", label: `Rules (${script.escalationRules.length})` },
    { id: "voice", label: "Voice Setup" },
  ];

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const incomingWebhook = `${appUrl}/api/voice/vapi-incoming`;
  const eventsWebhook   = `${appUrl}/api/voice/vapi-events`;

  const connectedIntegrations = integrations.filter((i) => i.status === "connected");
  const pendingIntegrations = integrations.filter((i) => i.status !== "connected");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-black px-8 py-5 flex-shrink-0">
        <Link href="/scripts" className="flex items-center gap-2 text-xs font-mono opacity-40 hover:opacity-100 transition-opacity mb-4">
          <ArrowLeft size={11} /> back to scripts
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">/ {script.id} /</p>
            <h1 className="text-2xl font-bold tracking-tight">{script.name}</h1>
            <p className="text-xs opacity-40 mt-0.5">{script.agentName} · v{script.version}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono border px-2.5 py-1 ${script.status === "active" ? "border-black font-bold" : "border-black/30 opacity-50"}`}>
              {script.status}
            </span>
            <button onClick={handleAIRefine} disabled={refining}
              className="flex items-center gap-2 border border-black/30 px-4 py-2 text-xs font-mono hover:border-black hover:bg-black/5 transition-colors disabled:opacity-40">
              {refining ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {refining ? "refining..." : "ai refine"}
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 border border-black px-4 py-2 text-xs font-mono hover:bg-black/5 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? "saving..." : saved ? "saved ✓" : "save"}
            </button>
            <button onClick={handleActivate}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono transition-opacity hover:opacity-75 ${script.status === "active" ? "bg-black/20 border border-black" : "bg-black text-[#f0ebe0]"}`}>
              <Zap size={11} /> {script.status === "active" ? "deactivate" : "activate"}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-[11px] font-mono text-red-600 dark:text-red-400 border border-red-500/30 px-3 py-1.5 bg-red-500/10">{error}</p>}
      </div>

      {/* Tabs */}
      <div className="border-b border-black flex flex-shrink-0">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-6 py-3 text-xs font-mono transition-all border-r border-black/10 ${tab === t.id ? "bg-black text-[#f0ebe0]" : "opacity-40 hover:opacity-80"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-8 py-8">

        {/* ── PROMPT TAB ── */}
        {tab === "prompt" && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">system prompt</p>
                <p className="text-xs opacity-40">This is the instruction set your agent receives at the start of every call.</p>
              </div>
              <p className="text-[10px] font-mono opacity-30">{script.systemPrompt.length} chars</p>
            </div>
            <textarea
              value={script.systemPrompt}
              onChange={(e) => update("systemPrompt", e.target.value)}
              className="w-full border border-black bg-transparent px-5 py-4 text-sm font-mono leading-relaxed focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,0.85)] transition-shadow resize-none"
              rows={28}
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <p className="text-[10px] font-mono opacity-30 mr-2 self-center">insert variable:</p>
              {["{{preferred_address}}", "{{language}}", "{{customer_name}}", "{{account_id}}", "{{tension_level}}", "{{emotional_debt}}"].map((v) => (
                <button key={v} onClick={() => update("systemPrompt", script.systemPrompt + v)}
                  className="text-[9px] font-mono border border-black/30 px-2 py-1 hover:border-black hover:bg-black/5 transition-all opacity-60">
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── IDENTITY TAB ── */}
        {tab === "identity" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">companion vibe</p>
              <div className="grid grid-cols-3 gap-3">
                {VIBES.map((v) => (
                  <button key={v} onClick={() => update("companionVibe", v)}
                    className={`border p-4 text-left transition-all ${script.companionVibe === v ? "border-black bg-black/5 shadow-[2px_2px_0px_rgba(0,0,0,0.85)]" : "border-black/30 hover:border-black"}`}>
                    <p className="font-bold text-sm capitalize mb-1">{v}</p>
                    <p className="text-[11px] opacity-40 leading-snug">
                      {v === "protective" && "Warm, empathetic. Uses Hinglish. Holds space for emotion."}
                      {v === "professional" && "Formal, precise. Respects time. Minimal warmth."}
                      {v === "casual" && "Friendly, light. Humour when tension drops. Relatable."}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">primary language</label>
                <select value={script.language} onChange={(e) => update("language", e.target.value)}
                  className="w-full border border-black bg-[#f0ebe0] px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none">
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">preferred address</label>
                <input value={script.preferredAddress} onChange={(e) => update("preferredAddress", e.target.value)}
                  placeholder="Sir/Ma'am, Ji, Bhaiya..."
                  className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">linguistic notes</label>
              <textarea value={script.linguisticNotes} onChange={(e) => update("linguisticNotes", e.target.value)}
                rows={4} className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] resize-none" />
              <p className="text-[9px] font-mono opacity-25 mt-1.5">When to code-switch, when to use humour, tonal rules. SILK reads this before every utterance.</p>
            </div>

            <div className="border border-black/10 bg-black/[0.02] px-4 py-3">
              <p className="text-[10px] font-mono opacity-40 mb-2 uppercase tracking-widest">script name</p>
              <input value={script.name} onChange={(e) => update("name", e.target.value)}
                className="w-full bg-transparent text-sm font-mono border-b border-black/20 pb-1 focus:outline-none focus:border-black" />
            </div>
          </div>
        )}

        {/* ── TOOLS TAB ── */}
        {tab === "tools" && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">active tools</p>
              <p className="text-xs opacity-40">Tools your agent can call mid-conversation. From your connected integrations + built-ins.</p>
            </div>

            {connectedIntegrations.map((intg) => (
              <div key={intg.id} className="border border-black mb-4">
                <div className="px-5 py-3 border-b border-black bg-black/[0.03] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold">{intg.name}</p>
                    <span className="text-[9px] font-mono border border-black/30 px-1.5 py-0.5 opacity-50">{intg.type}</span>
                  </div>
                  <span className="text-[9px] font-mono opacity-40">{intg.endpoints.length} endpoints</span>
                </div>
                {intg.endpoints.map((ep, i) => {
                  const existing = script.tools.find((t) => t.name === ep.toolName);
                  const enabled = existing?.enabled ?? false;
                  return (
                    <div key={ep.id} className={`flex items-center justify-between px-5 py-3.5 ${i < intg.endpoints.length - 1 ? "border-b border-black/10" : ""}`}>
                      <div>
                        <p className="text-sm font-mono font-medium">{ep.toolName}()</p>
                        <p className="text-[10px] opacity-40 mt-0.5">{ep.description}</p>
                        <p className="text-[9px] font-mono opacity-25 mt-0.5">{ep.method} {ep.path}</p>
                      </div>
                      <button onClick={() => {
                        if (existing) toggleTool(existing.id);
                        else setScript((s) => s ? { ...s, tools: [...s.tools, { id: ep.id, name: ep.toolName, description: ep.description, source: "integration", integrationId: intg.id, enabled: true, params: ep.params }] } : s);
                      }} className={`text-[10px] font-mono border px-3 py-1.5 transition-all ${enabled ? "border-black bg-black text-[#f0ebe0]" : "border-black/30 hover:border-black"}`}>
                        {enabled ? "enabled" : "disabled"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Built-in tools */}
            <div className="border border-black mb-4">
              <div className="px-5 py-3 border-b border-black bg-black/[0.03]">
                <p className="text-xs font-bold">Built-in Tools</p>
              </div>
              {BUILTIN_TOOLS.map((bt, i) => {
                const existing = script.tools.find((t) => t.id === bt.id);
                const enabled = existing?.enabled ?? false;
                return (
                  <div key={bt.id} className={`flex items-center justify-between px-5 py-3.5 ${i < BUILTIN_TOOLS.length - 1 ? "border-b border-black/10" : ""}`}>
                    <div>
                      <p className="text-sm font-mono font-medium">{bt.name}()</p>
                      <p className="text-[10px] opacity-40 mt-0.5">{bt.description}</p>
                    </div>
                    <button onClick={() => existing ? toggleTool(existing.id) : addBuiltinTool(bt)}
                      className={`text-[10px] font-mono border px-3 py-1.5 transition-all ${enabled ? "border-black bg-black text-[#f0ebe0]" : "border-black/30 hover:border-black"}`}>
                      {enabled ? "enabled" : "disabled"}
                    </button>
                  </div>
                );
              })}
            </div>

            {pendingIntegrations.length > 0 && (
              <div className="border border-dashed border-black/20 px-5 py-4 flex items-center justify-between">
                <p className="text-xs opacity-40">{pendingIntegrations.length} integration(s) pending — connect to unlock more tools</p>
                <Link href="/integrations" className="text-[10px] font-mono underline opacity-50 hover:opacity-100">connect integrations →</Link>
              </div>
            )}

            {integrations.length === 0 && (
              <div className="border border-dashed border-black/20 px-5 py-4 flex items-center justify-between">
                <p className="text-xs opacity-40">no integrations connected yet — add your CRM or database to unlock custom tools</p>
                <Link href="/integrations" className="text-[10px] font-mono underline opacity-50 hover:opacity-100">add integration →</Link>
              </div>
            )}
          </div>
        )}

        {/* ── RULES TAB ── */}
        {tab === "rules" && (
          <div className="max-w-3xl">
            <div className="mb-6">
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">escalation rules</p>
              <p className="text-xs opacity-40">Conditions under which your agent transfers to a human or takes a fallback action.</p>
            </div>

            <div className="border border-black mb-8">
              {script.escalationRules.length === 0 && (
                <div className="px-5 py-6 text-center text-xs font-mono opacity-30">
                  no rules yet — use AI Refine to generate them automatically
                </div>
              )}
              {script.escalationRules.map((rule, i) => (
                <div key={rule.id} className={`flex items-start justify-between px-5 py-4 gap-4 ${i < script.escalationRules.length - 1 ? "border-b border-black" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono border border-black/30 px-1.5 py-0.5 opacity-50">{rule.trigger.replace(/_/g, " ")}</span>
                      <span className="text-[9px] font-mono border border-black px-1.5 py-0.5 font-bold">{rule.action.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-sm font-mono">{rule.condition}</p>
                  </div>
                  <button onClick={() => removeRule(rule.id)} className="opacity-20 hover:opacity-60 transition-opacity flex-shrink-0 mt-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">no-go topics</p>
                <p className="text-xs opacity-30 font-mono">agent will redirect if these come up</p>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {script.noGoTopics.map((topic) => (
                  <button key={topic} onClick={() => toggleNoGo(topic)}
                    className="text-xs font-mono border border-black px-3 py-1.5 hover:bg-black hover:text-[#f0ebe0] transition-all">
                    {topic} ×
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="add topic (e.g. 'legal action')"
                  className="flex-1 border border-black/30 bg-transparent px-3 py-2 text-xs font-mono placeholder:opacity-25 focus:outline-none focus:border-black"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.currentTarget.value.trim()) {
                      toggleNoGo(e.currentTarget.value.trim());
                      e.currentTarget.value = "";
                    }
                  }} />
                <button className="border border-black px-3 py-2 text-xs font-mono hover:bg-black/5 flex items-center gap-1.5">
                  <Plus size={10} /> add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VOICE SETUP TAB ── */}
        {tab === "voice" && (
          <div className="max-w-2xl space-y-8">

            {/* Status banner */}
            <div className={`border px-5 py-4 flex items-center gap-4 ${script.status === "active" && twilioPhone ? "border-emerald-700 bg-emerald-50" : "border-black/20 bg-black/[0.02]"}`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${script.status === "active" && twilioPhone ? "bg-emerald-500 animate-pulse" : "bg-black/20"}`} />
              <div>
                <p className="text-sm font-bold">
                  {script.status === "active" && twilioPhone ? "Agent is LIVE — receiving calls" : "Agent not yet live"}
                </p>
                <p className="text-[10px] font-mono opacity-40 mt-0.5">
                  {script.status !== "active"
                    ? "Activate this script first, then assign a Twilio phone number below."
                    : !twilioPhone
                    ? "Script is active but no phone number is assigned. Add one below."
                    : `Calls to ${twilioPhone} route to this agent.`}
                </p>
              </div>
            </div>

            {/* Phone number assignment */}
            <div>
              <div className="mb-4">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">twilio phone number</p>
                <p className="text-xs opacity-40">The number callers dial to reach this agent. Assign one Twilio number per agent.</p>
              </div>
              <div className="border border-black">
                <div className="px-5 py-4">
                  <label className="block text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">phone number (E.164 format)</label>
                  <input
                    value={twilioPhone}
                    onChange={(e) => setTwilioPhone(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full bg-transparent text-sm font-mono placeholder:opacity-25 focus:outline-none border-b border-black/20 focus:border-black pb-1"
                  />
                  <p className="text-[9px] font-mono opacity-20 mt-1.5">Must match a number in your Twilio console exactly</p>
                </div>
                <div className="px-5 py-3 border-t border-black/10 flex items-center gap-3">
                  <button onClick={handleSavePhone} disabled={savingPhone}
                    className="flex items-center gap-2 bg-black text-[#f0ebe0] px-4 py-2 text-xs font-mono hover:bg-black/80 transition-colors disabled:opacity-50">
                    {savingPhone ? <Loader2 size={10} className="animate-spin" /> : <Phone size={10} />}
                    {savingPhone ? "saving..." : "assign number"}
                  </button>
                  {phoneSaved && (
                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-700">
                      <CheckCircle2 size={11} /> saved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Webhook URLs */}
            <div>
              <div className="mb-4">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">twilio webhook configuration</p>
                <p className="text-xs opacity-40">Configure these URLs in your Twilio console under the phone number settings.</p>
              </div>
              <div className="border border-black divide-y divide-black/10">
                {[
                  { label: "Server URL (incoming calls + assistant config)", url: incomingWebhook, method: "HTTP POST" },
                  { label: "Events URL (end-of-call, tools)", url: eventsWebhook, method: "HTTP POST" },
                ].map(({ label, url, method }) => (
                  <div key={url} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-mono opacity-40">{label}</p>
                      <span className="text-[9px] font-mono border border-black/20 px-1.5 py-0.5 opacity-30">{method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-xs font-mono bg-black/[0.04] px-3 py-2 truncate">{url}</code>
                      <button onClick={() => copyWebhook(url)} className="flex items-center gap-1 text-[10px] font-mono border border-black/30 px-2.5 py-1.5 hover:border-black transition-colors">
                        {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                        {copied ? "copied" : "copy"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup guide */}
            <div className="border border-dashed border-black/20 px-5 py-5">
              <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-3">setup checklist</p>
              <ol className="space-y-2.5 text-xs font-mono opacity-50">
                <li>1. Add VAPI_PRIVATE_KEY + VAPI_PUBLIC_KEY to your Vercel env vars</li>
                <li>2. Sign up at <span className="opacity-70">vapi.ai</span> → Phone Numbers → Buy a number</li>
                <li>3. In Vapi: set the phone number's <span className="opacity-70">Server URL</span> to the webhook URL above</li>
                <li>4. Paste the phone number in the field above → click "assign number"</li>
                <li>5. Activate this script — calls will now route to this agent</li>
                <li className="opacity-60">Voice: SILK (Rumik) if SILK_API_KEY is set, else Vapi PlayHT (no extra key needed)</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
