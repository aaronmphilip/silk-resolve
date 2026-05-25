"use client";
import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Copy, Check } from "lucide-react";

export default function AgentRowMenu({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function copyId(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(agentId).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
    });
  }

  return (
    <div ref={ref} className="relative flex-shrink-0" onClick={e => e.preventDefault()}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        className="p-1.5 rounded transition-colors text-black/30 hover:text-black hover:bg-black/8
          dark:text-[#e8dece]/30 dark:hover:text-[#e8dece] dark:hover:bg-[#e8dece]/8"
        title="More options"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 border border-black/15 dark:border-[#e8dece]/15
          bg-[#E3DDCA] dark:bg-[#1a1a18] shadow-lg">

          {/* Agent ID display */}
          <div className="px-3 py-2 border-b border-black/8 dark:border-[#e8dece]/8">
            <p className="text-[9px] font-mono text-black/35 dark:text-[#e8dece]/35 uppercase tracking-widest mb-0.5">agent id</p>
            <p className="text-[10px] font-mono text-black/60 dark:text-[#e8dece]/60 truncate">{agentId}</p>
          </div>

          {/* Copy action */}
          <button
            onClick={copyId}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium
              hover:bg-black/8 dark:hover:bg-[#e8dece]/8 transition-colors text-left"
          >
            {copied
              ? <><Check size={12} className="text-emerald-600 dark:text-emerald-400" /><span className="text-emerald-600 dark:text-emerald-400">Copied!</span></>
              : <><Copy size={12} className="text-black/50 dark:text-[#e8dece]/50" /><span>Copy agent ID</span></>
            }
          </button>
        </div>
      )}
    </div>
  );
}
