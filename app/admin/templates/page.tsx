"use client";
import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil, Trash2, Check, X, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";

const VIBES    = ["professional", "friendly", "empathetic", "firm", "casual"];
const MODELS   = ["grok-4", "grok-3", "claude-opus-4-5", "claude-sonnet-4-5", "gpt-4o"];
const INDUSTRIES = ["general", "retail", "finance", "hr", "healthcare", "telecom", "logistics", "real-estate"];

interface Template {
  id: string; name: string; description: string; industry: string;
  system_prompt: string; first_message: string; llm_model: string;
  companion_vibe: string; tags: string[]; is_active: boolean; created_at: string;
}

const BLANK: Omit<Template, "id" | "created_at"> = {
  name: "", description: "", industry: "general",
  system_prompt: "", first_message: "",
  llm_model: "grok-4", companion_vibe: "professional",
  tags: [], is_active: true,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-mono text-[#f0ebe0]/40 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full bg-[#0a0a0a] border border-[#f0ebe0]/15 focus:border-[#f0ebe0]/50 text-sm text-[#f0ebe0] placeholder:text-[#f0ebe0]/20 px-3 py-2.5 focus:outline-none transition-colors font-mono";
const SELECT = `${INPUT} appearance-none`;

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<Partial<Template> | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [error, setError]         = useState("");

  const load = async () => {
    const r = await fetch("/api/admin/templates");
    if (r.ok) setTemplates(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name?.trim()) { setError("Template name is required"); return; }
    setSaving(true); setError("");
    const method = editing.id ? "PUT" : "POST";
    const r = await fetch("/api/admin/templates", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    if (r.ok) { setEditing(null); await load(); }
    else { const d = await r.json(); setError(d.error ?? "Save failed"); }
  }

  async function del(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/templates?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    setTemplates((t) => t.filter((x) => x.id !== id));
  }

  async function toggleActive(t: Template) {
    await fetch("/api/admin/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
    });
    setTemplates((ts) => ts.map((x) => x.id === t.id ? { ...x, is_active: !x.is_active } : x));
  }

  const set = (k: keyof typeof BLANK) => (v: unknown) =>
    setEditing((e) => e ? { ...e, [k]: v } : null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-[#f0ebe0]/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-[#f0ebe0]/10 px-8 py-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-1.5">/ admin / templates /</p>
          <h1 className="text-2xl font-bold text-[#f0ebe0] tracking-tight">agent templates.</h1>
          <p className="text-xs font-mono text-[#f0ebe0]/30 mt-1">starter configs tenants can clone when creating agents.</p>
        </div>
        <button
          onClick={() => { setEditing({ ...BLANK }); setError(""); }}
          className="flex items-center gap-2 bg-[#f0ebe0] text-[#0a0a0a] px-5 py-2.5 text-xs font-bold hover:bg-[#f0ebe0]/90 transition-colors mt-1"
        >
          <Plus size={12} /> new template
        </button>
      </div>

      {/* Template list */}
      <div className="px-8 py-8 space-y-3">
        {templates.length === 0 && (
          <div className="border border-[#f0ebe0]/10 px-8 py-12 text-center">
            <p className="text-sm font-mono text-[#f0ebe0]/20">no templates yet — create one above</p>
          </div>
        )}

        {templates.map((t) => (
          <div
            key={t.id}
            className={`border transition-colors ${t.is_active ? "border-[#f0ebe0]/15" : "border-[#f0ebe0]/5 opacity-40"}`}
          >
            {/* Row */}
            <div className="flex items-center px-5 py-4 gap-4">
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="flex-1 flex items-center gap-3 text-left min-w-0"
              >
                <ChevronDown
                  size={12}
                  className={`text-[#f0ebe0]/30 flex-shrink-0 transition-transform ${expanded === t.id ? "rotate-180" : ""}`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#f0ebe0]">{t.name}</p>
                    <span className="text-[9px] font-mono border border-[#f0ebe0]/20 px-1.5 py-0.5 text-[#f0ebe0]/40 capitalize">{t.industry}</span>
                    <span className="text-[9px] font-mono border border-[#f0ebe0]/10 px-1.5 py-0.5 text-[#f0ebe0]/30">{t.llm_model}</span>
                    {t.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] font-mono text-[#f0ebe0]/25 border border-[#f0ebe0]/10 px-1.5 py-0.5">#{tag}</span>
                    ))}
                  </div>
                  {t.description && (
                    <p className="text-xs text-[#f0ebe0]/35 mt-0.5 truncate">{t.description}</p>
                  )}
                </div>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(t)}
                  className="text-[#f0ebe0]/30 hover:text-[#f0ebe0]/70 transition-colors"
                  title={t.is_active ? "deactivate" : "activate"}
                >
                  {t.is_active ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} />}
                </button>
                <button
                  onClick={() => { setEditing({ ...t }); setError(""); }}
                  className="text-[#f0ebe0]/30 hover:text-[#f0ebe0] transition-colors p-1"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => del(t.id)}
                  disabled={deleting === t.id}
                  className="text-[#f0ebe0]/20 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
                >
                  {deleting === t.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>
              </div>
            </div>

            {/* Expanded preview */}
            {expanded === t.id && (
              <div className="border-t border-[#f0ebe0]/10 px-5 py-4 space-y-3">
                {t.first_message && (
                  <div>
                    <p className="text-[9px] font-mono text-[#f0ebe0]/20 uppercase tracking-widest mb-1">first message</p>
                    <p className="text-xs text-[#f0ebe0]/50 font-mono leading-relaxed">&ldquo;{t.first_message}&rdquo;</p>
                  </div>
                )}
                {t.system_prompt && (
                  <div>
                    <p className="text-[9px] font-mono text-[#f0ebe0]/20 uppercase tracking-widest mb-1">system prompt</p>
                    <p className="text-xs text-[#f0ebe0]/40 font-mono leading-relaxed whitespace-pre-wrap line-clamp-4">{t.system_prompt}</p>
                  </div>
                )}
                <p className="text-[9px] font-mono text-[#f0ebe0]/15">id: {t.id} · created {t.created_at.slice(0, 10)}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit / Create drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/60" onClick={() => setEditing(null)} />

          {/* Panel */}
          <div className="w-full max-w-xl bg-[#0f0f0f] border-l border-[#f0ebe0]/10 flex flex-col overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ebe0]/10">
              <p className="text-sm font-bold text-[#f0ebe0]">
                {editing.id ? "edit template" : "new template"}
              </p>
              <button onClick={() => setEditing(null)} className="text-[#f0ebe0]/30 hover:text-[#f0ebe0] transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Fields */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              <Field label="Name *">
                <input
                  className={INPUT}
                  placeholder="e.g. Customer Support"
                  value={editing.name ?? ""}
                  onChange={(e) => set("name")(e.target.value)}
                />
              </Field>

              <Field label="Description">
                <input
                  className={INPUT}
                  placeholder="Short description shown to tenants"
                  value={editing.description ?? ""}
                  onChange={(e) => set("description")(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Industry">
                  <div className="relative">
                    <select
                      className={SELECT}
                      value={editing.industry ?? "general"}
                      onChange={(e) => set("industry")(e.target.value)}
                    >
                      {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f0ebe0]/30 pointer-events-none" />
                  </div>
                </Field>

                <Field label="Vibe">
                  <div className="relative">
                    <select
                      className={SELECT}
                      value={editing.companion_vibe ?? "professional"}
                      onChange={(e) => set("companion_vibe")(e.target.value)}
                    >
                      {VIBES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f0ebe0]/30 pointer-events-none" />
                  </div>
                </Field>
              </div>

              <Field label="LLM Model">
                <div className="relative">
                  <select
                    className={SELECT}
                    value={editing.llm_model ?? "grok-4"}
                    onChange={(e) => set("llm_model")(e.target.value)}
                  >
                    {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#f0ebe0]/30 pointer-events-none" />
                </div>
              </Field>

              <Field label="First Message">
                <textarea
                  className={`${INPUT} resize-none`}
                  rows={2}
                  placeholder="What the agent says when the call connects"
                  value={editing.first_message ?? ""}
                  onChange={(e) => set("first_message")(e.target.value)}
                />
              </Field>

              <Field label="System Prompt">
                <textarea
                  className={`${INPUT} resize-none`}
                  rows={7}
                  placeholder="Instructions that define how this agent behaves..."
                  value={editing.system_prompt ?? ""}
                  onChange={(e) => set("system_prompt")(e.target.value)}
                />
              </Field>

              <Field label="Tags (comma-separated)">
                <input
                  className={INPUT}
                  placeholder="support, retail, general"
                  value={(editing.tags ?? []).join(", ")}
                  onChange={(e) =>
                    set("tags")(
                      e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                    )
                  }
                />
              </Field>

              {error && (
                <p className="text-xs font-mono text-red-400">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#f0ebe0]/10 px-6 py-4 flex items-center gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-[#f0ebe0] text-[#0a0a0a] px-6 py-2.5 text-xs font-bold hover:bg-[#f0ebe0]/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                {saving ? "saving..." : editing.id ? "save changes" : "create template"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-xs font-mono text-[#f0ebe0]/30 hover:text-[#f0ebe0]/60 transition-colors px-3 py-2.5"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
