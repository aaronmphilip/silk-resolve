"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, Loader2, Plus, Trash2, Copy, Key, PhoneCall,
  ChevronDown, ChevronUp, Sparkles, ExternalLink,
} from "lucide-react";
import PromptEditor, { SYSTEM_VARIABLES, type PromptVariable } from "../PromptEditor";
import TalkModal from "../TalkModal";
import StudioNav from "./StudioNav";
import { AI_PROVIDERS } from "@/lib/ai-providers";
import type { Call } from "@/lib/types";
import { outcomeBorder } from "@/lib/utils";
import type {
  AgentStudioProps, AgentStudioRow, StudioSection,
  PublishKeyRow, KnowledgeDocRow, EscalationRule,
} from "./types";

const LANGUAGES = [
  "English (en-IN)", "Hindi (hi-IN)", "Hinglish (hi-IN / en-IN)",
  "Tamil (ta-IN)", "Telugu (te-IN)", "Kannada (kn-IN)",
  "Marathi (mr-IN)", "Bengali (bn-IN)", "Gujarati (gu-IN)", "Malayalam (ml-IN)",
];

const VOICE_MODES = [
  { id: "silk-mulberry" as const, label: "Mulberry", desc: "Warm, natural — best for support" },
  { id: "silk" as const, label: "MUGA", desc: "Expressive tones, fast replies" },
  { id: "silk-stream" as const, label: "MUGA Stream", desc: "Low-latency streaming" },
  { id: "vapi" as const, label: "Vapi native", desc: "PlayHT fallback, no Silk" },
];

const COMPANION_VIBES = [
  { id: "professional" as const, label: "Professional", desc: "Precise, efficient, formal." },
  { id: "protective" as const, label: "Protective", desc: "Empathetic, patient, warm." },
  { id: "casual" as const, label: "Casual", desc: "Friendly, light, informal." },
];

const ACTIONS = [
  { id: "transfer_human" as const, label: "Transfer to human" },
  { id: "offer_callback" as const, label: "Offer callback" },
  { id: "send_email" as const, label: "Send email alert" },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono text-[#6B6560] uppercase tracking-[0.18em] mb-2 font-semibold">
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-[#6B6560] uppercase tracking-widest mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-white text-sm text-[#1A1814] placeholder:text-[#6B6560]/40 focus:outline-none border border-[#E8E4DE] focus:border-[#2D4A3E]/40 rounded-lg px-3 py-2 transition-colors";
const monoInputClass = `${inputClass} font-mono text-[13px]`;

export default function AgentStudio({ initial, calls, silkConfigured }: AgentStudioProps) {
  const [agent, setAgent] = useState<AgentStudioRow>(initial);
  const [section, setSection] = useState<StudioSection>("agent");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showTalk, setShowTalk] = useState(false);
  const [origin, setOrigin] = useState("");

  const [publishKeys, setPublishKeys] = useState<PublishKeyRow[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyReveal, setNewKeyReveal] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  const [docs, setDocs] = useState<KnowledgeDocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<{ id: string; title: string; content: string } | null>(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");

  const changed = JSON.stringify(agent) !== JSON.stringify(initial);
  const set = useCallback(<K extends keyof AgentStudioRow>(k: K) => (v: AgentStudioRow[K]) => {
    setAgent((a) => ({ ...a, [k]: v }));
    setSaved(false);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (section !== "widget" && section !== "knowledge") return;
    if (section === "widget") void loadKeys();
    if (section === "knowledge") void loadDocs();
  }, [section, agent.id]);

  async function loadKeys() {
    setKeysLoading(true);
    const res = await fetch(`/api/agents/${agent.id}/keys`);
    setKeysLoading(false);
    if (res.ok) setPublishKeys(await res.json());
  }

  async function loadDocs() {
    setDocsLoading(true);
    const res = await fetch(`/api/agents/${agent.id}/knowledge`);
    setDocsLoading(false);
    if (res.ok) setDocs(await res.json());
  }

  async function save(publishAs?: "live" | "draft") {
    setSaving(true);
    setError("");
    setSaved(false);
    const payload = { ...agent };
    if (publishAs) payload.status = publishAs;
    const res = await fetch(`/api/agents/${agent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setAgent((a) => ({ ...a, status: payload.status }));
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "save failed");
    }
  }

  async function generateKey(kind: "live" | "test" = "live") {
    const res = await fetch(`/api/agents/${agent.id}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: kind === "test" ? "Test" : "Production", kind }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKeyReveal(data.key);
      await loadKeys();
    }
  }

  async function revokeKey(keyId: string) {
    if (!confirm("Revoke this publish key? Embeds using it will stop working.")) return;
    await fetch(`/api/agents/${agent.id}/keys/${keyId}`, { method: "DELETE" });
    await loadKeys();
  }

  async function createDoc() {
    if (!newDocTitle.trim()) return;
    const res = await fetch(`/api/agents/${agent.id}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newDocTitle.trim(), content: newDocContent }),
    });
    if (res.ok) {
      setNewDocTitle("");
      setNewDocContent("");
      await loadDocs();
    }
  }

  async function saveDoc() {
    if (!editingDoc) return;
    await fetch(`/api/agents/${agent.id}/knowledge/${editingDoc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingDoc.title, content: editingDoc.content }),
    });
    setEditingDoc(null);
    await loadDocs();
  }

  async function deleteDoc(docId: string) {
    if (!confirm("Delete this document and its chunks?")) return;
    await fetch(`/api/agents/${agent.id}/knowledge/${docId}`, { method: "DELETE" });
    await loadDocs();
  }

  const customVars: PromptVariable[] = agent.agent_variables.map((v) => ({
    ...v,
    source: "custom" as const,
  }));

  const embedSnippet = (useKey: boolean, keyPrefix?: string) => {
    const keyAttr = useKey && keyPrefix
      ? `    s.setAttribute('data-agent-key', 'sr_live_YOUR_KEY');\n`
      : `    s.setAttribute('data-agent-id', '${agent.id}');\n`;
    return `<!-- Silk Resolve · Voice Widget -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${origin}/widget.js?v=37';
${keyAttr}    s.setAttribute('data-position', 'bottom-right');
    s.setAttribute('data-label', 'Talk to us');
    s.defer = true;
    document.head.appendChild(s);
  })();
</script>`;
  };

  const voiceRail = (
    <aside className="hidden xl:flex w-72 shrink-0 flex-col border-l border-[#E8E4DE] bg-[#FAF9F7] p-5 gap-6">
      <div>
        <Label>Voice</Label>
        <div className="space-y-2">
          {VOICE_MODES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => set("voice_mode")(v.id)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                agent.voice_mode === v.id
                  ? "border-[#2D4A3E] bg-white shadow-sm"
                  : "border-[#E8E4DE] hover:border-[#C4A882]/60"
              }`}
            >
              <p className="text-xs font-semibold text-[#1A1814]">{v.label}</p>
              <p className="text-[10px] text-[#6B6560] mt-0.5">{v.desc}</p>
            </button>
          ))}
        </div>
        {!silkConfigured && agent.voice_mode !== "vapi" && (
          <p className="text-[10px] font-mono text-amber-700 mt-2">SILK API not configured — will fall back to Vapi</p>
        )}
      </div>

      <div>
        <Label>Language</Label>
        <select
          value={agent.language}
          onChange={(e) => set("language")(e.target.value)}
          className={monoInputClass}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Companion vibe</Label>
        <div className="flex flex-col gap-1.5">
          {COMPANION_VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => set("companion_vibe")(v.id)}
              className={`text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                agent.companion_vibe === v.id
                  ? "border-[#2D4A3E] bg-white"
                  : "border-[#E8E4DE] opacity-70 hover:opacity-100"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[#E8E4DE] space-y-2">
        {[
          { label: "total calls", value: agent.total_calls > 0 ? agent.total_calls.toLocaleString() : "0" },
          { label: "today", value: String(agent.calls_today) },
          { label: "resolved", value: agent.resolved_rate > 0 ? `${agent.resolved_rate}%` : "—" },
        ].map((s) => (
          <div key={s.label} className="flex justify-between text-[11px] font-mono">
            <span className="text-[#6B6560]">{s.label}</span>
            <span className="text-[#1A1814] font-semibold">{s.value}</span>
          </div>
        ))}
      </div>
    </aside>
  );

  function renderSection() {
    switch (section) {
      case "agent":
        return (
          <motion.div
            key="agent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-2xl"
          >
            <div>
              <Label>System prompt</Label>
              <p className="text-[11px] text-[#6B6560] mb-3">
                Personality and behaviour. Type <span className="font-mono">{"{{"}</span> for variables.
              </p>
              <PromptEditor
                label=""
                value={agent.system_prompt}
                onChange={set("system_prompt")}
                customVariables={customVars}
                placeholder={`You are a customer support specialist for {{company_name}}.\n\nResolve issues with warmth and efficiency.`}
                rows={14}
                light
              />
            </div>
            <div>
              <Label>First message</Label>
              <PromptEditor
                label=""
                value={agent.first_message}
                onChange={set("first_message")}
                customVariables={customVars}
                placeholder="Hello {{preferred_address}}, how can I help you today?"
                rows={3}
                monospace={false}
                light
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={agent.description}
                onChange={(e) => set("description")(e.target.value)}
                rows={2}
                className={inputClass}
                placeholder="What this agent handles — shown in analytics and deploy docs"
              />
            </div>
          </motion.div>
        );

      case "voice":
        return (
          <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl">
            <div>
              <Label>Voice mode</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {VOICE_MODES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => set("voice_mode")(v.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      agent.voice_mode === v.id ? "border-[#2D4A3E] bg-white shadow-sm" : "border-[#E8E4DE]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{v.label}</p>
                    <p className="text-[11px] text-[#6B6560] mt-1">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <Field label="SILK voice ID (optional)">
              <input
                value={agent.silk_voice_id}
                onChange={(e) => set("silk_voice_id")(e.target.value)}
                placeholder="silk-1 — leave blank for default"
                className={monoInputClass}
              />
            </Field>
            <Field label="Hinglish mode">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => set("hinglish_mode")(!agent.hinglish_mode)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${
                    agent.hinglish_mode ? "bg-[#2D4A3E]" : "bg-[#E8E4DE]"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      agent.hinglish_mode ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-xs text-[#6B6560]">Fluent Hindi–English code-switching</span>
              </label>
            </Field>
            <Field label="Linguistic notes">
              <textarea
                value={agent.linguistic_notes}
                onChange={(e) => set("linguistic_notes")(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="e.g. Keep sentences short. Never say 'no problem'."
              />
            </Field>
          </motion.div>
        );

      case "knowledge":
        return (
          <motion.div key="knowledge" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
            <div className="flex items-center justify-between">
              <div>
                <Label>Knowledge base</Label>
                <p className="text-[11px] text-[#6B6560]">Documents are chunked and retrieved into the agent prompt at call time.</p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => set("knowledge_enabled")(!agent.knowledge_enabled)}
                  className={`w-9 h-5 rounded-full relative ${agent.knowledge_enabled ? "bg-[#2D4A3E]" : "bg-[#E8E4DE]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${agent.knowledge_enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                {agent.knowledge_enabled ? "enabled" : "disabled"}
              </label>
            </div>

            {docsLoading ? (
              <div className="flex items-center gap-2 text-xs text-[#6B6560]"><Loader2 size={14} className="animate-spin" /> loading…</div>
            ) : (
              <div className="border border-[#E8E4DE] rounded-xl divide-y divide-[#E8E4DE] bg-white">
                {docs.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-[#6B6560]">No documents yet — add your FAQs, policies, or product info below.</p>
                )}
                {docs.map((doc) => (
                  <div key={doc.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-[10px] font-mono text-[#6B6560]">{doc.source_type} · {doc.status}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={async () => {
                        const res = await fetch(`/api/agents/${agent.id}/knowledge/${doc.id}`);
                        if (res.ok) {
                          const d = await res.json();
                          setEditingDoc({ id: doc.id, title: d.title, content: d.content });
                        }
                      }} className="text-[10px] font-mono text-[#2D4A3E] hover:underline">edit</button>
                      <button type="button" onClick={() => deleteDoc(doc.id)} className="text-[#6B6560] hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {editingDoc ? (
              <div className="border border-[#2D4A3E]/30 rounded-xl p-4 bg-white space-y-3">
                <input value={editingDoc.title} onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })} className={inputClass} />
                <textarea value={editingDoc.content} onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })} rows={10} className={inputClass} />
                <div className="flex gap-2">
                  <button type="button" onClick={saveDoc} className="text-xs font-mono bg-[#2D4A3E] text-white px-3 py-2 rounded-lg">save document</button>
                  <button type="button" onClick={() => setEditingDoc(null)} className="text-xs font-mono text-[#6B6560] px-3 py-2">cancel</button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#E8E4DE] rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest">Add document</p>
                <input value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} placeholder="Title — e.g. Refund policy" className={inputClass} />
                <textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} rows={8} placeholder="Paste content here…" className={inputClass} />
                <button type="button" onClick={createDoc} className="text-xs font-mono bg-[#1A1814] text-[#F7F5F2] px-4 py-2 rounded-lg flex items-center gap-1.5">
                  <Plus size={12} /> add document
                </button>
              </div>
            )}
          </motion.div>
        );

      case "tools":
        return (
          <motion.div key="tools" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
            <div>
              <Label>Tools & actions</Label>
              {agent.tools.length === 0 ? (
                <div className="border border-[#E8E4DE] rounded-xl px-6 py-10 text-center bg-white">
                  <p className="text-xs text-[#6B6560]">No tools configured</p>
                  <Link href="/integrations" className="text-[11px] font-mono text-[#2D4A3E] underline mt-2 inline-block">Add integrations →</Link>
                </div>
              ) : (
                <div className="border border-[#E8E4DE] rounded-xl divide-y bg-white">
                  {agent.tools.map((tool, i) => (
                    <div key={tool.id} className="px-4 py-3 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-mono font-semibold">{tool.name}()</p>
                        <p className="text-[10px] text-[#6B6560]">{tool.description}</p>
                      </div>
                      <button type="button" onClick={() => {
                        const t = [...agent.tools];
                        t[i] = { ...t[i], enabled: !t[i].enabled };
                        set("tools")(t);
                      }} className={`text-[9px] font-mono border px-2 py-0.5 rounded ${tool.enabled ? "border-emerald-600/40 text-emerald-700" : "border-[#E8E4DE] text-[#6B6560]"}`}>
                        {tool.enabled ? "on" : "off"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Escalation rules</Label>
              <div className="space-y-2">
                {agent.escalation_rules.map((rule, i) => (
                  <div key={rule.id} className="border border-[#E8E4DE] rounded-lg bg-white overflow-hidden">
                    <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}>
                      <span className="text-xs font-mono text-[#6B6560]">{rule.trigger} — {rule.condition}</span>
                      {expandedRule === rule.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {expandedRule === rule.id && (
                      <div className="px-4 pb-4 space-y-3 border-t border-[#E8E4DE] pt-3">
                        <select value={rule.action} onChange={(e) => {
                          const r = [...agent.escalation_rules];
                          r[i] = { ...r[i], action: e.target.value as EscalationRule["action"] };
                          set("escalation_rules")(r);
                        }} className={monoInputClass}>
                          {ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                        <input value={rule.condition} onChange={(e) => {
                          const r = [...agent.escalation_rules];
                          r[i] = { ...r[i], condition: e.target.value };
                          set("escalation_rules")(r);
                        }} className={monoInputClass} />
                        <button type="button" onClick={() => set("escalation_rules")(agent.escalation_rules.filter((_, j) => j !== i))} className="text-[10px] text-red-600 flex items-center gap-1"><Trash2 size={10} /> remove</button>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => set("escalation_rules")([...agent.escalation_rules, {
                  id: `er-${Date.now()}`, trigger: "tension_threshold", condition: "tension > 8.0 for 45 seconds", action: "transfer_human",
                }])} className="w-full border border-dashed border-[#E8E4DE] rounded-lg py-3 text-xs font-mono text-[#6B6560] flex items-center justify-center gap-1 hover:border-[#2D4A3E]/40">
                  <Plus size={11} /> add rule
                </button>
              </div>
            </div>
          </motion.div>
        );

      case "widget":
        return (
          <motion.div key="widget" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
            <div>
              <Label>Publish keys</Label>
              <p className="text-[11px] text-[#6B6560] mb-4">Embed without exposing your agent ID. Keys are shown once when created.</p>
              {newKeyReveal && (
                <div className="mb-4 border border-[#C4A882] bg-[#C4A882]/10 rounded-xl p-4">
                  <p className="text-[10px] font-mono text-[#6B6560] mb-2">Copy now — won&apos;t be shown again</p>
                  <code className="text-xs font-mono break-all block mb-2">{newKeyReveal}</code>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(newKeyReveal); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); }} className="text-xs font-mono flex items-center gap-1 text-[#2D4A3E]">
                    {keyCopied ? <Check size={12} /> : <Copy size={12} />} copy key
                  </button>
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => generateKey("live")} className="text-xs font-mono bg-[#2D4A3E] text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
                  <Key size={12} /> new live key
                </button>
                <button type="button" onClick={() => generateKey("test")} className="text-xs font-mono border border-[#E8E4DE] px-3 py-2 rounded-lg">test key</button>
              </div>
              {keysLoading ? <Loader2 size={14} className="animate-spin text-[#6B6560]" /> : (
                <div className="border border-[#E8E4DE] rounded-xl divide-y bg-white">
                  {publishKeys.length === 0 && <p className="px-4 py-6 text-xs text-[#6B6560] text-center">No keys yet</p>}
                  {publishKeys.map((k) => (
                    <div key={k.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-[10px] font-mono text-[#6B6560]">{k.prefix}… · {k.kind} · {k.status}</p>
                      </div>
                      {k.status === "active" && (
                        <button type="button" onClick={() => revokeKey(k.id)} className="text-[10px] font-mono text-red-600">revoke</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Embed snippet (publish key — recommended)</Label>
              <pre className="text-[11px] font-mono bg-[#1A1814] text-[#F7F5F2] rounded-xl p-4 overflow-x-auto">{embedSnippet(true)}</pre>
            </div>
            <div>
              <Label>Legacy embed (agent ID)</Label>
              <pre className="text-[11px] font-mono bg-[#FAF9F7] border border-[#E8E4DE] rounded-xl p-4 overflow-x-auto">{embedSnippet(false)}</pre>
            </div>
            <Link href="/deploy" className="inline-flex items-center gap-1.5 text-xs font-mono text-[#2D4A3E] hover:underline">
              Full deploy guide <ExternalLink size={12} />
            </Link>
          </motion.div>
        );

      case "guardrails":
        return (
          <motion.div key="guardrails" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-2xl">
            <div>
              <Label>No-go topics</Label>
              <div className="border border-[#E8E4DE] rounded-xl bg-white divide-y">
                {agent.no_go_topics.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs font-mono">{t}</span>
                    <button type="button" onClick={() => set("no_go_topics")(agent.no_go_topics.filter((_, j) => j !== i))}><Trash2 size={11} className="text-[#6B6560]" /></button>
                  </div>
                ))}
                <div className="flex gap-2 px-4 py-3">
                  <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} onKeyDown={(e) => {
                    if (e.key === "Enter" && newTopic.trim()) {
                      set("no_go_topics")([...agent.no_go_topics, newTopic.trim()]);
                      setNewTopic("");
                    }
                  }} placeholder="e.g. competitor pricing" className={monoInputClass} />
                </div>
              </div>
            </div>
            <div>
              <Label>PEEK tension threshold</Label>
              <div className="flex items-center gap-4">
                <input type="range" min="4" max="9" step="0.5" value={agent.peek_threshold} onChange={(e) => set("peek_threshold")(parseFloat(e.target.value))} className="flex-1 accent-[#2D4A3E]" />
                <span className="text-sm font-mono font-bold w-14 text-right">{agent.peek_threshold.toFixed(1)}</span>
              </div>
            </div>
          </motion.div>
        );

      case "settings":
        return (
          <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-xl">
            <div>
              <Label>AI model</Label>
              <div className="space-y-2">
                {AI_PROVIDERS.map((p) => (
                  <button key={p.id} type="button" onClick={() => { set("llm_provider")(p.id); set("llm_model")(p.model); }}
                    className={`w-full text-left rounded-lg border px-4 py-3 flex items-center justify-between ${agent.llm_provider === p.id ? "border-[#2D4A3E] bg-white" : "border-[#E8E4DE]"}`}>
                    <div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-[10px] font-mono text-[#6B6560]">{p.model}</p>
                    </div>
                    {agent.llm_provider === p.id && <Check size={14} className="text-[#2D4A3E]" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>MESH memory depth</Label>
              <div className="flex gap-2">
                {[{ label: "3 mo", days: 90 }, { label: "6 mo", days: 180 }, { label: "1 yr", days: 365 }, { label: "2 yr", days: 730 }].map((opt) => (
                  <button key={opt.days} type="button" onClick={() => set("mesh_depth_days")(opt.days)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-mono ${agent.mesh_depth_days === opt.days ? "border-[#2D4A3E] bg-white" : "border-[#E8E4DE]"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Call routing</Label>
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["inbound", "outbound", "both"] as const).map((d) => (
                    <button key={d} type="button" onClick={() => set("call_direction")(d)}
                      className={`flex-1 rounded-lg border py-2 text-xs capitalize ${agent.call_direction === d ? "border-[#2D4A3E] bg-white" : "border-[#E8E4DE]"}`}>
                      {d}
                    </button>
                  ))}
                </div>
                {(agent.call_direction === "inbound" || agent.call_direction === "both") && (
                  <Field label="Inbound Vapi phone">
                    <input value={agent.vapi_phone_number} onChange={(e) => set("vapi_phone_number")(e.target.value)} className={monoInputClass} placeholder="+91-22-4001-0000" />
                  </Field>
                )}
                {(agent.call_direction === "outbound" || agent.call_direction === "both") && (
                  <>
                    <Field label="Outbound caller ID">
                      <input value={agent.outbound_caller_id} onChange={(e) => set("outbound_caller_id")(e.target.value)} className={monoInputClass} />
                    </Field>
                    <Field label="Contact list URL">
                      <input value={agent.outbound_list_url} onChange={(e) => set("outbound_list_url")(e.target.value)} className={monoInputClass} />
                    </Field>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label>Custom variables</Label>
              <div className="border border-[#E8E4DE] rounded-xl bg-white divide-y">
                {agent.agent_variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-mono flex-1">{`{{${v.name}}}`}</span>
                    <span className="text-xs text-[#6B6560] flex-1">{v.description}</span>
                    <button type="button" onClick={() => set("agent_variables")(agent.agent_variables.filter((_, j) => j !== i))}><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="flex gap-2 px-4 py-3">
                  <input placeholder="var_name" id="studio-var-name" className={monoInputClass} />
                  <input placeholder="description" id="studio-var-desc" className={monoInputClass} />
                  <button type="button" onClick={() => {
                    const n = (document.getElementById("studio-var-name") as HTMLInputElement)?.value?.trim();
                    const d = (document.getElementById("studio-var-desc") as HTMLInputElement)?.value?.trim();
                    if (!n) return;
                    set("agent_variables")([...agent.agent_variables, { name: n, description: d, source: "custom" as const }]);
                    (document.getElementById("studio-var-name") as HTMLInputElement).value = "";
                    (document.getElementById("studio-var-desc") as HTMLInputElement).value = "";
                  }} className="text-[10px] font-mono border border-[#E8E4DE] px-2 py-1 rounded shrink-0"><Plus size={10} /></button>
                </div>
              </div>
              <p className="text-[10px] text-[#6B6560] mt-2">System vars: {SYSTEM_VARIABLES.slice(0, 4).map((v) => `{{${v.name}}}`).join(", ")}…</p>
            </div>
          </motion.div>
        );

      case "calls":
        return (
          <motion.div key="calls" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <Label>Conversations</Label>
              <Link href="/calls" className="text-[10px] font-mono text-[#2D4A3E]">view all →</Link>
            </div>
            {calls.length === 0 ? (
              <div className="border border-[#E8E4DE] rounded-xl px-6 py-16 text-center bg-white">
                <PhoneCall size={24} className="mx-auto text-[#E8E4DE] mb-3" />
                <p className="text-xs text-[#6B6560]">No calls yet — hit Talk to test</p>
              </div>
            ) : (
              <div className="border border-[#E8E4DE] rounded-xl overflow-hidden bg-white">
                {calls.map((call, i) => (
                  <Link key={call.id} href={`/calls/${call.id}`}
                    className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-[#FAF9F7] ${i < calls.length - 1 ? "border-b border-[#E8E4DE]" : ""}`}>
                    <div className="col-span-4"><p className="text-[10px] font-mono truncate">{call.id}</p></div>
                    <div className="col-span-2"><span className={`text-[9px] font-mono px-1.5 py-0.5 border rounded ${outcomeBorder(call.outcome)}`}>{call.outcome}</span></div>
                    <div className="col-span-2"><p className="text-[10px] font-mono">{call.duration}</p></div>
                    <div className="col-span-2"><p className="text-[10px] font-mono">{call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}</p></div>
                    <div className="col-span-2 text-right"><p className="text-[9px] font-mono text-[#6B6560]">{call.timestamp.slice(11, 16)}</p></div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        );

      case "tests":
        return (
          <motion.div key="tests" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-6">
            <div className="border border-[#E8E4DE] rounded-2xl p-6 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#C4A882]" />
                <p className="font-semibold text-sm">Live voice test</p>
              </div>
              <p className="text-xs text-[#6B6560] mb-4">Start a browser call with your current saved config. Unsaved changes won&apos;t apply until you save.</p>
              <button type="button" onClick={() => setShowTalk(true)} className="w-full flex items-center justify-center gap-2 bg-[#2D4A3E] text-white text-sm font-medium py-3 rounded-xl hover:bg-[#243d32] transition-colors">
                <PhoneCall size={16} /> Talk to {agent.name || "agent"}
              </button>
            </div>
            <div>
              <Label>Public talk URL</Label>
              <code className="block text-[11px] font-mono bg-[#FAF9F7] border border-[#E8E4DE] rounded-lg px-3 py-2 break-all">
                {origin}/talk/{agent.id}?voice={agent.voice_mode}
              </code>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1A1814]">
      {showTalk && (
        <TalkModal
          agentId={agent.id}
          agentName={agent.name}
          voiceMode={agent.voice_mode === "vapi" ? "vapi" : agent.voice_mode}
          onClose={() => setShowTalk(false)}
        />
      )}

      <header className="sticky top-14 lg:top-0 z-30 border-b border-[#E8E4DE] bg-[#F7F5F2]/95 backdrop-blur-sm px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/agents" className="flex items-center gap-1 text-[10px] font-mono text-[#6B6560] hover:text-[#1A1814]">
            <ArrowLeft size={12} /> agents
          </Link>
          <span className="text-[#E8E4DE]">/</span>
          <input
            value={agent.name}
            onChange={(e) => set("name")(e.target.value)}
            className="text-base font-semibold bg-transparent focus:outline-none border-b border-transparent focus:border-[#C4A882] min-w-0 max-w-[12rem] sm:max-w-xs"
          />
          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
            agent.status === "live" ? "border-emerald-600/40 text-emerald-700 bg-emerald-50" :
            agent.status === "paused" ? "border-amber-600/40 text-amber-700 bg-amber-50" :
            "border-[#E8E4DE] text-[#6B6560]"
          }`}>
            {agent.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-[10px] font-mono text-red-600">{error}</span>}
          {saved && <span className="text-[10px] font-mono text-emerald-700">saved</span>}
          <button type="button" onClick={() => setShowTalk(true)} className="text-xs font-mono border border-[#2D4A3E] text-[#2D4A3E] px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-[#2D4A3E]/5">
            <PhoneCall size={12} /> Talk
          </button>
          <button type="button" onClick={() => save()} disabled={saving || !changed}
            className="text-xs font-mono border border-[#E8E4DE] px-3 py-2 rounded-lg disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : "save"}
          </button>
          <button type="button" onClick={() => save("live")} disabled={saving}
            className="text-xs font-mono bg-[#1A1814] text-[#F7F5F2] px-4 py-2 rounded-lg flex items-center gap-1">
            {saved ? <Check size={12} /> : null}
            {agent.status === "live" ? "published" : "publish"}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)]">
        <StudioNav section={section} onSection={setSection} callCount={calls.length} />
        <main className="flex-1 px-4 sm:px-8 py-6 lg:py-8 overflow-auto">
          <AnimatePresence mode="wait">{renderSection()}</AnimatePresence>
        </main>
        {(section === "agent" || section === "voice") && voiceRail}
      </div>
    </div>
  );
}