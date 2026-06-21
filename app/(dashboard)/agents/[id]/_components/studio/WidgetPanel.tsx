"use client";

import { useState } from "react";
import { Check, Copy, Key, Loader2, Trash2 } from "lucide-react";
import type { PublishKeyRow } from "./types";
import type { WebVoiceMode } from "@/lib/silk-voice";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl border border-[#E8E4DE] bg-[#1A1814] overflow-hidden">
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute top-2 right-2 text-[10px] font-mono text-[#F7F5F2]/60 hover:text-white flex items-center gap-1 z-10"
      >
        {copied ? <Check size={10} /> : <Copy size={10} />}
        {copied ? "copied" : "copy"}
      </button>
      <pre className="text-[11px] font-mono text-[#F7F5F2]/90 p-4 overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

export default function WidgetPanel({
  agentId,
  origin,
  voiceMode,
  publishKeys,
  keysLoading,
  newKeyReveal,
  keyCopied,
  onGenerateKey,
  onRevokeKey,
  onCopyKey,
  widgetLabel,
  widgetPosition,
  widgetColor,
  onWidgetLabel,
  onWidgetPosition,
  onWidgetColor,
}: {
  agentId: string;
  origin: string;
  voiceMode: WebVoiceMode;
  publishKeys: PublishKeyRow[];
  keysLoading: boolean;
  newKeyReveal: string | null;
  keyCopied: boolean;
  onGenerateKey: (kind: "live" | "test") => void;
  onRevokeKey: (id: string) => void;
  onCopyKey: () => void;
  widgetLabel: string;
  widgetPosition: string;
  widgetColor: string;
  onWidgetLabel: (v: string) => void;
  onWidgetPosition: (v: string) => void;
  onWidgetColor: (v: string) => void;
}) {
  const latestLiveKey = publishKeys.find((k) => k.kind === "live" && k.status === "active");
  const keyPlaceholder = newKeyReveal || (latestLiveKey ? `${latestLiveKey.prefix}…` : "sr_live_YOUR_KEY");

  const keySnippet = `<!-- Silk Resolve · recommended embed -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${origin}/widget.js?v=37';
    s.setAttribute('data-agent-key', '${newKeyReveal ?? "sr_live_YOUR_KEY"}');
    s.setAttribute('data-voice', '${voiceMode}');
    s.setAttribute('data-position', '${widgetPosition}');
    s.setAttribute('data-label', '${widgetLabel.replace(/'/g, "\\'")}');
    s.setAttribute('data-color', '${widgetColor}');
    s.defer = true;
    document.head.appendChild(s);
  })();
</script>`;

  const legacySnippet = `<!-- Legacy agent ID embed -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${origin}/widget.js?v=37';
    s.setAttribute('data-agent-id', '${agentId}');
    s.setAttribute('data-voice', '${voiceMode}');
    s.setAttribute('data-position', '${widgetPosition}');
    s.setAttribute('data-label', '${widgetLabel.replace(/'/g, "\\'")}');
    s.defer = true;
    document.head.appendChild(s);
  })();
</script>`;

  const previewUrl = newKeyReveal
    ? `${origin}/talk/embed?key=${encodeURIComponent(newKeyReveal)}&voice=${voiceMode}&autostart=0`
    : `${origin}/talk/${agentId}?voice=${voiceMode}`;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest">Button label</label>
          <input value={widgetLabel} onChange={(e) => onWidgetLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest">Position</label>
          <select value={widgetPosition} onChange={(e) => onWidgetPosition(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E8E4DE] px-3 py-2 text-sm">
            {["bottom-right", "bottom-left", "top-right", "top-left"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest">Color</label>
          <input type="color" value={widgetColor} onChange={(e) => onWidgetColor(e.target.value)} className="mt-1 w-full h-10 rounded-lg border border-[#E8E4DE] cursor-pointer" />
        </div>
      </div>

      <div className="rounded-xl border border-[#E8E4DE] overflow-hidden bg-[#0a0a0a] h-48 relative">
        <iframe src={previewUrl} className="w-full h-full border-0 opacity-90" title="Widget preview" />
        <p className="absolute bottom-2 left-3 text-[9px] font-mono text-white/40">live preview</p>
      </div>

      <div>
        <p className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest mb-3">Publish keys</p>
        {newKeyReveal && (
          <div className="mb-4 border border-[#C4A882] bg-[#C4A882]/10 rounded-xl p-4">
            <p className="text-[10px] font-mono text-[#6B6560] mb-2">Copy now — shown once</p>
            <code className="text-xs font-mono break-all block mb-2">{newKeyReveal}</code>
            <button type="button" onClick={onCopyKey} className="text-xs font-mono flex items-center gap-1 text-[#2D4A3E]">
              {keyCopied ? <Check size={12} /> : <Copy size={12} />} copy key
            </button>
          </div>
        )}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => onGenerateKey("live")} className="text-xs font-mono bg-[#2D4A3E] text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
            <Key size={12} /> live key
          </button>
          <button type="button" onClick={() => onGenerateKey("test")} className="text-xs font-mono border border-[#E8E4DE] px-3 py-2 rounded-lg">
            test key (draft OK)
          </button>
        </div>
        {keysLoading ? (
          <Loader2 size={14} className="animate-spin text-[#6B6560]" />
        ) : (
          <div className="border border-[#E8E4DE] rounded-xl divide-y bg-white">
            {publishKeys.length === 0 && <p className="px-4 py-6 text-xs text-[#6B6560] text-center">No keys yet</p>}
            {publishKeys.map((k) => (
              <div key={k.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-[10px] font-mono text-[#6B6560]">
                    {k.prefix}… · {k.kind} · {k.status}
                    {k.last_used ? ` · used ${new Date(k.last_used).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {k.status === "active" && (
                  <button type="button" onClick={() => onRevokeKey(k.id)} className="text-[#6B6560] hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest mb-2">
          Embed · publish key ({keyPlaceholder})
        </p>
        <CodeBlock code={keySnippet} />
      </div>
      <div>
        <p className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest mb-2">Legacy · agent ID</p>
        <CodeBlock code={legacySnippet} />
      </div>
    </div>
  );
}