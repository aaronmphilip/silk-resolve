"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, Plus, Trash2, AlertTriangle,
  Zap, Brain, Mic, Database, ChevronDown, ChevronUp, Eye,
  PhoneCall, Settings2,
} from "lucide-react";
import PromptEditor, { SYSTEM_VARIABLES, type PromptVariable } from "./PromptEditor";
import TalkModal from "./TalkModal";
import { AI_PROVIDERS } from "@/lib/ai-providers";
import type { Call } from "@/lib/types";
import { outcomeBorder } from "@/lib/utils";

interface AgentRow {
  id: string;
  name: string;
  status: "live" | "paused" | "draft" | "error";
  description: string;
  system_prompt: string;
  first_message: string;
  language: string;
  hinglish_mode: boolean;
  llm_provider: string;
  llm_model: string;
  companion_vibe: "casual" | "professional" | "protective";
  preferred_address: string;
  linguistic_notes: string;
  peek_threshold: number;
  mesh_depth_days: number;
  silk_voice_id: string;
  agent_variables: PromptVariable[];
  tools: AgentTool[];
  escalation_rules: EscalationRule[];
  no_go_topics: string[];
  total_calls: number;
  calls_today: number;
  empathy_score: number;
  resolved_rate: number;
  avg_handle_time: string;
  // Call routing
  call_direction: "inbound" | "outbound" | "both";
  vapi_phone_number: string;
  outbound_caller_id: string;
  outbound_list_url: string;
}

interface AgentTool {
  id: string; name: string; description: string; enabled: boolean; params: string[];
}

interface EscalationRule {
  id: string; trigger: string; condition: string;
  action: "transfer_human" | "offer_callback" | "send_email";
}

type Tab = "configure" | "tools" | "logs";

const LANGUAGES = [
  "English (en-IN)", "Hindi (hi-IN)", "Hinglish (hi-IN / en-IN)",
  "Tamil (ta-IN)", "Telugu (te-IN)", "Kannada (kn-IN)",
  "Marathi (mr-IN)", "Bengali (bn-IN)", "Gujarati (gu-IN)", "Malayalam (ml-IN)",
];

const COMPANION_VIBES = [
  { id: "professional" as const, label: "Professional", desc: "Precise, efficient, formal." },
  { id: "protective"   as const, label: "Protective",   desc: "Empathetic, patient, warm." },
  { id: "casual"       as const, label: "Casual",       desc: "Friendly, light, informal." },
];

const ACTIONS = [
  { id: "transfer_human" as const, label: "Transfer to human" },
  { id: "offer_callback" as const, label: "Offer callback" },
  { id: "send_email"     as const, label: "Send email alert" },
];

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-mono text-[#f0ebe0]/40 uppercase tracking-widest mb-2 font-semibold">{children}</p>;
}

function AdvancedRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-[#f0ebe0]/40 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentEditor({
  initial, calls, silkConfigured,
}: {
  initial: AgentRow; calls: Call[]; silkConfigured: boolean;
}) {
  const [agent, setAgent] = useState<AgentRow>(initial);
  const [tab, setTab] = useState<Tab>("configure");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [showTalk, setShowTalk] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const changed = JSON.stringify(agent) !== JSON.stringify(initial);
  const set = useCallback(<K extends keyof AgentRow>(k: K) => (v: AgentRow[K]) => {
    setAgent(a => ({ ...a, [k]: v }));
    setSaved(false);
  }, []);

  async function save(publishAs?: "live" | "draft") {
    setSaving(true); setError(""); setSaved(false);
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
      setAgent(a => ({ ...a, status: payload.status }));
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "save failed");
    }
  }

  const customVars: PromptVariable[] = agent.agent_variables.map(v => ({ ...v, source: "custom" as const }));

  // ── Configure tab ─────────────────────────────────────────────────────────

  const ConfigureTab = (
    <div className="space-y-8">

      {/* System Prompt — always visible, most important */}
      <div>
        <SectionLabel>System prompt</SectionLabel>
        <p className="text-[11px] text-[#f0ebe0]/30 mb-3">
          The agent&apos;s full personality and behaviour. Type <span className="text-[#f0ebe0]/60 font-mono">{"{{"}</span> to insert variables from PEEK + MESH.
        </p>
        <PromptEditor
          label=""
          value={agent.system_prompt}
          onChange={set("system_prompt")}
          customVariables={customVars}
          placeholder={`You are a customer support specialist for {{company_name}}.\n\nResolve issues with warmth and efficiency. Keep responses to 1–2 sentences.\n\nCaller context (injected by MESH):\n- Address as: {{preferred_address}}\n- Language: {{language}}\n- Emotional history: {{emotional_debt}}\n- Last call outcome: {{last_outcome}}`}
          rows={14}
        />
      </div>

      {/* First message — always visible */}
      <div>
        <SectionLabel>First message</SectionLabel>
        <p className="text-[11px] text-[#f0ebe0]/30 mb-3">What the agent says when the call connects.</p>
        <PromptEditor
          label=""
          value={agent.first_message}
          onChange={set("first_message")}
          customVariables={customVars}
          placeholder="Hello {{preferred_address}}, this is Priya from {{company_name}}. How can I help you today?"
          rows={3}
          monospace={false}
        />
      </div>

      {/* ── Advanced settings ─────────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(s => !s)}
          className="w-full flex items-center justify-between border border-[#f0ebe0]/15 px-4 py-3 text-left hover:bg-[#f0ebe0]/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 size={12} className="text-[#f0ebe0]/40" />
            <span className="text-xs font-mono text-[#f0ebe0]/50">Advanced settings</span>
            <span className="text-[9px] font-mono text-[#f0ebe0]/25 border border-[#f0ebe0]/15 px-1.5 py-0.5">
              voice · language · LLM · PEEK · MESH · variables
            </span>
          </div>
          {showAdvanced
            ? <ChevronUp size={12} className="text-[#f0ebe0]/30" />
            : <ChevronDown size={12} className="text-[#f0ebe0]/30" />}
        </button>

        {showAdvanced && (
          <div className="border border-[#f0ebe0]/10 border-t-0 px-6 py-6 space-y-8">

            {/* Call Direction */}
            <div>
              <SectionLabel>Call routing</SectionLabel>
              <div className="space-y-4">
                <AdvancedRow label="Direction">
                  <div className="flex gap-2">
                    {([
                      { id: "inbound",  label: "Inbound",  desc: "Customer calls you" },
                      { id: "outbound", label: "Outbound", desc: "Agent dials out" },
                      { id: "both",     label: "Both",     desc: "Inbound + outbound" },
                    ] as const).map(d => (
                      <button key={d.id} type="button"
                        onClick={() => set("call_direction")(d.id)}
                        className={`flex-1 border px-3 py-2 text-left transition-all ${(agent.call_direction ?? "inbound") === d.id ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-40 hover:opacity-70"}`}>
                        <p className="text-[11px] font-bold text-[#f0ebe0]">{d.label}</p>
                        <p className="text-[9px] text-[#f0ebe0]/40 mt-0.5">{d.desc}</p>
                      </button>
                    ))}
                  </div>
                </AdvancedRow>

                {/* Inbound phone — shown for inbound/both */}
                {(agent.call_direction === "inbound" || agent.call_direction === "both" || !agent.call_direction) && (
                  <AdvancedRow label="Inbound Vapi phone number">
                    <input
                      value={agent.vapi_phone_number ?? ""}
                      onChange={e => set("vapi_phone_number")(e.target.value)}
                      placeholder="+91-22-4001-0000  (from Vapi dashboard)"
                      className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
                    />
                    <p className="text-[9px] text-[#f0ebe0]/25 mt-1.5">
                      Webhook URL to set in Vapi → Phone Numbers:
                      <span className="font-mono ml-1 text-[#f0ebe0]/40">{typeof window !== "undefined" ? window.location.origin : ""}/api/voice/vapi-incoming</span>
                    </p>
                  </AdvancedRow>
                )}

                {/* Outbound caller ID — shown for outbound/both */}
                {(agent.call_direction === "outbound" || agent.call_direction === "both") && (
                  <AdvancedRow label="Outbound caller ID">
                    <input
                      value={agent.outbound_caller_id ?? ""}
                      onChange={e => set("outbound_caller_id")(e.target.value)}
                      placeholder="+91-22-4001-0001  (verified in Vapi)"
                      className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
                    />
                  </AdvancedRow>
                )}

                {(agent.call_direction === "outbound" || agent.call_direction === "both") && (
                  <AdvancedRow label="Contact list URL (optional)">
                    <input
                      value={agent.outbound_list_url ?? ""}
                      onChange={e => set("outbound_list_url")(e.target.value)}
                      placeholder="https://your-crm.com/api/contacts/list"
                      className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
                    />
                    <p className="text-[9px] text-[#f0ebe0]/25 mt-1.5">JSON endpoint returning a list of <span className="font-mono">{"{phone, name, metadata}"}</span> to dial.</p>
                  </AdvancedRow>
                )}
              </div>
            </div>

            {/* Voice */}
            <div>
              <SectionLabel>Voice</SectionLabel>
              <div className="border border-[#f0ebe0]/10 divide-y divide-[#f0ebe0]/10">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${silkConfigured ? "bg-emerald-400" : "bg-[#f0ebe0]/20"}`} />
                    <span className="text-xs font-bold text-[#f0ebe0]">SILK</span>
                    <span className="text-[9px] font-mono border border-amber-400/30 text-amber-400 px-1.5 py-0.5">primary</span>
                    {!silkConfigured && <span className="text-[9px] font-mono text-[#f0ebe0]/25">not configured · add key in Admin</span>}
                  </div>
                  <input
                    value={agent.silk_voice_id}
                    onChange={e => set("silk_voice_id")(e.target.value)}
                    placeholder="silk-1 (leave blank for default)"
                    className="w-48 bg-transparent text-[11px] font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-0.5"
                  />
                </div>
                <div className={`px-4 py-2.5 flex items-center gap-2 ${silkConfigured ? "opacity-25" : "opacity-60"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${!silkConfigured ? "bg-amber-400" : "bg-[#f0ebe0]/20"}`} />
                  <span className="text-xs font-mono text-[#f0ebe0]">Vapi PlayHT</span>
                  <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-60">
                    {silkConfigured ? "inactive" : "active fallback"}
                  </span>
                </div>
              </div>
            </div>

            {/* Language & tone */}
            <div>
              <SectionLabel>Language & tone</SectionLabel>
              <div className="space-y-4">
                <AdvancedRow label="Primary language">
                  <select
                    value={agent.language}
                    onChange={e => set("language")(e.target.value)}
                    className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1 focus:outline-none"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#0a0a0a]">{l}</option>)}
                  </select>
                </AdvancedRow>

                <AdvancedRow label="Companion vibe">
                  <div className="flex gap-2">
                    {COMPANION_VIBES.map(v => (
                      <button key={v.id} type="button" onClick={() => set("companion_vibe")(v.id)}
                        className={`flex-1 border px-3 py-2 text-left transition-all ${agent.companion_vibe === v.id ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-40 hover:opacity-70"}`}>
                        <p className="text-[11px] font-bold text-[#f0ebe0]">{v.label}</p>
                        <p className="text-[9px] text-[#f0ebe0]/40 mt-0.5">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                </AdvancedRow>

                <AdvancedRow label="Preferred address">
                  <input
                    value={agent.preferred_address}
                    onChange={e => set("preferred_address")(e.target.value)}
                    placeholder="Sir/Ma'am"
                    className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
                  />
                </AdvancedRow>

                <AdvancedRow label="Linguistic notes (optional)">
                  <textarea
                    value={agent.linguistic_notes}
                    onChange={e => set("linguistic_notes")(e.target.value)}
                    rows={2}
                    placeholder="e.g. Never say 'no problem'. Use formal English. Keep sentences short."
                    className="w-full bg-[#f0ebe0]/[0.03] border border-[#f0ebe0]/10 focus:border-[#f0ebe0]/30 text-[#f0ebe0] text-sm p-3 focus:outline-none resize-none placeholder:text-[#f0ebe0]/15"
                  />
                </AdvancedRow>

                <AdvancedRow label="Hinglish mode">
                  <label className="flex items-center gap-3 cursor-pointer w-fit">
                    <button type="button" onClick={() => set("hinglish_mode")(!agent.hinglish_mode)}
                      className={`w-9 h-5 border relative transition-colors ${agent.hinglish_mode ? "bg-[#f0ebe0]/20 border-[#f0ebe0]/40" : "bg-transparent border-[#f0ebe0]/20"}`}>
                      <span className={`absolute top-0.5 w-3.5 h-3.5 bg-[#f0ebe0] transition-transform ${agent.hinglish_mode ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-xs font-mono text-[#f0ebe0]/40">fluent Hindi–English code-switching</span>
                  </label>
                </AdvancedRow>
              </div>
            </div>

            {/* LLM */}
            <div>
              <SectionLabel>AI model</SectionLabel>
              <div className="space-y-1.5">
                {AI_PROVIDERS.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { set("llm_provider")(p.id); set("llm_model")(p.model); }}
                    className={`w-full text-left border px-4 py-3 transition-all flex items-center justify-between ${agent.llm_provider === p.id ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-40 hover:opacity-70"}`}>
                    <div className="flex items-center gap-3">
                      <p className="text-xs font-bold text-[#f0ebe0]">{p.label}</p>
                      <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-40">{p.model}</span>
                    </div>
                    {agent.llm_provider === p.id && <Check size={11} className="text-[#f0ebe0]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* PEEK */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SectionLabel>PEEK — tension threshold</SectionLabel>
                <span className="text-[9px] font-mono border border-emerald-400/30 text-emerald-400 px-1.5 py-0.5 -mt-2">always on</span>
              </div>
              <div className="flex items-center gap-4">
                <input type="range" min="4" max="9" step="0.5"
                  value={agent.peek_threshold}
                  onChange={e => set("peek_threshold")(parseFloat(e.target.value))}
                  className="flex-1 accent-[#f0ebe0]"
                />
                <span className="text-sm font-mono font-bold text-[#f0ebe0] w-12 text-right">{agent.peek_threshold.toFixed(1)} / 10</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] font-mono text-[#f0ebe0]/25">4.0 sensitive</span>
                <span className="text-[9px] font-mono text-[#f0ebe0]/25">9.0 extreme only</span>
              </div>
            </div>

            {/* MESH */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <SectionLabel>MESH — memory depth</SectionLabel>
                <span className="text-[9px] font-mono border border-emerald-400/30 text-emerald-400 px-1.5 py-0.5 -mt-2">always on</span>
              </div>
              <div className="flex gap-2">
                {[{ label: "3 mo", days: 90 }, { label: "6 mo", days: 180 }, { label: "1 yr", days: 365 }, { label: "2 yr", days: 730 }].map(opt => (
                  <button key={opt.days} type="button" onClick={() => set("mesh_depth_days")(opt.days)}
                    className={`flex-1 border py-2 text-xs font-mono transition-all ${agent.mesh_depth_days === opt.days ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5 text-[#f0ebe0]" : "border-[#f0ebe0]/10 opacity-40 hover:opacity-70 text-[#f0ebe0]"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom variables */}
            <div>
              <SectionLabel>Custom variables</SectionLabel>
              <p className="text-[10px] text-[#f0ebe0]/25 mb-3">
                Define your own <span className="font-mono text-[#f0ebe0]/40">{"{{"}</span>variables<span className="font-mono text-[#f0ebe0]/40">{"}}"}</span> to inject at call start.
                System variables always available: {SYSTEM_VARIABLES.slice(0, 3).map(v => `{{${v.name}}}`).join(", ")}…
              </p>
              <div className="border border-[#f0ebe0]/10">
                {agent.agent_variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#f0ebe0]/5">
                    <span className="text-xs font-mono text-[#f0ebe0]/50 flex-1">{`{{${v.name}}}`}</span>
                    <span className="text-xs text-[#f0ebe0]/30 flex-1">{v.description}</span>
                    <button type="button" onClick={() => set("agent_variables")(agent.agent_variables.filter((_, j) => j !== i))}
                      className="opacity-20 hover:opacity-60 transition-opacity"><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-4 py-3">
                  <input placeholder="var_name" id="new-var-name"
                    className="flex-1 bg-transparent text-xs font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 pb-0.5" />
                  <input placeholder="description" id="new-var-desc"
                    className="flex-1 bg-transparent text-xs font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 pb-0.5" />
                  <button type="button" onClick={() => {
                    const n = (document.getElementById("new-var-name") as HTMLInputElement)?.value?.trim();
                    const d = (document.getElementById("new-var-desc") as HTMLInputElement)?.value?.trim();
                    if (!n) return;
                    set("agent_variables")([...agent.agent_variables, { name: n, description: d, source: "custom" as const }]);
                    (document.getElementById("new-var-name") as HTMLInputElement).value = "";
                    (document.getElementById("new-var-desc") as HTMLInputElement).value = "";
                  }} className="text-[10px] font-mono border border-[#f0ebe0]/20 px-2 py-1 opacity-40 hover:opacity-100 flex items-center gap-1">
                    <Plus size={9} /> add
                  </button>
                </div>
              </div>
            </div>

            {/* No-go topics */}
            <div>
              <SectionLabel>No-go topics</SectionLabel>
              <div className="border border-[#f0ebe0]/10">
                {agent.no_go_topics.map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0ebe0]/5">
                    <span className="text-xs font-mono text-[#f0ebe0]/50">{t}</span>
                    <button type="button" onClick={() => set("no_go_topics")(agent.no_go_topics.filter((_, j) => j !== i))}
                      className="opacity-20 hover:opacity-70 transition-opacity"><Trash2 size={11} /></button>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-4 py-3">
                  <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && newTopic.trim()) { set("no_go_topics")([...agent.no_go_topics, newTopic.trim()]); setNewTopic(""); } }}
                    placeholder="e.g. competitor pricing, staff names (press Enter)"
                    className="flex-1 bg-transparent text-xs font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 pb-0.5" />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );

  // ── Tools tab ─────────────────────────────────────────────────────────────

  const ToolsTab = (
    <div className="space-y-8">
      <div>
        <SectionLabel>Tools & actions</SectionLabel>
        {agent.tools.length === 0 ? (
          <div className="border border-[#f0ebe0]/10 px-6 py-10 text-center">
            <p className="text-xs font-mono text-[#f0ebe0]/30">no tools configured</p>
            <p className="text-[10px] font-mono text-[#f0ebe0]/20 mt-1">
              Add integrations from the{" "}
              <Link href="/integrations" className="underline hover:opacity-70">Integrations</Link>{" "}
              page, then add tools here.
            </p>
          </div>
        ) : (
          <div className="border border-[#f0ebe0]/10 divide-y divide-[#f0ebe0]/10">
            {agent.tools.map((tool, i) => (
              <div key={tool.id} className="px-5 py-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-mono font-bold text-[#f0ebe0]">{tool.name}()</p>
                    <button type="button"
                      onClick={() => { const t = [...agent.tools]; t[i] = { ...t[i], enabled: !t[i].enabled }; set("tools")(t); }}
                      className={`text-[9px] font-mono border px-1.5 py-0.5 transition-colors ${tool.enabled ? "border-emerald-400/30 text-emerald-400" : "border-[#f0ebe0]/20 opacity-40"}`}>
                      {tool.enabled ? "enabled" : "disabled"}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#f0ebe0]/40">{tool.description}</p>
                </div>
                <button type="button" onClick={() => set("tools")(agent.tools.filter((_, j) => j !== i))}
                  className="opacity-20 hover:opacity-60 transition-opacity flex-shrink-0 ml-4"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Escalation rules</SectionLabel>
        <div className="space-y-2">
          {agent.escalation_rules.map((rule, i) => (
            <div key={rule.id} className="border border-[#f0ebe0]/10">
              <button type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f0ebe0]/5 transition-colors"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono border border-[#f0ebe0]/10 px-1.5 py-0.5 flex-shrink-0">{rule.trigger}</span>
                  <span className="text-xs font-mono text-[#f0ebe0]/50 truncate">{rule.condition}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="text-[10px] font-mono text-[#f0ebe0]/30">{rule.action.replace(/_/g, " ")}</span>
                  {expandedRule === rule.id ? <ChevronUp size={11} className="opacity-40" /> : <ChevronDown size={11} className="opacity-40" />}
                </div>
              </button>
              {expandedRule === rule.id && (
                <div className="px-4 pb-4 pt-2 space-y-3 border-t border-[#f0ebe0]/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest block mb-1">trigger</label>
                      <select value={rule.trigger}
                        onChange={e => { const r = [...agent.escalation_rules]; r[i] = { ...r[i], trigger: e.target.value }; set("escalation_rules")(r); }}
                        className="w-full bg-transparent text-xs font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 pb-1 focus:outline-none">
                        {["tension_threshold", "topic_match", "repeat_request", "explicit_ask", "sentiment_drop"].map(t =>
                          <option key={t} value={t} className="bg-[#0a0a0a]">{t.replace(/_/g, " ")}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest block mb-1">action</label>
                      <select value={rule.action}
                        onChange={e => { const r = [...agent.escalation_rules]; r[i] = { ...r[i], action: e.target.value as EscalationRule["action"] }; set("escalation_rules")(r); }}
                        className="w-full bg-transparent text-xs font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 pb-1 focus:outline-none">
                        {ACTIONS.map(a => <option key={a.id} value={a.id} className="bg-[#0a0a0a]">{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest block mb-1">condition</label>
                    <input value={rule.condition}
                      onChange={e => { const r = [...agent.escalation_rules]; r[i] = { ...r[i], condition: e.target.value }; set("escalation_rules")(r); }}
                      className="w-full bg-transparent text-xs font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 pb-1 focus:outline-none placeholder:opacity-20"
                      placeholder="tension > 8.5 for 45 seconds" />
                  </div>
                  <button type="button"
                    onClick={() => set("escalation_rules")(agent.escalation_rules.filter((_, j) => j !== i))}
                    className="text-[10px] font-mono text-red-400/50 hover:text-red-400 transition-colors flex items-center gap-1">
                    <Trash2 size={9} /> remove
                  </button>
                </div>
              )}
            </div>
          ))}
          <button type="button"
            onClick={() => set("escalation_rules")([...agent.escalation_rules, {
              id: `er-${Date.now()}`, trigger: "tension_threshold",
              condition: "tension > 8.0 for 45 seconds", action: "transfer_human",
            }])}
            className="w-full flex items-center justify-center gap-2 text-xs font-mono border border-dashed border-[#f0ebe0]/15 py-3 opacity-40 hover:opacity-80 transition-opacity">
            <Plus size={11} /> add escalation rule
          </button>
        </div>
      </div>
    </div>
  );

  // ── Logs tab ──────────────────────────────────────────────────────────────

  const LogsTab = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Call logs</SectionLabel>
        <Link href="/calls" className="text-[10px] font-mono text-[#f0ebe0]/40 hover:text-[#f0ebe0] transition-colors">view all →</Link>
      </div>
      {calls.length === 0 ? (
        <div className="border border-[#f0ebe0]/10 px-6 py-16 text-center space-y-3">
          <PhoneCall size={20} className="opacity-10 mx-auto" />
          <p className="text-xs font-mono text-[#f0ebe0]/30">no calls yet</p>
          <p className="text-[10px] font-mono text-[#f0ebe0]/20">
            Click <strong>Talk</strong> in the header to make your first test call.
          </p>
        </div>
      ) : (
        <div className="border border-[#f0ebe0]/10">
          <div className="grid grid-cols-12 px-4 py-2.5 border-b border-[#f0ebe0]/10 bg-[#f0ebe0]/[0.02]">
            {[{ label: "call id", span: 3 }, { label: "type", span: 2 }, { label: "outcome", span: 2 }, { label: "duration", span: 2 }, { label: "empathy", span: 2 }, { label: "time", span: 1 }].map(col => (
              <div key={col.label} className={`col-span-${col.span}`}>
                <p className="text-[9px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest">{col.label}</p>
              </div>
            ))}
          </div>
          {calls.map((call, i) => (
            <Link key={call.id} href={`/calls/${call.id}`}
              className={`grid grid-cols-12 px-4 py-3 items-center hover:bg-[#f0ebe0]/5 transition-colors ${i < calls.length - 1 ? "border-b border-[#f0ebe0]/5" : ""}`}>
              <div className="col-span-3"><p className="text-[10px] font-mono text-[#f0ebe0]/50">{call.id}</p></div>
              <div className="col-span-2"><span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 text-[#f0ebe0]/40">{call.tags?.includes("web") ? "web" : "phone"}</span></div>
              <div className="col-span-2"><span className={`text-[9px] font-mono px-1.5 py-0.5 border ${outcomeBorder(call.outcome)}`}>{call.outcome}</span></div>
              <div className="col-span-2"><p className="text-[10px] font-mono text-[#f0ebe0]/50">{call.duration}</p></div>
              <div className="col-span-2"><p className="text-[10px] font-mono text-[#f0ebe0]/50">{call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}</p></div>
              <div className="col-span-1"><p className="text-[9px] font-mono text-[#f0ebe0]/30">{call.timestamp.slice(11, 16)}</p></div>
            </Link>
          ))}
          <p className="text-[9px] font-mono text-[#f0ebe0]/20 px-4 py-2">{calls.length} call{calls.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0ebe0]">
      {showTalk && <TalkModal agentId={agent.id} agentName={agent.name} onClose={() => setShowTalk(false)} />}

      {/* Top bar */}
      <div className="border-b border-[#f0ebe0]/10 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between sticky top-14 lg:top-0 bg-[#0a0a0a] z-30 gap-3">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
          <Link href="/agents" className="flex items-center gap-1.5 text-[10px] font-mono text-[#f0ebe0]/30 hover:text-[#f0ebe0]/80 transition-opacity flex-shrink-0">
            <ArrowLeft size={11} /> <span className="hidden sm:inline">agents</span>
          </Link>
          <span className="text-[#f0ebe0]/20 hidden sm:block">/</span>
          <input
            value={agent.name}
            onChange={e => set("name")(e.target.value)}
            className="text-sm font-bold bg-transparent text-[#f0ebe0] focus:outline-none border-b border-transparent focus:border-[#f0ebe0]/30 pb-0.5 min-w-0 w-36 sm:w-48"
          />
          <button type="button"
            onClick={() => set("status")(agent.status === "live" ? "paused" : agent.status === "paused" ? "live" : "draft")}
            className={`text-[9px] font-mono px-2 py-1 border transition-colors flex-shrink-0 ${agent.status === "live" ? "border-emerald-400/40 text-emerald-400" : agent.status === "paused" ? "border-amber-400/40 text-amber-400" : "border-[#f0ebe0]/20 text-[#f0ebe0]/40"}`}>
            {agent.status}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto overflow-x-auto pb-0.5 sm:overflow-visible">
          {error && <span className="text-[10px] font-mono text-red-400 hidden sm:block">{error}</span>}
          {saved && <span className="text-[10px] font-mono text-emerald-400">✓ saved</span>}

          <button type="button" onClick={() => setShowTalk(true)}
            className="min-h-10 flex items-center gap-1.5 text-xs font-mono border border-emerald-400/40 text-emerald-400 px-3 py-2 hover:bg-emerald-400/10 transition-colors whitespace-nowrap">
            <PhoneCall size={11} /> <span>Talk</span>
          </button>

          <button type="button" onClick={() => save()} disabled={saving || !changed}
            className="min-h-10 flex items-center gap-1.5 text-xs font-mono border border-[#f0ebe0]/20 px-3 py-2 text-[#f0ebe0]/60 hover:border-[#f0ebe0]/50 transition-colors disabled:opacity-30 whitespace-nowrap">
            {saving ? <Loader2 size={10} className="animate-spin" /> : null}
            {saving ? "saving..." : "save"}
          </button>
          <button type="button" onClick={() => save("live")} disabled={saving}
            className="min-h-10 flex items-center gap-1.5 text-xs font-mono bg-[#f0ebe0] text-[#0a0a0a] px-3 sm:px-4 py-2 hover:bg-[#f0ebe0]/90 transition-colors disabled:opacity-50 whitespace-nowrap">
            {saved ? <Check size={10} /> : null}
            {agent.status === "live" ? "published" : "publish"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row">
        {/* Left nav — tabs + stats */}
        <div className="w-full lg:w-44 border-b lg:border-b-0 lg:border-r border-[#f0ebe0]/10 flex-shrink-0 lg:min-h-screen lg:pt-6">
          <div className="flex lg:block overflow-x-auto">
            {(["configure", "tools", "logs"] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`min-w-max lg:w-full text-left px-5 py-3 text-xs font-mono flex items-center justify-between gap-2 transition-colors ${tab === t ? "text-[#f0ebe0]" : "text-[#f0ebe0]/30 hover:text-[#f0ebe0]/60"}`}>
                <span className="capitalize">{t}</span>
                {t === "logs" && calls.length > 0 && (
                  <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5">{calls.length}</span>
                )}
              </button>
            ))}
          </div>

          <div className="hidden lg:block mt-8 px-5 space-y-3 border-t border-[#f0ebe0]/10 pt-5">
            {[
              { label: "total calls", value: agent.total_calls > 0 ? agent.total_calls.toLocaleString() : "0" },
              { label: "today",       value: agent.calls_today.toString() },
              { label: "empathy",     value: agent.empathy_score > 0 ? `${agent.empathy_score}%` : "—" },
              { label: "resolved",    value: agent.resolved_rate > 0 ? `${agent.resolved_rate}%` : "—" },
              { label: "avg time",    value: agent.avg_handle_time || "—" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[9px] font-mono text-[#f0ebe0]/20 uppercase tracking-widest">{s.label}</p>
                <p className="text-sm font-bold font-mono text-[#f0ebe0]">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-4 sm:px-10 py-6 sm:py-8 max-w-2xl w-full">
          {tab === "configure" && ConfigureTab}
          {tab === "tools"     && ToolsTab}
          {tab === "logs"      && LogsTab}
        </div>
      </div>
    </div>
  );
}
