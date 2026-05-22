"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, Loader2, Plus, Trash2, AlertTriangle,
  Zap, Brain, Mic, Database, ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import PromptEditor, { SYSTEM_VARIABLES, type PromptVariable } from "./PromptEditor";
import { AI_PROVIDERS } from "@/lib/ai-providers";
import type { Call } from "@/lib/types";
import { outcomeBorder } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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
}

interface AgentTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  params: string[];
}

interface EscalationRule {
  id: string;
  trigger: string;
  condition: string;
  action: "transfer_human" | "offer_callback" | "send_email";
}

type Tab = "configure" | "tools" | "conversations";

const LANGUAGES = [
  "English (en-IN)", "Hindi (hi-IN)", "Hinglish (hi-IN / en-IN)",
  "Tamil (ta-IN)", "Telugu (te-IN)", "Kannada (kn-IN)",
  "Marathi (mr-IN)", "Bengali (bn-IN)", "Gujarati (gu-IN)",
  "Malayalam (ml-IN)",
];

const COMPANION_VIBES: { id: "casual" | "professional" | "protective"; label: string; desc: string }[] = [
  { id: "casual",       label: "Casual",       desc: "Friendly, warm, uses informal language. Good for consumer apps." },
  { id: "professional", label: "Professional", desc: "Precise, efficient, formal. Best for banking and healthcare." },
  { id: "protective",   label: "Protective",   desc: "Deeply empathetic, patient. Best for escalation-heavy contexts." },
];

const ACTIONS: { id: EscalationRule["action"]; label: string }[] = [
  { id: "transfer_human", label: "Transfer to human" },
  { id: "offer_callback", label: "Offer callback" },
  { id: "send_email",     label: "Send email alert" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, badge }: {
  icon: React.ReactNode; title: string; subtitle: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="opacity-40 mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#f0ebe0]">{title}</h2>
          {badge}
        </div>
        <p className="text-[10px] font-mono opacity-30 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function AlwaysOnBadge() {
  return (
    <span className="text-[9px] font-mono px-1.5 py-0.5 border border-emerald-400/30 text-emerald-400 tracking-wider">
      always on
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AgentEditor({
  initial, calls, silkConfigured, elevenlabsConfigured,
}: {
  initial: AgentRow;
  calls: Call[];
  silkConfigured: boolean;
  elevenlabsConfigured: boolean;
}) {
  const [agent, setAgent] = useState<AgentRow>(initial);
  const [tab, setTab] = useState<Tab>("configure");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

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
    if (res.ok) { setSaved(true); setAgent(a => ({ ...a, status: payload.status })); setTimeout(() => setSaved(false), 3000); }
    else { const d = await res.json(); setError(d.error ?? "save failed"); }
  }

  const customVars: PromptVariable[] = agent.agent_variables.map(v => ({ ...v, source: "custom" as const }));

  // ── Tab: Configure ──────────────────────────────────────────────────────────

  const ConfigureTab = (
    <div className="space-y-10">

      {/* System Prompt */}
      <div>
        <SectionHeader
          icon={<Brain size={14} />}
          title="System prompt"
          subtitle="The agent's full personality, behaviour rules, and context. PEEK + MESH inject dynamic variables at call start."
        />
        <PromptEditor
          label="system prompt"
          value={agent.system_prompt}
          onChange={set("system_prompt")}
          customVariables={customVars}
          placeholder={`You are a customer support specialist for {{company_name}}.\n\nYour role is to resolve customer issues with warmth and efficiency.\n\nCONTEXT (injected by PEEK + MESH):\n- Address caller as {{preferred_address}}\n- Language: {{language}}\n- Emotional debt: {{emotional_debt}}\n- Last outcome: {{last_outcome}}\n\nAlways confirm resolution before ending the call.`}
          rows={16}
        />
      </div>

      {/* First Message */}
      <div>
        <SectionHeader
          icon={<Mic size={14} />}
          title="First message"
          subtitle="What the agent says when the call connects. Leave blank to wait for the caller."
        />
        <PromptEditor
          label="first message"
          value={agent.first_message}
          onChange={set("first_message")}
          customVariables={customVars}
          placeholder="Hello {{preferred_address}}, I'm Aria from {{company_name}}. How can I help you today?"
          rows={3}
          monospace={false}
        />
      </div>

      {/* Voice */}
      <div>
        <SectionHeader
          icon={<Mic size={14} />}
          title="Voice"
          subtitle="SILK by Rumik is the primary voice engine. ElevenLabs is the fallback. Configure API keys in admin settings."
        />
        <div className="border border-[#f0ebe0]/10 divide-y divide-[#f0ebe0]/10">
          {/* SILK */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${silkConfigured ? "bg-emerald-400" : "bg-[#f0ebe0]/20"}`} />
                <p className="text-sm font-bold text-[#f0ebe0]">SILK</p>
                <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-40">by Rumik</span>
                <span className="text-[9px] font-mono border border-amber-400/30 text-amber-400 px-1.5 py-0.5">primary</span>
              </div>
              {!silkConfigured && <span className="text-[10px] font-mono opacity-30">not configured · add key in admin</span>}
            </div>
            <p className="text-[10px] opacity-30 font-mono leading-relaxed mb-3">
              Prosody-aware neural voice. Responds to <span className="text-[#f0ebe0]/60">{"<warm>"}</span>,{" "}
              <span className="text-[#f0ebe0]/60">{"<apologetic_whisper>"}</span>,{" "}
              <span className="text-[#f0ebe0]/60">{"<warm_closing>"}</span> tags from your script.
            </p>
            <div>
              <label className="text-[10px] font-mono opacity-30 uppercase tracking-widest block mb-1.5">voice / model id</label>
              <input
                value={agent.silk_voice_id}
                onChange={e => set("silk_voice_id")(e.target.value)}
                placeholder="silk-1 (leave blank for default)"
                className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
              />
            </div>
          </div>
          {/* ElevenLabs fallback */}
          <div className="px-5 py-4 opacity-60">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${elevenlabsConfigured ? "bg-emerald-400" : "bg-[#f0ebe0]/20"}`} />
                <p className="text-sm font-bold text-[#f0ebe0]">ElevenLabs</p>
                <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-40">fallback</span>
              </div>
              {!elevenlabsConfigured && <span className="text-[10px] font-mono opacity-30">not configured</span>}
            </div>
            <p className="text-[10px] opacity-30 font-mono">eleven_turbo_v2 · ultra-low latency · used when SILK key is absent</p>
          </div>
          {/* Vapi fallback */}
          <div className="px-5 py-3 opacity-30">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f0ebe0]/20" />
              <p className="text-xs font-mono text-[#f0ebe0]">Vapi built-in (PlayHT)</p>
              <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-60">last resort</span>
            </div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div>
        <SectionHeader
          icon={<Database size={14} />}
          title="Language & communication"
          subtitle="Primary language and tone style for this agent"
        />
        <div className="space-y-5">
          <Field label="primary language">
            <select
              value={agent.language}
              onChange={e => set("language")(e.target.value)}
              className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1 focus:outline-none"
            >
              {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#0a0a0a]">{l}</option>)}
            </select>
          </Field>

          <Field label="hinglish mode">
            <label className="flex items-center gap-3 cursor-pointer w-fit">
              <button
                type="button"
                onClick={() => set("hinglish_mode")(!agent.hinglish_mode)}
                className={`w-10 h-5 rounded-full border transition-colors relative ${agent.hinglish_mode ? "bg-[#f0ebe0]/20 border-[#f0ebe0]/40" : "bg-transparent border-[#f0ebe0]/20"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#f0ebe0] transition-transform ${agent.hinglish_mode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs font-mono opacity-50">agent fluidly code-switches between Hindi and English</span>
            </label>
          </Field>

          <Field label="companion vibe">
            <div className="space-y-2 mt-1">
              {COMPANION_VIBES.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => set("companion_vibe")(v.id)}
                  className={`w-full text-left border p-3 transition-all ${agent.companion_vibe === v.id ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-50 hover:opacity-80"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#f0ebe0]">{v.label}</p>
                    {agent.companion_vibe === v.id && <Check size={11} />}
                  </div>
                  <p className="text-[10px] opacity-40 mt-0.5">{v.desc}</p>
                </button>
              ))}
            </div>
          </Field>

          <Field label="preferred address">
            <input
              value={agent.preferred_address}
              onChange={e => set("preferred_address")(e.target.value)}
              placeholder="Sir/Ma'am"
              className="w-full bg-transparent text-sm font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-1"
            />
          </Field>

          <Field label="linguistic notes">
            <textarea
              value={agent.linguistic_notes}
              onChange={e => set("linguistic_notes")(e.target.value)}
              rows={3}
              placeholder="How should the agent speak? e.g. 'Use formal English. Never say &quot;no problem&quot;. Short sentences.'"
              className="w-full bg-[#f0ebe0]/[0.03] border border-[#f0ebe0]/10 focus:border-[#f0ebe0]/30 text-[#f0ebe0] text-sm p-3 focus:outline-none resize-none placeholder:text-[#f0ebe0]/15 transition-colors"
            />
          </Field>
        </div>
      </div>

      {/* LLM */}
      <div>
        <SectionHeader
          icon={<Zap size={14} />}
          title="LLM"
          subtitle="AI model powering this agent's reasoning. Configure API keys in admin settings."
        />
        <div className="space-y-2">
          {AI_PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { set("llm_provider")(p.id); set("llm_model")(p.model); }}
              className={`w-full text-left border p-3 transition-all ${agent.llm_provider === p.id ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-50 hover:opacity-80"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-[#f0ebe0]">{p.label}</p>
                    <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 opacity-40">{p.model}</span>
                  </div>
                  <p className="text-[10px] opacity-30 mt-0.5">{p.note}</p>
                </div>
                {agent.llm_provider === p.id && <Check size={11} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PEEK */}
      <div>
        <SectionHeader
          icon={<Eye size={14} />}
          title="PEEK — hidden intent radar"
          subtitle="Detects sarcasm, suppressed frustration, latency spikes. Fires before the caller explicitly complains."
          badge={<AlwaysOnBadge />}
        />
        <div className="border border-[#f0ebe0]/10 p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono opacity-30 uppercase tracking-widest">tension threshold</label>
              <span className="text-sm font-mono font-bold">{agent.peek_threshold.toFixed(1)}<span className="text-[10px] opacity-30"> / 10</span></span>
            </div>
            <input
              type="range" min="4" max="9" step="0.5"
              value={agent.peek_threshold}
              onChange={e => set("peek_threshold")(parseFloat(e.target.value))}
              className="w-full accent-[#f0ebe0]"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] font-mono opacity-25">4.0 — sensitive, fires early</span>
              <span className="text-[9px] font-mono opacity-25">9.0 — only extreme cases</span>
            </div>
            <p className="text-[10px] font-mono opacity-20 mt-2">
              When tension ≥ {agent.peek_threshold.toFixed(1)}: SILK prosody tags are pre-loaded, empathy boost is triggered, escalation watchdog activates.
            </p>
          </div>
        </div>
      </div>

      {/* MESH */}
      <div>
        <SectionHeader
          icon={<Database size={14} />}
          title="MESH — relationship memory"
          subtitle="Recalls caller's emotional debt, past outcomes, and anchors from prior calls. Injects context before the first word."
          badge={<AlwaysOnBadge />}
        />
        <div className="border border-[#f0ebe0]/10 p-5 space-y-4">
          <Field label="memory depth">
            <div className="flex items-center gap-3 mt-1">
              {[
                { label: "3 months", days: 90 },
                { label: "6 months", days: 180 },
                { label: "1 year",   days: 365 },
                { label: "2 years",  days: 730 },
              ].map(opt => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => set("mesh_depth_days")(opt.days)}
                  className={`text-xs font-mono border px-3 py-1.5 transition-all ${agent.mesh_depth_days === opt.days ? "border-[#f0ebe0]/40 bg-[#f0ebe0]/5" : "border-[#f0ebe0]/10 opacity-40 hover:opacity-70"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>
          <p className="text-[10px] font-mono opacity-20">
            MESH recalls all interactions from the past {agent.mesh_depth_days} days. Emotional debt is weighted by recency. Anchors are always retrieved regardless of depth.
          </p>
        </div>
      </div>

      {/* Custom Variables */}
      <div>
        <SectionHeader
          icon={<Database size={14} />}
          title="Custom variables"
          subtitle="Define your own {{variables}} to inject into the system prompt at call start"
        />
        <div className="border border-[#f0ebe0]/10">
          <div className="px-4 py-3 border-b border-[#f0ebe0]/10">
            <div className="grid grid-cols-3 gap-2 text-[9px] font-mono opacity-25 uppercase tracking-widest">
              <span>name</span><span>description</span><span></span>
            </div>
          </div>
          {agent.agent_variables.map((v, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 px-4 py-2.5 border-b border-[#f0ebe0]/5 items-center">
              <span className="text-xs font-mono text-[#f0ebe0]/60">{`{{${v.name}}}`}</span>
              <span className="text-xs opacity-40">{v.description}</span>
              <button
                type="button"
                onClick={() => set("agent_variables")(agent.agent_variables.filter((_, j) => j !== i))}
                className="text-[10px] font-mono opacity-20 hover:opacity-60 text-right"
              >remove</button>
            </div>
          ))}
          <div className="px-4 py-3 flex items-center gap-2">
            <input
              placeholder="variable_name"
              id="new-var-name"
              className="flex-1 bg-transparent text-xs font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-0.5"
            />
            <input
              placeholder="description"
              id="new-var-desc"
              className="flex-1 bg-transparent text-xs font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-0.5"
            />
            <button
              type="button"
              onClick={() => {
                const name = (document.getElementById("new-var-name") as HTMLInputElement)?.value?.trim();
                const desc = (document.getElementById("new-var-desc") as HTMLInputElement)?.value?.trim();
                if (!name) return;
                set("agent_variables")([...agent.agent_variables, { name, description: desc, source: "custom" as const }]);
                (document.getElementById("new-var-name") as HTMLInputElement).value = "";
                (document.getElementById("new-var-desc") as HTMLInputElement).value = "";
              }}
              className="text-[10px] font-mono opacity-40 hover:opacity-100 border border-[#f0ebe0]/20 px-2 py-1 whitespace-nowrap flex items-center gap-1"
            >
              <Plus size={9} /> add
            </button>
          </div>
        </div>
        <p className="text-[9px] font-mono opacity-20 mt-2">
          System variables (PEEK + MESH) are always available: {SYSTEM_VARIABLES.map(v => `{{${v.name}}}`).join(", ")}
        </p>
      </div>

      {/* No-go topics */}
      <div>
        <SectionHeader
          icon={<AlertTriangle size={14} />}
          title="No-go topics"
          subtitle="Topics the agent must never discuss, regardless of what the caller asks"
        />
        <div className="border border-[#f0ebe0]/10">
          {agent.no_go_topics.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0ebe0]/5">
              <span className="text-xs font-mono opacity-60">{t}</span>
              <button type="button" onClick={() => set("no_go_topics")(agent.no_go_topics.filter((_, j) => j !== i))}
                className="opacity-20 hover:opacity-70 transition-opacity">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newTopic.trim()) {
                  set("no_go_topics")([...agent.no_go_topics, newTopic.trim()]);
                  setNewTopic("");
                }
              }}
              placeholder="e.g. staff names, competitor pricing (press Enter)"
              className="flex-1 bg-transparent text-xs font-mono text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 focus:outline-none border-b border-[#f0ebe0]/10 focus:border-[#f0ebe0]/40 pb-0.5"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab: Tools ──────────────────────────────────────────────────────────────

  const ToolsTab = (
    <div className="space-y-8">
      <div>
        <SectionHeader
          icon={<Zap size={14} />}
          title="Tools & actions"
          subtitle="Functions the agent can call during a conversation. Connect integrations in the Integrations page."
        />
        {agent.tools.length === 0 ? (
          <div className="border border-[#f0ebe0]/10 px-6 py-10 text-center">
            <p className="text-xs font-mono opacity-30">no tools configured</p>
            <p className="text-[10px] font-mono opacity-20 mt-1">
              Add integrations from the{" "}
              <Link href="/integrations" className="underline hover:opacity-70">Integrations</Link>{" "}
              page, then add tools here.
            </p>
          </div>
        ) : (
          <div className="border border-[#f0ebe0]/10 divide-y divide-[#f0ebe0]/10">
            {agent.tools.map((tool, i) => (
              <div key={tool.id} className="px-5 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-mono font-bold text-[#f0ebe0]">{tool.name}()</p>
                      <button
                        type="button"
                        onClick={() => {
                          const tools = [...agent.tools];
                          tools[i] = { ...tools[i], enabled: !tools[i].enabled };
                          set("tools")(tools);
                        }}
                        className={`text-[9px] font-mono border px-1.5 py-0.5 transition-colors ${tool.enabled ? "border-emerald-400/30 text-emerald-400" : "border-[#f0ebe0]/20 opacity-40"}`}
                      >
                        {tool.enabled ? "enabled" : "disabled"}
                      </button>
                    </div>
                    <p className="text-[10px] opacity-40">{tool.description}</p>
                    {tool.params.length > 0 && (
                      <p className="text-[9px] font-mono opacity-25 mt-1">params: {tool.params.join(", ")}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => set("tools")(agent.tools.filter((_, j) => j !== i))}
                    className="opacity-20 hover:opacity-60 transition-opacity flex-shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escalation Rules */}
      <div>
        <SectionHeader
          icon={<AlertTriangle size={14} />}
          title="Escalation rules"
          subtitle="When these conditions are met, the agent takes the defined action automatically"
        />
        <div className="space-y-2">
          {agent.escalation_rules.map((rule, i) => (
            <div key={rule.id} className="border border-[#f0ebe0]/10">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f0ebe0]/5 transition-colors"
                onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono opacity-30 border border-[#f0ebe0]/10 px-1.5 py-0.5">{rule.trigger}</span>
                  <span className="text-xs font-mono opacity-60 truncate max-w-xs">{rule.condition}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono opacity-40">{rule.action.replace(/_/g, " ")}</span>
                  {expandedRule === rule.id ? <ChevronUp size={11} className="opacity-40" /> : <ChevronDown size={11} className="opacity-40" />}
                </div>
              </button>
              {expandedRule === rule.id && (
                <div className="px-4 pb-4 pt-2 space-y-3 border-t border-[#f0ebe0]/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-mono opacity-25 uppercase tracking-widest block mb-1">trigger type</label>
                      <select
                        value={rule.trigger}
                        onChange={e => { const r=[...agent.escalation_rules]; r[i]={...r[i],trigger:e.target.value}; set("escalation_rules")(r); }}
                        className="w-full bg-transparent text-xs font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 pb-1 focus:outline-none"
                      >
                        {["tension_threshold","topic_match","repeat_request","explicit_ask","sentiment_drop"].map(t => (
                          <option key={t} value={t} className="bg-[#0a0a0a]">{t.replace(/_/g," ")}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-mono opacity-25 uppercase tracking-widest block mb-1">action</label>
                      <select
                        value={rule.action}
                        onChange={e => { const r=[...agent.escalation_rules]; r[i]={...r[i],action:e.target.value as EscalationRule["action"]}; set("escalation_rules")(r); }}
                        className="w-full bg-transparent text-xs font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 pb-1 focus:outline-none"
                      >
                        {ACTIONS.map(a => <option key={a.id} value={a.id} className="bg-[#0a0a0a]">{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-mono opacity-25 uppercase tracking-widest block mb-1">condition</label>
                    <input
                      value={rule.condition}
                      onChange={e => { const r=[...agent.escalation_rules]; r[i]={...r[i],condition:e.target.value}; set("escalation_rules")(r); }}
                      className="w-full bg-transparent text-xs font-mono text-[#f0ebe0] border-b border-[#f0ebe0]/10 pb-1 focus:outline-none placeholder:opacity-20"
                      placeholder="tension > 8.5 sustained for 45 seconds"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set("escalation_rules")(agent.escalation_rules.filter((_, j) => j !== i))}
                    className="text-[10px] font-mono text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={9} /> remove rule
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("escalation_rules")([...agent.escalation_rules, {
              id: `er-${Date.now()}`, trigger: "tension_threshold",
              condition: "tension > 8.0 for 45 seconds", action: "transfer_human",
            }])}
            className="w-full flex items-center justify-center gap-2 text-xs font-mono border border-dashed border-[#f0ebe0]/15 py-3 opacity-40 hover:opacity-80 transition-opacity"
          >
            <Plus size={11} /> add escalation rule
          </button>
        </div>
      </div>
    </div>
  );

  // ── Tab: Conversations ──────────────────────────────────────────────────────

  const ConversationsTab = (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">recent conversations</p>
        <Link href="/calls" className="text-[10px] font-mono opacity-40 hover:opacity-100 underline">view all →</Link>
      </div>
      {calls.length === 0 ? (
        <div className="border border-[#f0ebe0]/10 px-6 py-12 text-center">
          <p className="text-xs font-mono opacity-30">no calls yet</p>
          <p className="text-[10px] font-mono opacity-20 mt-1">
            Configure Vapi + voice keys to start receiving calls.
          </p>
        </div>
      ) : (
        <div className="border border-[#f0ebe0]/10 divide-y divide-[#f0ebe0]/10">
          {calls.map(call => (
            <Link
              key={call.id}
              href={`/calls/${call.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f0ebe0]/5 transition-colors"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-mono opacity-40">{call.id}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 border ${outcomeBorder(call.outcome)}`}>{call.outcome}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono opacity-50">{call.duration}</span>
                  <span className="text-xs font-mono font-bold">{call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}</span>
                  <div className="flex gap-1">
                    {call.tags.slice(0, 2).map((t, j) => (
                      <span key={j} className="text-[9px] font-mono bg-[#f0ebe0]/5 border border-[#f0ebe0]/10 px-1.5 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono opacity-30">{call.timestamp.slice(11, 16)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="border-b border-[#f0ebe0]/10 px-8 py-4 flex items-center justify-between sticky top-0 bg-[#0a0a0a] z-40">
        <div className="flex items-center gap-4">
          <Link href="/agents" className="flex items-center gap-1.5 text-[10px] font-mono opacity-30 hover:opacity-80 transition-opacity">
            <ArrowLeft size={11} /> agents
          </Link>
          <span className="opacity-20 text-xs">/</span>
          <input
            value={agent.name}
            onChange={e => set("name")(e.target.value)}
            className="text-sm font-bold bg-transparent text-[#f0ebe0] focus:outline-none border-b border-transparent focus:border-[#f0ebe0]/30 pb-0.5 min-w-0 w-48"
          />
          <button
            type="button"
            onClick={() => set("status")(agent.status === "live" ? "paused" : agent.status === "paused" ? "live" : "draft")}
            className={`text-[9px] font-mono px-2 py-1 border transition-colors ${agent.status === "live" ? "border-emerald-400/40 text-emerald-400" : agent.status === "paused" ? "border-amber-400/40 text-amber-400" : "border-[#f0ebe0]/20 opacity-50"}`}
          >
            {agent.status}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {changed && <span className="text-[10px] font-mono opacity-30">unsaved changes</span>}
          {error && <span className="text-[10px] font-mono text-red-400">{error}</span>}
          {saved && <span className="text-[10px] font-mono text-emerald-400">✓ saved</span>}
          <button
            type="button"
            onClick={() => save()}
            disabled={saving || !changed}
            className="flex items-center gap-1.5 text-xs font-mono border border-[#f0ebe0]/20 px-4 py-2 hover:border-[#f0ebe0]/50 transition-colors disabled:opacity-30"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : null}
            {saving ? "saving..." : "save"}
          </button>
          <button
            type="button"
            onClick={() => save("live")}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs font-mono bg-[#f0ebe0] text-[#0a0a0a] px-4 py-2 hover:bg-[#f0ebe0]/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : saved ? <Check size={10} /> : null}
            {saving ? "publishing..." : agent.status === "live" ? "published" : "publish"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        {/* Sidebar tabs */}
        <div className="w-44 border-r border-[#f0ebe0]/10 min-h-screen flex-shrink-0 pt-6">
          {([
            { id: "configure",     label: "Configure" },
            { id: "tools",         label: "Tools" },
            { id: "conversations", label: "Conversations", count: calls.length },
          ] as const).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-5 py-3 text-xs font-mono flex items-center justify-between transition-colors ${tab === t.id ? "text-[#f0ebe0] opacity-100" : "opacity-30 hover:opacity-60"}`}
            >
              {t.label}
              {"count" in t && t.count > 0 && (
                <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5">{t.count}</span>
              )}
            </button>
          ))}

          {/* Stats panel */}
          <div className="mt-8 px-5 space-y-3 border-t border-[#f0ebe0]/10 pt-5">
            {[
              { label: "total calls",    value: agent.total_calls.toLocaleString() },
              { label: "today",          value: agent.calls_today.toString() },
              { label: "empathy",        value: agent.empathy_score > 0 ? `${agent.empathy_score}%` : "—" },
              { label: "resolved",       value: agent.resolved_rate > 0 ? `${agent.resolved_rate}%` : "—" },
              { label: "avg time",       value: agent.avg_handle_time },
            ].map(s => (
              <div key={s.label}>
                <p className="text-[9px] font-mono opacity-20 uppercase tracking-widest">{s.label}</p>
                <p className="text-sm font-bold font-mono">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-10 py-8 max-w-2xl">
          {tab === "configure"     && ConfigureTab}
          {tab === "tools"         && ToolsTab}
          {tab === "conversations" && ConversationsTab}
        </div>
      </div>
    </div>
  );
}
