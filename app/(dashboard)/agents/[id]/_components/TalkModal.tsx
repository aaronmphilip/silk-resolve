"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  X, Mic, MicOff, PhoneOff, Loader2, Volume2, Download, CheckCircle2,
} from "lucide-react";
import { useWebVoiceCall, type WebVoiceCallState, type WebVoiceTranscript } from "@/lib/use-web-voice-call";
import type { WebVoiceMode } from "@/lib/silk-voice";

interface Props {
  agentId: string;
  agentName: string;
  voiceMode?: WebVoiceMode;
  onClose: () => void;
}

export default function TalkModal({ agentId, agentName, voiceMode = "silk-mulberry", onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    state,
    error,
    muted,
    duration,
    tension,
    transcript,
    startCall,
    endCall,
    reset,
    toggleMute,
  } = useWebVoiceCall(agentId, voiceMode);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  // Start call on mount
  useEffect(() => {
    void startCall();
  }, [startCall]);

  function closeModal() {
    void endCall();
    onClose();
  }

  // Download transcript as plain text
  const downloadTranscript = useCallback(() => {
    if (!transcript.length) return;
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const lines = [
      `Silk Resolve — Call Transcript`,
      `Agent: ${agentName}`,
      `Date: ${now}`,
      `Duration: ${fmt(duration)}`,
      `Turns: ${transcript.length}`,
      "",
      "─────────────────────────────────",
      "",
      ...transcript.map((m) => `[${m.role === "assistant" ? "AGENT" : "YOU"}]  ${m.text}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transcript-${agentName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.txt`;
    a.click();
  }, [transcript, agentName, duration]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const tensionColor =
    tension > 7 ? "bg-red-400" :
    tension > 5 ? "bg-amber-400" : "bg-emerald-400";

  const stateLabel: Record<WebVoiceCallState, string> = {
    idle:       "",
    connecting: "creating call...",
    joining:    "joining room...",
    active:     fmt(duration),
    ending:     "ending...",
    ended:      "call ended",
    error:      "error",
  };

  const isEnded = state === "ended" || state === "error";
  const isActive = state === "active";
  const isLoading = state === "connecting" || state === "joining";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div className="bg-[#0a0a0a] border-t sm:border border-[#f0ebe0]/20 w-full sm:max-w-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:rounded-none">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0ebe0]/10 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
              isActive
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                : isLoading
                ? "bg-amber-400 animate-pulse"
                : isEnded
                ? "bg-[#f0ebe0]/20"
                : "bg-[#f0ebe0]/20"
            }`} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#f0ebe0] truncate">{agentName}</p>
              <p className="text-[10px] font-mono text-[#f0ebe0]/30">{stateLabel[state]}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-[#f0ebe0]/30 hover:text-[#f0ebe0]/70 transition-colors flex-shrink-0 ml-3"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── PEEK tension bar (active only) ── */}
        {isActive && (
          <div className="px-5 py-2 border-b border-[#f0ebe0]/5 flex items-center gap-3 flex-shrink-0">
            <span className="text-[9px] font-mono text-[#f0ebe0]/30 uppercase tracking-widest w-20 flex-shrink-0">
              PEEK tension
            </span>
            <div className="flex-1 h-1 bg-[#f0ebe0]/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-700 rounded-full ${tensionColor}`}
                style={{ width: `${tension * 10}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-[#f0ebe0]/50 w-6 text-right flex-shrink-0">
              {tension.toFixed(1)}
            </span>
          </div>
        )}

        {/* ── Call ended summary bar ── */}
        {state === "ended" && transcript.length > 0 && (
          <div className="px-5 py-3 border-b border-[#f0ebe0]/10 flex items-center gap-4 flex-shrink-0 bg-[#f0ebe0]/[0.03]">
            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
            <div className="flex items-center gap-4 text-[10px] font-mono text-[#f0ebe0]/50 flex-1">
              <span>duration: {fmt(duration)}</span>
              <span>turns: {transcript.length}</span>
              <span>peak tension: {tension.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* ── Transcript area ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0">
          {transcript.length === 0 && !error && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Volume2 size={18} className="text-[#f0ebe0]/10 mx-auto mb-3" />
                <p className="text-[10px] font-mono text-[#f0ebe0]/20">
                  {isLoading ? "setting up call…" : "speak — transcript appears here"}
                </p>
                {isLoading && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-mono text-[#f0ebe0]/25">
                    <Loader2 size={10} className="animate-spin" />
                    {state === "connecting" ? "creating vapi session…" : "joining audio room…"}
                  </div>
                )}
              </div>
            </div>
          )}

          {transcript.map((msg, i) => (
            <TranscriptBubble key={i} msg={msg} />
          ))}

          {error && (
            <div className="border border-red-500/30 bg-red-500/5 px-4 py-3 mt-2">
              <p className="text-[10px] font-mono text-red-400 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer controls ── */}
        <div className="px-4 sm:px-5 py-4 border-t border-[#f0ebe0]/10 flex flex-wrap items-center justify-end gap-2 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#f0ebe0]/30 mr-auto">
              <Loader2 size={10} className="animate-spin" />
              {state === "connecting" ? "creating call…" : "joining room…"}
            </div>
          )}

          {/* Active call controls */}
          {isActive && (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className={`min-h-11 flex items-center gap-1.5 text-xs font-mono border px-4 py-2 transition-colors ${
                  muted
                    ? "border-amber-400/50 text-amber-400"
                    : "border-[#f0ebe0]/20 text-[#f0ebe0]/60 hover:border-[#f0ebe0]/40"
                }`}
              >
                {muted ? <MicOff size={11} /> : <Mic size={11} />}
                {muted ? "unmute" : "mute"}
              </button>
              <button
                type="button"
                onClick={() => void endCall()}
                className="min-h-11 flex items-center gap-1.5 text-xs font-mono border border-red-500/40 text-red-400 px-4 py-2 hover:bg-red-500/10 transition-colors"
              >
                <PhoneOff size={11} />
                end call
              </button>
            </>
          )}

          {/* Ending */}
          {state === "ending" && (
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#f0ebe0]/30">
              <Loader2 size={10} className="animate-spin" />
              ending…
            </div>
          )}

          {/* Ended / error */}
          {isEnded && (
            <>
              {transcript.length > 0 && (
                <button
                  type="button"
                  onClick={downloadTranscript}
                  className="min-h-11 flex items-center gap-1.5 text-xs font-mono border border-[#f0ebe0]/15 text-[#f0ebe0]/40 px-4 py-2 hover:border-[#f0ebe0]/30 hover:text-[#f0ebe0]/70 transition-colors"
                  title="Download transcript"
                >
                  <Download size={11} />
                  save transcript
                </button>
              )}
              {state === "ended" && (
                <button
                  type="button"
                  onClick={() => void reset()}
                  className="min-h-11 text-xs font-mono border border-[#f0ebe0]/20 px-5 py-2 text-[#f0ebe0]/60 hover:border-[#f0ebe0]/40 hover:text-[#f0ebe0] transition-colors"
                >
                  call again
                </button>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="min-h-11 text-xs font-mono border border-[#f0ebe0]/20 px-5 py-2 text-[#f0ebe0] hover:border-[#f0ebe0]/50 transition-colors"
              >
                close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TranscriptBubble({ msg }: { msg: WebVoiceTranscript }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] px-4 py-3 ${
          isUser
            ? "bg-[#f0ebe0] text-[#0a0a0a]"
            : "bg-[#f0ebe0]/[0.06] border border-[#f0ebe0]/10"
        }`}
      >
        <p
          className={`text-[9px] font-mono mb-1.5 ${
            isUser ? "text-[#0a0a0a]/40" : "text-[#f0ebe0]/30"
          }`}
        >
          {isUser ? "you" : "agent"}
        </p>
        <p className={`text-xs leading-relaxed ${isUser ? "text-[#0a0a0a]" : "text-[#f0ebe0]/90"}`}>
          {msg.text}
        </p>
      </div>
    </div>
  );
}
