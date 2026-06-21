"use client";

import { useEffect, useRef } from "react";
import { Loader2, Mic, MicOff, PhoneCall, PhoneOff, Volume2 } from "lucide-react";

import { useWebVoiceCall, type WebVoiceCallState } from "@/lib/use-web-voice-call";
import type { WebVoiceMode } from "@/lib/silk-voice";
import { agentLanguageLabelToBcp47, DEFAULT_SPEECH_LANGUAGE } from "@/lib/speech-languages";
import { voiceModeLabel } from "@/lib/silk-voice";

const stateLabel: Record<WebVoiceCallState, string> = {
  idle: "Ready",
  connecting: "Connecting…",
  joining: "Joining…",
  active: "Live",
  ending: "Ending…",
  ended: "Ended",
  error: "Error",
};

export default function StudioTestPanel({
  agentId,
  agentName,
  voiceMode,
  languageLabel,
  compact,
}: {
  agentId: string;
  agentName: string;
  voiceMode: WebVoiceMode;
  languageLabel?: string;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechLanguage = languageLabel
    ? agentLanguageLabelToBcp47(languageLabel)
    : DEFAULT_SPEECH_LANGUAGE;

  const {
    state,
    error,
    muted,
    duration,
    tension,
    latencyMs,
    transcript,
    interim,
    startCall,
    endCall,
    toggleMute,
    reset,
  } = useWebVoiceCall(agentId, voiceMode, speechLanguage);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, interim]);

  const busy = state === "connecting" || state === "joining" || state === "ending";
  const active = state === "active";
  const mins = Math.floor(duration / 60);
  const secs = String(duration % 60).padStart(2, "0");

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "min-h-[28rem]"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-[#1A1814]">Test agent</p>
          <p className="text-[10px] font-mono text-[#6B6560]">
            {voiceModeLabel(voiceMode)} · {stateLabel[state]}
          </p>
        </div>
        {latencyMs != null && (
          <span className="text-[10px] font-mono text-[#2D4A3E] tabular-nums">{latencyMs}ms</span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-[10rem] max-h-64 overflow-y-auto rounded-xl border border-[#E8E4DE] bg-white p-3 space-y-2 mb-3"
      >
        {transcript.length === 0 && !interim && (
          <p className="text-xs text-[#6B6560] text-center py-8">Start a call to see the live transcript</p>
        )}
        {transcript.map((line, i) => (
          <div
            key={`${line.ts}-${i}`}
            className={`text-xs rounded-lg px-3 py-2 ${
              line.role === "user" ? "bg-[#F7F5F2] text-[#1A1814]" : "bg-[#2D4A3E]/8 text-[#1A1814]"
            }`}
          >
            <span className="text-[9px] font-mono text-[#6B6560] uppercase mr-2">
              {line.role}
            </span>
            {line.text}
          </div>
        ))}
        {interim && (
          <div className="text-xs rounded-lg px-3 py-2 border border-dashed border-[#C4A882] text-[#6B6560] italic">
            {interim.text}…
          </div>
        )}
      </div>

      {error && (
        <p className="text-[10px] font-mono text-red-600 mb-2 px-1">{error}</p>
      )}

      <div className="flex items-center gap-2">
        {!active && !busy && (
          <button
            type="button"
            onClick={() => void (state === "ended" || state === "error" ? reset().then(startCall) : startCall())}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#2D4A3E] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#243d32]"
          >
            <PhoneCall size={16} />
            Talk to {agentName || "agent"}
          </button>
        )}
        {(active || busy) && (
          <>
            <span className="text-xs font-mono text-[#6B6560] tabular-nums w-12">{mins}:{secs}</span>
            {tension > 0 && (
              <span className="text-[10px] font-mono text-[#C4A882]">tension {tension.toFixed(1)}</span>
            )}
            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-lg border border-[#E8E4DE] hover:bg-[#FAF9F7]"
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              type="button"
              onClick={() => void endCall()}
              disabled={busy}
              className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <PhoneOff size={16} />}
            </button>
          </>
        )}
        {state === "active" && (
          <Volume2 size={14} className="text-emerald-600 ml-auto" />
        )}
      </div>
    </div>
  );
}