"use client";
import { useRef, useState, useCallback } from "react";

export interface PromptVariable {
  name: string;
  description: string;
  source: "PEEK" | "MESH" | "system" | "custom";
}

export const SYSTEM_VARIABLES: PromptVariable[] = [
  { name: "preferred_address",  description: "How caller prefers to be addressed (Sir, Bhaiya, etc.)", source: "MESH" },
  { name: "caller_name",        description: "Caller's name from MESH profile",                       source: "MESH" },
  { name: "caller_phone",       description: "Caller's inbound phone number",                         source: "system" },
  { name: "emotional_debt",     description: "MESH emotional debt score (−100 to +100)",              source: "MESH" },
  { name: "language",           description: "Caller's preferred language",                           source: "MESH" },
  { name: "company_name",       description: "Your tenant / organisation name",                       source: "system" },
  { name: "last_outcome",       description: "Previous call outcome (resolved/escalated/abandoned)",  source: "MESH" },
  { name: "tension_level",      description: "Current PEEK tension score (0–10)",                     source: "PEEK" },
  { name: "contextual_anchors", description: "Key facts MESH remembered about this caller",          source: "MESH" },
];

const SOURCE_COLORS: Record<string, string> = {
  PEEK:   "text-amber-400",
  MESH:   "text-sky-400",
  system: "text-[#f0ebe0]/40",
  custom: "text-emerald-400",
};

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  customVariables?: PromptVariable[];
  placeholder?: string;
  rows?: number;
  monospace?: boolean;
}

export default function PromptEditor({
  label, value, onChange, customVariables = [],
  placeholder, rows = 12, monospace = true,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const [selIdx, setSelIdx] = useState(0);
  const allVars = [...SYSTEM_VARIABLES, ...customVariables];

  const filtered = allVars.filter(v =>
    v.name.toLowerCase().includes(varSearch.toLowerCase()) ||
    v.description.toLowerCase().includes(varSearch.toLowerCase())
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen !== -1) {
      const between = before.slice(lastOpen + 2);
      if (!between.includes("}}") && !between.includes("\n")) {
        setVarSearch(between);
        setSelIdx(0);
        setShowPicker(true);
        return;
      }
    }
    setShowPicker(false);
  }, [onChange]);

  const insertVar = useCallback((name: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const lastOpen = before.lastIndexOf("{{");
    const newVal = value.slice(0, lastOpen) + `{{${name}}}` + value.slice(cursor);
    onChange(newVal);
    setShowPicker(false);
    requestAnimationFrame(() => {
      const pos = lastOpen + name.length + 4;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showPicker || filtered.length === 0) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setSelIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); insertVar(filtered[selIdx].name); }
    if (e.key === "Escape")     { e.preventDefault(); setShowPicker(false); }
  };

  // Count {{variables}} in the prompt to show count badge
  const varCount = (value.match(/\{\{[\w_]+\}\}/g) ?? []).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-mono opacity-30 uppercase tracking-widest">{label}</label>
        <div className="flex items-center gap-3">
          {varCount > 0 && (
            <span className="text-[9px] font-mono opacity-30">{varCount} variable{varCount !== 1 ? "s" : ""}</span>
          )}
          <span className="text-[9px] font-mono opacity-20">type &#123;&#123; to insert variable</span>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowPicker(false), 150)}
          rows={rows}
          placeholder={placeholder}
          className={`w-full bg-[#f0ebe0]/[0.03] border border-[#f0ebe0]/10 focus:border-[#f0ebe0]/30 text-[#f0ebe0] text-sm leading-relaxed p-4 focus:outline-none resize-y placeholder:text-[#f0ebe0]/15 transition-colors ${monospace ? "font-mono" : ""}`}
        />

        {/* Variable picker */}
        {showPicker && filtered.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-80 bg-[#0f0f0f] border border-[#f0ebe0]/20 z-50 max-h-52 overflow-y-auto shadow-xl">
            <div className="px-3 py-2 border-b border-[#f0ebe0]/10">
              <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">
                variables · ↑↓ navigate · tab to insert
              </p>
            </div>
            {filtered.map((v, i) => (
              <button
                key={v.name}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertVar(v.name); }}
                className={`w-full text-left px-3 py-2.5 border-b border-[#f0ebe0]/5 last:border-b-0 transition-colors ${i === selIdx ? "bg-[#f0ebe0]/8" : "hover:bg-[#f0ebe0]/5"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#f0ebe0]">
                    {`{{${v.name}}}`}
                  </span>
                  <span className={`text-[9px] font-mono ${SOURCE_COLORS[v.source]}`}>{v.source}</span>
                </div>
                <p className="text-[10px] opacity-30 mt-0.5 leading-tight">{v.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
