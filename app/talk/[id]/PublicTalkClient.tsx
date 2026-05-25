"use client";

import { useEffect, useRef } from "react";
import { Loader2, Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { useWebVoiceCall, type WebVoiceCallState, type WebVoiceMode } from "@/lib/use-web-voice-call";

interface PublicTalkClientProps {
  agentId: string;
  agentName: string;
  voiceMode: WebVoiceMode;
}

const stateLabel: Record<WebVoiceCallState, string> = {
  idle: "ready",
  connecting: "creating call",
  joining: "joining",
  active: "live",
  ending: "ending",
  ended: "ended",
  error: "error",
};

const voiceLabel: Record<WebVoiceMode, string> = {
  silk: "SILK MUGA REST voice",
  "silk-stream": "SILK MUGA streaming voice",
  vapi: "Vapi native voice",
};

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function PublicTalkClient({ agentId, agentName, voiceMode }: PublicTalkClientProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const {
    state,
    error,
    muted,
    duration,
    tension,
    transcript,
    startCall,
    endCall,
    toggleMute,
    reset,
  } = useWebVoiceCall(agentId, voiceMode);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  const busy = state === "connecting" || state === "joining" || state === "ending";
  const active = state === "active";
  const canStart = state === "idle" || state === "ended" || state === "error";
  const tensionColor = tension > 7 ? "bg-red-400" : tension > 5 ? "bg-amber-400" : "bg-emerald-400";

  async function start() {
    if (state === "ended" || state === "error") await reset();
    await startCall();
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f0ebe0] flex flex-col">
      <header className="border-b border-[#f0ebe0]/10 px-4 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest">silk resolve</p>
          <h1 className="text-base font-bold truncate">{agentName}</h1>
          <p className="text-[10px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest mt-0.5">
            {voiceLabel[voiceMode]}
          </p>
        </div>
        <div className="flex items-center gap-2 border border-[#f0ebe0]/15 px-3 py-1.5">
          <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400" : busy ? "bg-amber-400 animate-pulse" : "bg-[#f0ebe0]/25"}`} />
          <span className="text-[10px] font-mono text-[#f0ebe0]/60">{active ? formatDuration(duration) : stateLabel[state]}</span>
        </div>
      </header>

      <section className="px-4 py-4 border-b border-[#f0ebe0]/10">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest w-20">tension</span>
          <div className="flex-1 h-1 bg-[#f0ebe0]/10 overflow-hidden">
            <div className={`h-full transition-all duration-500 ${tensionColor}`} style={{ width: `${Math.min(100, tension * 10)}%` }} />
          </div>
          <span className="text-[10px] font-mono text-[#f0ebe0]/50 w-7 text-right">{tension.toFixed(1)}</span>
        </div>
      </section>

      <section ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {transcript.length === 0 ? (
          <div className="h-full min-h-72 flex items-center justify-center text-center">
            <div>
              <Volume2 size={22} className="mx-auto mb-3 text-[#f0ebe0]/15" />
              <p className="text-xs font-mono text-[#f0ebe0]/30">
                {busy ? "setting up voice..." : active ? "listening..." : "start a web call"}
              </p>
            </div>
          </div>
        ) : (
          transcript.map((message, index) => (
            <div key={`${message.ts}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[86%] px-4 py-3 border ${
                message.role === "user"
                  ? "bg-[#f0ebe0] text-[#0a0a0a] border-[#f0ebe0]"
                  : "bg-[#f0ebe0]/5 text-[#f0ebe0] border-[#f0ebe0]/12"
              }`}>
                <p className={`text-[9px] font-mono mb-1 ${message.role === "user" ? "text-[#0a0a0a]/45" : "text-[#f0ebe0]/35"}`}>
                  {message.role === "user" ? "you" : "agent"}
                </p>
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
            </div>
          ))
        )}

        {error && (
          <div className="border border-red-400/30 px-4 py-3">
            <p className="text-xs font-mono text-red-300">{error}</p>
          </div>
        )}
      </section>

      <footer className="border-t border-[#f0ebe0]/10 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-end gap-2">
        {busy && (
          <div className="mr-auto flex items-center gap-2 text-xs font-mono text-[#f0ebe0]/35">
            <Loader2 size={12} className="animate-spin" />
            {stateLabel[state]}
          </div>
        )}

        {canStart && (
          <button
            type="button"
            onClick={() => void start()}
            className="min-h-12 flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#f0ebe0] text-[#0a0a0a] px-5 py-3 text-sm font-bold"
          >
            <Phone size={15} /> Start call
          </button>
        )}

        {active && (
          <>
            <button
              type="button"
              onClick={toggleMute}
              className={`min-h-12 inline-flex items-center justify-center gap-2 border px-4 py-3 text-sm font-mono ${
                muted ? "border-amber-400/50 text-amber-300" : "border-[#f0ebe0]/20 text-[#f0ebe0]/70"
              }`}
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              <span className="hidden sm:inline">{muted ? "unmute" : "mute"}</span>
            </button>
            <button
              type="button"
              onClick={() => void endCall()}
              className="min-h-12 inline-flex items-center justify-center gap-2 border border-red-400/40 text-red-300 px-4 py-3 text-sm font-mono"
            >
              <PhoneOff size={14} />
              <span className="hidden sm:inline">end</span>
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
