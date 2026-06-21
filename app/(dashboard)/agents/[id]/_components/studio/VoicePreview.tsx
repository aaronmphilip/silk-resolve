"use client";

import { useState } from "react";
import { Loader2, Play, Square } from "lucide-react";
import type { WebVoiceMode } from "@/lib/silk-voice";
import { silkTtsQueryForMode } from "@/lib/silk-voice";

export default function VoicePreview({
  text,
  voiceMode,
  disabled,
}: {
  text: string;
  voiceMode: WebVoiceMode;
  disabled?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  async function preview() {
    const sample = text.trim() || "Hello, how can I help you today?";
    setError("");
    setPlaying(true);
    try {
      const q = silkTtsQueryForMode(voiceMode);
      const res = await fetch(`/api/voice/silk-tts${q}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sample }),
      });
      if (!res.ok) throw new Error("preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPlaying(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setPlaying(false);
        setError("playback failed");
      };
      await audio.play();
    } catch {
      setPlaying(false);
      setError(voiceMode === "vapi" ? "Vapi voice — test via Talk" : "SILK preview unavailable");
    }
  }

  function stop() {
    setPlaying(false);
  }

  return (
    <div className="rounded-xl border border-[#E8E4DE] bg-white p-4">
      <p className="text-[10px] font-mono text-[#6B6560] uppercase tracking-widest mb-3">
        Voice preview
      </p>
      <p className="text-xs text-[#6B6560] mb-3 line-clamp-2">
        {text.trim() || "Add a first message to preview"}
      </p>
      <button
        type="button"
        disabled={disabled || playing || voiceMode === "vapi"}
        onClick={() => void preview()}
        className="inline-flex items-center gap-2 text-xs font-mono bg-[#2D4A3E] text-white px-4 py-2 rounded-lg disabled:opacity-40 hover:bg-[#243d32] transition-colors"
      >
        {playing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {playing ? "playing…" : "Preview first message"}
      </button>
      {playing && (
        <button type="button" onClick={stop} className="ml-2 text-xs text-[#6B6560] inline-flex items-center gap-1">
          <Square size={10} /> stop
        </button>
      )}
      {error && <p className="text-[10px] text-amber-700 mt-2">{error}</p>}
    </div>
  );
}