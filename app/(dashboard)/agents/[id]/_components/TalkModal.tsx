"use client";
/**
 * TalkModal — browser voice call with a Silk Resolve agent.
 *
 * Architecture (no @vapi-ai/web npm package — avoids all bundling issues):
 *   1. POST /api/voice/web-call  →  server creates Vapi web call with public web key
 *                                    returns Daily.co roomUrl
 *   2. Load @daily-co/daily-js from CDN via <script> injection
 *   3. Join the Daily.co room directly
 *   4. Vapi sends app-messages through Daily.co's data channel:
 *       - e.data === "listening"  → call is live
 *       - JSON { type:"transcript", ... } → transcript line
 *       - JSON { type:"status-update", status:"ended" } → call ended
 */
import { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, PhoneOff, Loader2, Volume2 } from "lucide-react";

type CallState = "idle" | "connecting" | "joining" | "active" | "ending" | "ended" | "error";
interface Transcript { role: "user" | "assistant"; text: string; ts: number; }

interface Props {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

// Inject @daily-co/daily-js from CDN once per page load
function loadDailySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Daily) { resolve(); return; }
    const existing = document.getElementById("daily-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "daily-sdk";
    script.src = "https://unpkg.com/@daily-co/daily-js@0.85.0/dist/daily.js";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Daily.co SDK from CDN"));
    document.head.appendChild(script);
  });
}

export default function TalkModal({ agentId, agentName, onClose }: Props) {
  const [state, setState]       = useState<CallState>("connecting");
  const [error, setError]       = useState("");
  const [muted, setMuted]       = useState(false);
  const [duration, setDuration] = useState(0);
  const [tension, setTension]   = useState(0);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef  = useRef<any>(null);
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
        // ── Step 1: Create Vapi web call on our server ──────────────────────
        setState("connecting");
        const callRes = await fetch("/api/voice/web-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
        if (!callRes.ok) {
          const d = await callRes.json();
          throw new Error(d.error ?? "Failed to create call");
        }
        const { roomUrl } = await callRes.json() as { callId: string; roomUrl: string };

        if (!mounted) return;

        // ── Step 2: Load Daily.co SDK from CDN ──────────────────────────────
        setState("joining");
        await loadDailySDK();
        if (!mounted) return;

        // ── Step 3: Create Daily call object and join room ──────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Daily = (window as any).Daily;
        if (!Daily) throw new Error("Daily.co SDK failed to load");

        const call = Daily.createCallObject({
          audioSource: true,
          videoSource: false,
          dailyConfig: { experimentalChromeVideoMuteLightOff: true },
        });
        callRef.current = call;

        // ── Step 4: Wire up events ───────────────────────────────────────────
        call.on("joined-meeting", () => {
          if (!mounted) return;
          setState("active");
          const t0 = Date.now();
          timerRef.current = setInterval(
            () => setDuration(Math.floor((Date.now() - t0) / 1000)),
            1000
          );
        });

        call.on("left-meeting", () => {
          if (!mounted) return;
          setState("ended");
          if (timerRef.current) clearInterval(timerRef.current);
        });

        call.on("error", (e: { errorMsg?: string }) => {
          if (!mounted) return;
          setError(e?.errorMsg ?? "Call error");
          setState("error");
          if (timerRef.current) clearInterval(timerRef.current);
        });

        // Vapi sends transcript + status-update as Daily app-messages
        call.on("app-message", (e: { data: string }) => {
          if (!mounted || !e?.data) return;

          // "listening" = Vapi agent is ready and the call is live
          if (e.data === "listening") {
            setState("active");
            return;
          }

          try {
            const msg = JSON.parse(e.data) as Record<string, unknown>;

            // Transcript lines
            if (msg.type === "transcript" && msg.transcriptType === "final") {
              setTranscript(t => [...t, {
                role: msg.role as "user" | "assistant",
                text: msg.transcript as string,
                ts: Date.now(),
              }]);
              if (msg.role === "user") setTension(t => Math.min(10, t + 0.4));
            }

            // Call ended by Vapi
            if (msg.type === "status-update" && msg.status === "ended") {
              call.leave();
            }

            // Hang event
            if (msg.type === "hang") {
              call.leave();
            }
          } catch {
            // non-JSON app messages — ignore
          }
        });

        // ── Step 5: Join the room ────────────────────────────────────────────
        await call.join({ url: roomUrl });

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
      callRef.current?.leave().catch(() => {}).finally(() => {
        callRef.current?.destroy().catch(() => {});
      });
    };
  }, [agentId]);

  async function endCall() {
    setState("ending");
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await callRef.current?.leave();
      await callRef.current?.destroy();
    } catch {}
    setState("ended");
  }

  function toggleMute() {
    if (!callRef.current) return;
    const newMuted = !muted;
    callRef.current.setLocalAudio(!newMuted);
    setMuted(newMuted);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const tensionColor = tension > 7 ? "bg-red-400" : tension > 5 ? "bg-amber-400" : "bg-emerald-400";

  const stateLabel: Record<CallState, string> = {
    idle:       "",
    connecting: "creating call...",
    joining:    "joining room...",
    active:     fmt(duration),
    ending:     "ending...",
    ended:      "call ended",
    error:      "error",
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0a0a0a] border-t sm:border border-[#f0ebe0]/20 w-full sm:max-w-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0ebe0]/10">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              state === "active"     ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" :
              state === "connecting" || state === "joining" ? "bg-amber-400 animate-pulse" :
              "bg-[#f0ebe0]/20"
            }`} />
            <div>
              <p className="text-sm font-bold text-[#f0ebe0]">{agentName}</p>
              <p className="text-[10px] font-mono text-[#f0ebe0]/30">{stateLabel[state]}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#f0ebe0]/30 hover:text-[#f0ebe0]/80 transition-opacity">
            <X size={14} />
          </button>
        </div>

        {/* PEEK tension bar */}
        {state === "active" && (
          <div className="px-5 py-2 border-b border-[#f0ebe0]/5 flex items-center gap-3">
            <span className="text-[9px] font-mono text-[#f0ebe0]/30 uppercase tracking-widest w-20">PEEK tension</span>
            <div className="flex-1 h-1 bg-[#f0ebe0]/10 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 rounded-full ${tensionColor}`} style={{ width: `${tension * 10}%` }} />
            </div>
            <span className="text-[10px] font-mono text-[#f0ebe0]/50 w-6 text-right">{tension.toFixed(1)}</span>
          </div>
        )}

        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0 sm:min-h-64">
          {transcript.length === 0 && state !== "error" ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Volume2 size={18} className="text-[#f0ebe0]/10 mx-auto mb-2" />
                <p className="text-[10px] font-mono text-[#f0ebe0]/20">
                  {state === "connecting" || state === "joining"
                    ? "setting up call..."
                    : "speak — transcript appears here"}
                </p>
              </div>
            </div>
          ) : (
            transcript.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2.5 ${
                  msg.role === "assistant"
                    ? "bg-[#f0ebe0]/5 border border-[#f0ebe0]/10"
                    : "bg-[#f0ebe0] text-[#0a0a0a]"
                }`}>
                  <p className={`text-[9px] font-mono mb-1 ${msg.role === "assistant" ? "text-[#f0ebe0]/30" : "text-[#0a0a0a]/40"}`}>
                    {msg.role === "assistant" ? "agent" : "you"}
                  </p>
                  <p className={`text-xs leading-relaxed ${msg.role === "user" ? "text-[#0a0a0a]" : "text-[#f0ebe0]"}`}>
                    {msg.text}
                  </p>
                </div>
              </div>
            ))
          )}
          {error && (
            <div className="border border-red-400/20 px-4 py-3">
              <p className="text-xs font-mono text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 sm:px-5 py-4 border-t border-[#f0ebe0]/10 flex flex-wrap items-center justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {(state === "connecting" || state === "joining") && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#f0ebe0]/30">
              <Loader2 size={11} className="animate-spin" />
              {state === "connecting" ? "creating call..." : "joining room..."}
            </div>
          )}

          {state === "active" && (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className={`min-h-11 flex items-center gap-1.5 text-xs font-mono border px-4 sm:px-3 py-2 transition-colors ${
                  muted
                    ? "border-amber-400/40 text-amber-400"
                    : "border-[#f0ebe0]/20 text-[#f0ebe0]/60 hover:border-[#f0ebe0]/40"
                }`}
              >
                {muted ? <MicOff size={11} /> : <Mic size={11} />}
                {muted ? "unmute" : "mute"}
              </button>
              <button
                type="button"
                onClick={endCall}
                className="min-h-11 flex items-center gap-1.5 text-xs font-mono border border-red-400/30 text-red-400 px-4 sm:px-3 py-2 hover:bg-red-400/10 transition-colors"
              >
                <PhoneOff size={11} /> end call
              </button>
            </>
          )}

          {state === "ending" && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#f0ebe0]/30">
              <Loader2 size={11} className="animate-spin" /> ending...
            </div>
          )}

          {(state === "ended" || state === "error") && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 text-xs font-mono border border-[#f0ebe0]/20 px-5 py-2 text-[#f0ebe0] hover:border-[#f0ebe0]/50 transition-colors"
            >
              close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
