"use client";
import { useState } from "react";
import { ArrowLeft, Save, Zap, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { SCRIPTS, INTEGRATIONS } from "@/lib/mock-data";
import type { AgentScript, ScriptTool, EscalationRule } from "@/lib/types";

const VIBES = ["protective", "professional", "casual"] as const;
const LANGUAGES = ["Hinglish (hi-IN / en-IN)", "Hindi (hi-IN)", "English (en-IN)", "Tamil (ta-IN)", "Telugu (te-IN)"];
const BUILTIN_TOOLS: Omit<ScriptTool, "enabled">[] = [
  { id: "bt-001", name: "escalate_to_human", description: "Transfer call to a human agent with full context package", source: "builtin", params: ["reason", "priority"] },
  { id: "bt-002", name: "send_confirmation", description: "Send SMS + email confirmation to customer", source: "builtin", params: ["customer_id", "message"] },
  { id: "bt-003", name: "schedule_callback", description: "Schedule a callback at customer's preferred time", source: "builtin", params: ["customer_id", "preferred_time"] },
  { id: "bt-004", name: "log_complaint", description: "Log a formal complaint with tracking number", source: "builtin", params: ["customer_id", "description", "category"] },
];

type Tab = "prompt" | "identity" | "tools" | "rules";

export default function ScriptEditorPage({ params }: { params: { id: string } }) {
  const base = SCRIPTS.find((s) => s.id === params.id) ?? SCRIPTS[0];
  const [script, setScript] = useState<AgentScript>({ ...base, tools: base.tools.map((t) => ({ ...t })) });
  const [tab, setTab] = useState<Tab>("prompt");
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AgentScript>(k: K, v: AgentScript[K]) =>
    setScript((s) => ({ ...s, [k]: v }));

  function toggleTool(id: string) {
    setScript((s) => ({ ...s, tools: s.tools.map((t) => t.id === id ? { ...t, enabled: !t.enabled } : t) }));
  }

  function addBuiltinTool(bt: Omit<ScriptTool, "enabled">) {
    if (script.tools.find((t) => t.id === bt.id)) return;
    setScript((s) => ({ ...s, tools: [...s.tools, { ...bt, enabled: true }] }));
  }

  function removeRule(id: string) {
    setScript((s) => ({ ...s, escalationRules: s.escalationRules.filter((r) => r.id !== id) }));
  }

  function toggleNoGo(topic: string) {
    setScript((s) => ({
      ...s,
      noGoTopics: s.noGoTopics.includes(topic)
        ? s.noGoTopics.filter((t) => t !== topic)
        : [...s.noGoTopics, topic],
    }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "prompt", label: "Prompt" },
    { id: "identity", label: "Identity" },
    { id: "tools", label: `Tools (${script.tools.filter((t) => t.enabled).length})` },
    { id: "rules", label: `Rules (${script.escalationRules.length})` },
  ];

  const integrationToolCount = INTEGRATIONS.reduce((n, i) => n + i.endpoints.length, 0);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-black px-8 py-5 flex-shrink-0">
        <Link href="/scripts" className="flex items-center gap-2 text-xs font-mono opacity-40 hover:opacity-100 transition-opacity mb-4">
          <ArrowLeft size={11} /> back to scripts
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">/ {script.id} /</p>
            <h1 className="text-2xl font-bold tracking-tight">{script.name}</h1>
            <p className="text-xs opacity-40 mt-0.5">{script.agentName} · v{script.version}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono border px-2.5 py-1 ${script.status === "active" ? "border-black font-bold" : "border-black/30 opacity-50"}`}>
              {script.status}
            </span>
            <button onClick={handleSave} className="flex items-center gap-2 border border-black px-4 py-2 text-xs font-mono hover:bg-black/5 transition-colors">
              <Save size={11} />{saved ? "saved ✓" : "save draft"}
            </button>
            <button onClick={() => update("status", "active")} className="flex items-center gap-2 bg-black text-[#f0ebe0] px-4 py-2 text-xs font-mono hover:opacity-75 transition-opacity">
              <Zap size={11} /> activate
            </button>
          </div>
        </div>
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
                rows={3} className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] resize-none" />
              <p className="text-[9px] font-mono opacity-25 mt-1.5">When to code-switch, when to use humour, tonal rules. SILK reads this before every utterance.</p>
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

            {/* Integration tools */}
            {INTEGRATIONS.filter((i) => i.status === "connected").map((intg) => (
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
                        else setScript((s) => ({ ...s, tools: [...s.tools, { id: ep.id, name: ep.toolName, description: ep.description, source: "integration", integrationId: intg.id, enabled: true, params: ep.params }] }));
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

            {INTEGRATIONS.some((i) => i.status !== "connected") && (
              <div className="border border-dashed border-black/20 px-5 py-4 flex items-center justify-between">
                <p className="text-xs opacity-40">
                  {INTEGRATIONS.filter((i) => i.status !== "connected").length} integration(s) pending connection — {integrationToolCount} more tools available
                </p>
                <Link href="/integrations" className="text-[10px] font-mono underline opacity-50 hover:opacity-100">
                  connect integrations →
                </Link>
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
              {script.escalationRules.map((rule, i) => (
                <div key={rule.id} className={`flex items-start justify-between px-5 py-4 gap-4 ${i < script.escalationRules.length - 1 ? "border-b border-black" : ""}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-mono border border-black/30 px-1.5 py-0.5 opacity-50">{rule.trigger.replace("_", " ")}</span>
                      <span className="text-[9px] font-mono border border-black px-1.5 py-0.5 font-bold">{rule.action.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm font-mono">{rule.condition}</p>
                  </div>
                  <button onClick={() => removeRule(rule.id)} className="opacity-20 hover:opacity-60 transition-opacity flex-shrink-0 mt-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">no-go topics</p>
                <p className="text-xs opacity-30 font-mono">agent will redirect conversation if these come up</p>
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
      </div>
    </div>
  );
}
