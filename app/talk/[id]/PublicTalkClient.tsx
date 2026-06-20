"use client";

import { useEffect, useRef } from "react";
import { Loader2, Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import { SPEECH_LANGUAGES } from "@/lib/speech-languages";
import { usesDirectVoicePipeline, voiceModeLabel } from "@/lib/silk-voice";
import { useDirectVoiceCall, type DirectVoiceCallState } from "@/lib/use-direct-voice-call";
import { useWebVoiceCall, type WebVoiceCallState, type WebVoiceMode } from "@/lib/use-web-voice-call";

interface PublicTalkClientProps {
  agentId: string;
  agentName: string;
  voiceMode: WebVoiceMode;
  autostart?: boolean;
}

interface TalkUiProps {
  agentName: string;
  voiceMode: WebVoiceMode;
  autostart: boolean;
  state: string;
  busy: boolean;
  active: boolean;
  canStart: boolean;
  error: string;
  muted: boolean;
  duration: number;
  tension: number;
  latencyMs: number | null;
  transcript: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  interim: { role: "user" | "assistant"; text: string } | null;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onResetAndStart: () => void;
  showLanguagePicker?: boolean;
  speechLanguage?: string;
  onSpeechLanguageChange?: (code: string) => void;
}

const vapiStateLabel: Record<WebVoiceCallState, string> = {
  idle: "ready",
  connecting: "creating call",
  joining: "joining",
  active: "live",
  ending: "ending",
  ended: "ended",
  error: "error",
};

const directStateLabel: Record<DirectVoiceCallState, string> = {
  idle: "ready",
  listening: "live",
  thinking: "thinking",
  speaking: "speaking",
  error: "error",
};

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function TalkUi({
  agentName,
  voiceMode,
  autostart,
  state,
  busy,
  active,
  canStart,
  error,
  muted,
  duration,
  tension,
  latencyMs,
  transcript,
  interim,
  onStart,
  onEnd,
  onToggleMute,
  onResetAndStart,
  showLanguagePicker = false,
  speechLanguage = "en-IN",
  onSpeechLanguageChange,
}: TalkUiProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const tensionColor = tension > 7 ? "bg-red-400" : tension > 5 ? "bg-amber-400" : "bg-emerald-400";

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, interim]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f0ebe0] flex flex-col">
      <header className="border-b border-[#f0ebe0]/10 px-4 py-4 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest">silk resolve</p>
          <h1 className="text-base font-bold truncate">{agentName}</h1>
          <p className="text-[10px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest mt-0.5">
            {voiceModeLabel(voiceMode)}
            {latencyMs !== null ? ` · ${latencyMs}ms` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 border border-[#f0ebe0]/15 px-3 py-1.5">
          <span className={`w-2 h-2 rounded-full ${active ? "bg-emerald-400" : busy ? "bg-amber-400 animate-pulse" : "bg-[#f0ebe0]/25"}`} />
          <span className="text-[10px] font-mono text-[#f0ebe0]/60">{active ? formatDuration(duration) : state}</span>
        </div>
      </header>

      <section className="px-4 py-4 border-b border-[#f0ebe0]/10 space-y-3">
        {showLanguagePicker && onSpeechLanguageChange && (
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest w-20">language</span>
            <select
              value={speechLanguage}
              onChange={(event) => onSpeechLanguageChange(event.target.value)}
              disabled={active}
              className="flex-1 bg-[#f0ebe0]/5 border border-[#f0ebe0]/15 px-3 py-2 text-xs font-mono text-[#f0ebe0]/80 disabled:opacity-50"
            >
              {SPEECH_LANGUAGES.map((option) => (
                <option key={option.code} value={option.code} className="bg-[#0a0a0a]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-[#f0ebe0]/35 uppercase tracking-widest w-20">tension</span>
          <div className="flex-1 h-1 bg-[#f0ebe0]/10 overflow-hidden">
            <div className={`h-full transition-all duration-500 ${tensionColor}`} style={{ width: `${Math.min(100, tension * 10)}%` }} />
          </div>
          <span className="text-[10px] font-mono text-[#f0ebe0]/50 w-7 text-right">{tension.toFixed(1)}</span>
        </div>
      </section>

      <section ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {transcript.length === 0 && !interim ? (
          <div className="h-full min-h-72 flex items-center justify-center text-center">
            <div>
              <Volume2 size={22} className="mx-auto mb-3 text-[#f0ebe0]/15" />
              <p className="text-xs font-mono text-[#f0ebe0]/30">
                {busy ? "starting..." : active ? "listening..." : autostart ? "starting..." : "start a web call"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {transcript.map((message, index) => (
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
            ))}

            {interim && interim.text && (
              <div className={`flex ${interim.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[86%] px-4 py-3 border border-dashed ${
                  interim.role === "user"
                    ? "bg-[#f0ebe0]/10 text-[#f0ebe0]/75 border-[#f0ebe0]/30"
                    : "bg-[#f0ebe0]/[0.03] text-[#f0ebe0]/55 border-[#f0ebe0]/12"
                }`}>
                  <p className={`text-[9px] font-mono mb-1 flex items-center gap-1.5 ${interim.role === "user" ? "text-[#f0ebe0]/45" : "text-[#f0ebe0]/30"}`}>
                    {interim.role === "user" ? "you" : "agent"}
                    <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  </p>
                  <p className="text-sm leading-relaxed italic">{interim.text}</p>
                </div>
              </div>
            )}
          </>
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
            {state}
          </div>
        )}

        {canStart && (
          <button
            type="button"
            onClick={() => void onResetAndStart()}
            className="min-h-12 flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#f0ebe0] text-[#0a0a0a] px-5 py-3 text-sm font-bold"
          >
            <Phone size={15} /> Start call
          </button>
        )}

        {active && (
          <>
            <button
              type="button"
              onClick={onToggleMute}
              className={`min-h-12 inline-flex items-center justify-center gap-2 border px-4 py-3 text-sm font-mono ${
                muted ? "border-amber-400/50 text-amber-300" : "border-[#f0ebe0]/20 text-[#f0ebe0]/70"
              }`}
            >
              {muted ? <MicOff size={14} /> : <Mic size={14} />}
              <span className="hidden sm:inline">{muted ? "unmute" : "mute"}</span>
            </button>
            <button
              type="button"
              onClick={() => void onEnd()}
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

function PublicTalkVapiClient({ agentId, agentName, voiceMode, autostart = false }: PublicTalkClientProps) {
  const autoStartAttemptedRef = useRef(false);
  const startCallRef = useRef<() => Promise<void>>(async () => {});
  const {
    state,
    error,
    muted,
    duration,
    tension,
    transcript,
    interim,
    startCall,
    endCall,
    toggleMute,
    reset,
  } = useWebVoiceCall(agentId, voiceMode);

  startCallRef.current = startCall;

  const tryAutoStart = () => {
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    void startCallRef.current();
  };

  useEffect(() => {
    if (!autostart) return;
    const timer = window.setTimeout(tryAutoStart, 0);
    return () => window.clearTimeout(timer);
  }, [autostart]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === "silk-resolve-autostart") tryAutoStart();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const busy = state === "connecting" || state === "joining" || state === "ending";
  const active = state === "active";
  const canStart = !autostart && (state === "idle" || state === "ended" || state === "error");

  async function resetAndStart() {
    if (state === "ended" || state === "error") await reset();
    await startCall();
  }

  return (
    <TalkUi
      agentName={agentName}
      voiceMode={voiceMode}
      autostart={autostart}
      state={vapiStateLabel[state]}
      busy={busy}
      active={active}
      canStart={canStart}
      error={error}
      muted={muted}
      duration={duration}
      tension={tension}
      latencyMs={null}
      transcript={transcript}
      interim={interim}
      onStart={startCall}
      onEnd={endCall}
      onToggleMute={toggleMute}
      onResetAndStart={resetAndStart}
    />
  );
}

function PublicTalkDirectClient({ agentId, agentName, voiceMode, autostart = false }: PublicTalkClientProps) {
  const autoStartAttemptedRef = useRef(false);
  const startCallRef = useRef<() => Promise<void>>(async () => {});
  const {
    state,
    error,
    muted,
    duration,
    tension,
    transcript,
    interim,
    latencyMs,
    startCall,
    endCall,
    reset,
    toggleMute,
    speechLanguage,
    changeSpeechLanguage,
  } = useDirectVoiceCall(agentId, voiceMode, { autostart: false, playGreeting: true });

  startCallRef.current = startCall;

  const tryAutoStart = () => {
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    void startCallRef.current();
  };

  useEffect(() => {
    if (!autostart) return;
    const timer = window.setTimeout(tryAutoStart, 0);
    return () => window.clearTimeout(timer);
  }, [autostart]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type === "silk-resolve-autostart") tryAutoStart();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const busy = state === "thinking" || state === "speaking";
  const active = state === "listening" || state === "thinking" || state === "speaking";
  const canStart = state === "idle" || state === "error";

  async function resetAndStart() {
    if (state === "error") await reset();
    await startCall();
  }

  return (
    <TalkUi
      agentName={agentName}
      voiceMode={voiceMode}
      autostart={autostart}
      state={directStateLabel[state]}
      busy={busy}
      active={active}
      canStart={canStart}
      error={error}
      muted={muted}
      duration={duration}
      tension={tension}
      latencyMs={latencyMs}
      transcript={transcript}
      interim={interim}
      onStart={startCall}
      onEnd={endCall}
      onToggleMute={toggleMute}
      onResetAndStart={resetAndStart}
      showLanguagePicker
      speechLanguage={speechLanguage}
      onSpeechLanguageChange={changeSpeechLanguage}
    />
  );
}

export default function PublicTalkClient(props: PublicTalkClientProps) {
  if (usesDirectVoicePipeline(props.voiceMode)) {
    return <PublicTalkDirectClient {...props} />;
  }
  return <PublicTalkVapiClient {...props} />;
}