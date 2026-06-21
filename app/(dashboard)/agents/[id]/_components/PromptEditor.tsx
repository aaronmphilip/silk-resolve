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
  light?: boolean;
}

export default function PromptEditor({
  label, value, onChange, customVariables = [],
  placeholder, rows = 12, monospace = true, light = false,
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

  const labelClass = light ? "text-[#6B6560]" : "opacity-30";
  const hintClass = light ? "text-[#6B6560]/60" : "opacity-20";
  const textareaClass = light
    ? `w-full bg-white border border-[#E8E4DE] focus:border-[#2D4A3E]/40 text-[#1A1814] text-sm leading-relaxed p-4 focus:outline-none resize-y placeholder:text-[#6B6560]/40 rounded-xl transition-colors ${monospace ? "font-mono" : ""}`
    : `w-full bg-[#f0ebe0]/[0.03] border border-[#f0ebe0]/10 focus:border-[#f0ebe0]/30 text-[#f0ebe0] text-sm leading-relaxed p-4 focus:outline-none resize-y placeholder:text-[#f0ebe0]/15 transition-colors ${monospace ? "font-mono" : ""}`;
  const pickerShell = light ? "bg-white border-[#E8E4DE] shadow-lg rounded-lg" : "bg-[#0f0f0f] border-[#f0ebe0]/20 shadow-xl";
  const pickerItemClass = (i: number) => light
    ? (i === selIdx ? "bg-[#F7F5F2]" : "hover:bg-[#FAF9F7]")
    : (i === selIdx ? "bg-[#f0ebe0]/8" : "hover:bg-[#f0ebe0]/5");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-[10px] font-mono uppercase tracking-widest ${labelClass}`}>{label}</label>
        <div className="flex items-center gap-3">
          {varCount > 0 && (
            <span className={`text-[9px] font-mono ${labelClass}`}>{varCount} variable{varCount !== 1 ? "s" : ""}</span>
          )}
          <span className={`text-[9px] font-mono ${hintClass}`}>type &#123;&#123; to insert variable</span>
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
          className={textareaClass}
        />

        {showPicker && filtered.length > 0 && (
          <div className={`absolute bottom-full left-0 mb-1 w-80 border z-50 max-h-52 overflow-y-auto ${pickerShell}`}>
            <div className={`px-3 py-2 border-b ${light ? "border-[#E8E4DE]" : "border-[#f0ebe0]/10"}`}>
              <p className={`text-[9px] font-mono uppercase tracking-widest ${labelClass}`}>
                variables · ↑↓ navigate · tab to insert
              </p>
            </div>
            {filtered.map((v, i) => (
              <button
                key={v.name}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertVar(v.name); }}
                className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition-colors ${light ? "border-[#E8E4DE]" : "border-[#f0ebe0]/5"} ${pickerItemClass(i)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-mono ${light ? "text-[#1A1814]" : "text-[#f0ebe0]"}`}>
                    {`{{${v.name}}}`}
                  </span>
                  <span className={`text-[9px] font-mono ${SOURCE_COLORS[v.source]}`}>{v.source}</span>
                </div>
                <p className={`text-[10px] mt-0.5 leading-tight ${light ? "text-[#6B6560]" : "opacity-30"}`}>{v.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
