"use client";
import { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, PhoneOff, Loader2, Volume2 } from "lucide-react";

type CallState = "idle" | "connecting" | "active" | "ending" | "ended" | "error";

interface Transcript { role: "user" | "assistant"; text: string; ts: number; }

interface Props {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

export default function TalkModal({ agentId, agentName, onClose }: Props) {
  const [state, setState] = useState<CallState>("connecting");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [tension, setTension] = useState(0);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const vapiRef = useRef<Record<string, unknown> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const tokenRes = await fetch("/api/voice/vapi-token");
        if (!tokenRes.ok) throw new Error((await tokenRes.json()).error ?? "Failed to get token");
        const { apiKey } = await tokenRes.json();

        const { default: Vapi } = await import("@vapi-ai/web");
        const vapi = new Vapi(apiKey) as unknown as Record<string, unknown>;
        if (!mounted) return;
        vapiRef.current = vapi;

        const appUrl = window.location.origin;
        const on = vapi.on as (event: string, cb: unknown) => void;
        const start = vapi.start as (cfg: unknown) => Promise<void>;

        on("call-start", () => {
          if (!mounted) return;
          setState("active");
          const t0 = Date.now();
          timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - t0) / 1000)), 1000);
        });

        on("call-end", () => {
          if (!mounted) return;
          setState("ended");
          if (timerRef.current) clearInterval(timerRef.current);
        });

        on("transcript", (msg: { role: string; transcript: string; transcriptType: string }) => {
          if (!mounted || msg.transcriptType !== "final") return;
          setTranscript(t => [...t, { role: msg.role as "user" | "assistant", text: msg.transcript, ts: Date.now() }]);
          // Simulate tension increase on user turns (real PEEK scores come back via vapi-events)
          if (msg.role === "user") setTension(t => Math.min(10, t + 0.3));
        });

        on("error", (err: Error) => {
          if (!mounted) return;
          setError(err?.message ?? "Call error");
          setState("error");
          if (timerRef.current) clearInterval(timerRef.current);
        });

        // Start the call — pass agentId in metadata so vapi-incoming routes correctly
        await start({
          assistantOverrides: {
            serverUrl:       `${appUrl}/api/voice/vapi-incoming`,
            clientMessages:  ["transcript", "hang", "speech-update"],
            serverMessages:  ["end-of-call-report", "status-update"],
            metadata:        { agentId },
          },
        });

      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to start call");
        setState("error");
      }
    }

    init();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      const stop = vapiRef.current?.stop as (() => void) | undefined;
      stop?.();
    };
  }, [agentId]);

  function endCall() {
    setState("ending");
    const stop = vapiRef.current?.stop as (() => void) | undefined;
    stop?.();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function toggleMute() {
    const setMutedFn = vapiRef.current?.setMuted as ((v: boolean) => void) | undefined;
    setMutedFn?.(!muted);
    setMuted(m => !m);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const tensionColor = tension > 7 ? "bg-red-400" : tension > 5 ? "bg-amber-400" : "bg-emerald-400";

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0a0a0a] border border-[#f0ebe0]/20 w-full max-w-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0ebe0]/10">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${state === "active" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : state === "connecting" ? "bg-amber-400 animate-pulse" : "bg-[#f0ebe0]/20"}`} />
            <div>
              <p className="text-sm font-bold text-[#f0ebe0]">{agentName}</p>
              <p className="text-[10px] font-mono opacity-30">
                {state === "connecting" ? "connecting..." : state === "active" ? fmt(duration) : state === "ending" ? "ending..." : state === "ended" ? "call ended" : state === "error" ? "error" : ""}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="opacity-30 hover:opacity-80 transition-opacity">
            <X size={14} />
          </button>
        </div>

        {/* PEEK bar */}
        {state === "active" && (
          <div className="px-5 py-2 border-b border-[#f0ebe0]/5 flex items-center gap-3">
            <span className="text-[9px] font-mono opacity-30 uppercase tracking-widest w-20">PEEK tension</span>
            <div className="flex-1 h-1 bg-[#f0ebe0]/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 rounded-full ${tensionColor}`} style={{ width: `${tension * 10}%` }} />
            </div>
            <span className="text-[10px] font-mono opacity-50 w-6 text-right">{tension.toFixed(1)}</span>
          </div>
        )}

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 min-h-64">
          {transcript.length === 0 && state !== "error" ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Volume2 size={18} className="opacity-10 mx-auto mb-2" />
                <p className="text-[10px] font-mono opacity-20">
                  {state === "connecting" ? "connecting to agent..." : "speak — transcript appears here"}
                </p>
              </div>
            </div>
          ) : (
            transcript.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 ${msg.role === "assistant" ? "bg-[#f0ebe0]/5 border border-[#f0ebe0]/10" : "bg-[#f0ebe0] text-[#0a0a0a]"}`}>
                  <p className={`text-[9px] font-mono mb-1 ${msg.role === "assistant" ? "opacity-30 text-[#f0ebe0]" : "opacity-40"}`}>
                    {msg.role === "assistant" ? "agent" : "you"}
                  </p>
                  <p className={`text-xs leading-relaxed ${msg.role === "user" ? "text-[#0a0a0a]" : "text-[#f0ebe0]"}`}>{msg.text}</p>
                </div>
              </div>
            ))
          )}
          {error && (
            <div className="border border-red-400/20 px-4 py-3">
              <p className="text-xs font-mono text-red-400">{error}</p>
              {error.includes("key") || error.includes("token") ? (
                <p className="text-[10px] font-mono text-red-400/60 mt-1">Add your Vapi API key in Admin → Settings</p>
              ) : null}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-[#f0ebe0]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {transcript.length > 0 && (
              <span className="text-[9px] font-mono opacity-20">{transcript.length} messages</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {state === "active" && (
              <>
                <button type="button" onClick={toggleMute}
                  className={`flex items-center gap-1.5 text-xs font-mono border px-3 py-2 transition-colors ${muted ? "border-amber-400/40 text-amber-400" : "border-[#f0ebe0]/20 text-[#f0ebe0]/60 hover:border-[#f0ebe0]/40"}`}>
                  {muted ? <MicOff size={11} /> : <Mic size={11} />}
                  {muted ? "unmute" : "mute"}
                </button>
                <button type="button" onClick={endCall}
                  className="flex items-center gap-1.5 text-xs font-mono border border-red-400/30 text-red-400 px-3 py-2 hover:bg-red-400/10 transition-colors">
                  <PhoneOff size={11} /> end call
                </button>
              </>
            )}
            {(state === "ended" || state === "error") && (
              <button type="button" onClick={onClose}
                className="text-xs font-mono border border-[#f0ebe0]/20 px-4 py-2 text-[#f0ebe0] hover:border-[#f0ebe0]/50 transition-colors">
                close
              </button>
            )}
            {state === "connecting" && (
              <div className="flex items-center gap-2 text-xs font-mono opacity-30">
                <Loader2 size={11} className="animate-spin" /> connecting...
              </div>
            )}
            {state === "ending" && (
              <div className="flex items-center gap-2 text-xs font-mono opacity-30">
                <Loader2 size={11} className="animate-spin" /> ending...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
