"use client";
import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2, AlertTriangle } from "lucide-react";

type CallState = "idle" | "connecting" | "active" | "ending" | "ended" | "error";

interface LiveMetrics {
  tension: number;
  turn: number;
  duration: number;
  transcript: { role: "user" | "assistant"; text: string }[];
}

export default function TestCallPage() {
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [metrics, setMetrics] = useState<LiveMetrics>({ tension: 0, turn: 0, duration: 0, transcript: [] });
  const [vapiReady, setVapiReady] = useState(false);
  const vapiRef = useRef<unknown>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamically import Vapi SDK (client-only)
  useEffect(() => {
    import("@vapi-ai/web").then(({ default: Vapi }) => {
      // We'll init Vapi on demand (need API key first)
      (window as unknown as Record<string, unknown>).__VapiSDK = Vapi;
      setVapiReady(true);
    }).catch(() => setError("Failed to load Vapi SDK"));
  }, []);

  async function startCall() {
    setState("connecting");
    setError("");
    setMetrics({ tension: 0, turn: 0, duration: 0, transcript: [] });

    try {
      // Get Vapi API key from our server
      const res = await fetch("/api/voice/vapi-token");
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to get Vapi token");
      }
      const { apiKey } = await res.json();

      const VapiSDK = (window as unknown as Record<string, unknown>).__VapiSDK as new (key: string) => unknown;
      const vapi = new VapiSDK(apiKey);
      vapiRef.current = vapi;

      const appUrl = window.location.origin;

      // Start web call — uses our assistant-request webhook just like a real phone call
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (vapi as any).start({
        assistantOverrides: {
          // Tell Vapi to ask our server for the full assistant config
          serverUrl: `${appUrl}/api/voice/vapi-incoming`,
          // Web call — no phone number needed
          clientMessages: ["transcript", "hang", "function-call", "speech-update"],
          serverMessages: ["end-of-call-report", "status-update", "transcript"],
        },
      });

      // Wire up events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = vapi as any;

      v.on("call-start", () => {
        setState("active");
        // Start duration timer
        const start = Date.now();
        timerRef.current = setInterval(() => {
          setMetrics(m => ({ ...m, duration: Math.floor((Date.now() - start) / 1000) }));
        }, 1000);
      });

      v.on("call-end", () => {
        setState("ended");
        if (timerRef.current) clearInterval(timerRef.current);
      });

      v.on("transcript", (msg: { role: string; transcript: string; transcriptType: string }) => {
        if (msg.transcriptType !== "final") return;
        setMetrics(m => ({
          ...m,
          turn: m.turn + (msg.role === "user" ? 1 : 0),
          transcript: [...m.transcript, { role: msg.role as "user" | "assistant", text: msg.transcript }],
        }));
      });

      v.on("error", (err: Error) => {
        setError(err.message ?? "Call error");
        setState("error");
        if (timerRef.current) clearInterval(timerRef.current);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
      setState("error");
    }
  }

  function endCall() {
    setState("ending");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vapiRef.current as any)?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function toggleMute() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vapiRef.current as any)?.setMuted(!muted);
    setMuted(m => !m);
  }

  function reset() {
    setState("idle");
    setError("");
    vapiRef.current = null;
    setMetrics({ tension: 0, turn: 0, duration: 0, transcript: [] });
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen">
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ test call /</p>
        <h1 className="text-3xl font-bold tracking-tight">browser test call.</h1>
        <p className="text-xs opacity-40 mt-1 font-mono">
          Calls your server directly — same pipeline as a real phone call. No phone number needed.
        </p>
      </div>

      <div className="px-8 py-8 max-w-3xl">
        <div className="grid grid-cols-3 gap-6">

          {/* Call panel */}
          <div className="col-span-1">
            <div className="border border-black p-6 text-center space-y-6">
              {/* Status indicator */}
              <div className="space-y-2">
                <div className={`w-3 h-3 rounded-full mx-auto transition-all ${
                  state === "active"     ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.5)]" :
                  state === "connecting" ? "bg-amber-400 animate-pulse" :
                  state === "error"      ? "bg-red-400" :
                  "bg-black/20"
                }`} />
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">
                  {state === "idle"       ? "ready" :
                   state === "connecting" ? "connecting..." :
                   state === "active"     ? fmt(metrics.duration) :
                   state === "ending"     ? "ending..." :
                   state === "ended"      ? "call ended" : "error"}
                </p>
              </div>

              {/* PEEK live tension */}
              {state === "active" && (
                <div>
                  <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-1">peek tension</p>
                  <p className="text-2xl font-bold font-mono">{metrics.tension.toFixed(1)}</p>
                  <div className="w-full bg-black/10 h-1 mt-2">
                    <div
                      className={`h-1 transition-all ${metrics.tension > 7 ? "bg-red-400" : metrics.tension > 5 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${metrics.tension * 10}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Turn count */}
              {state === "active" && (
                <div className="flex items-center justify-around text-center">
                  <div>
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">turns</p>
                    <p className="text-xl font-bold font-mono">{metrics.turn}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest">msgs</p>
                    <p className="text-xl font-bold font-mono">{metrics.transcript.length}</p>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="border border-red-400/30 px-3 py-2 text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] font-mono text-red-400 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                {(state === "idle" || state === "ended" || state === "error") && (
                  <button
                    onClick={state === "idle" ? startCall : reset}
                    disabled={!vapiReady}
                    className="w-full flex items-center justify-center gap-2 bg-black text-[#f0ebe0] py-3 text-xs font-mono hover:opacity-75 transition-opacity disabled:opacity-30"
                  >
                    {!vapiReady ? <Loader2 size={12} className="animate-spin" /> : <Phone size={12} />}
                    {!vapiReady ? "loading sdk..." : state === "idle" ? "start call" : "start new call"}
                  </button>
                )}

                {state === "connecting" && (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-black/20 py-3 text-xs font-mono opacity-50">
                    <Loader2 size={12} className="animate-spin" /> connecting...
                  </button>
                )}

                {state === "active" && (
                  <div className="space-y-2">
                    <button
                      onClick={toggleMute}
                      className={`w-full flex items-center justify-center gap-2 border py-3 text-xs font-mono transition-colors ${muted ? "border-amber-400/40 text-amber-400" : "border-black hover:bg-black/5"}`}
                    >
                      {muted ? <MicOff size={12} /> : <Mic size={12} />}
                      {muted ? "unmute" : "mute"}
                    </button>
                    <button
                      onClick={endCall}
                      className="w-full flex items-center justify-center gap-2 border border-red-400/40 text-red-400 py-3 text-xs font-mono hover:bg-red-400/5 transition-colors"
                    >
                      <PhoneOff size={12} /> end call
                    </button>
                  </div>
                )}

                {state === "ending" && (
                  <button disabled className="w-full flex items-center justify-center gap-2 border border-black/20 py-3 text-xs font-mono opacity-40">
                    <Loader2 size={12} className="animate-spin" /> ending...
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="border-t border-black/10 pt-4 text-left space-y-1">
                <p className="text-[9px] font-mono opacity-25 leading-relaxed">
                  Pipeline: browser mic → Vapi STT → your LLM → ElevenLabs TTS → browser speaker
                </p>
                <p className="text-[9px] font-mono opacity-20 leading-relaxed">
                  PEEK + MESH active on every turn. Same as a real call.
                </p>
              </div>
            </div>
          </div>

          {/* Live transcript */}
          <div className="col-span-2">
            <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">live transcript</p>
            <div className="border border-black min-h-80 max-h-[600px] overflow-y-auto">
              {metrics.transcript.length === 0 ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <Volume2 size={20} className="opacity-10 mx-auto mb-2" />
                    <p className="text-xs font-mono opacity-20">transcript appears here during the call</p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {metrics.transcript.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 ${msg.role === "assistant" ? "bg-black/5 border border-black/10" : "bg-black text-[#f0ebe0]"}`}>
                        <p className={`text-[9px] font-mono mb-1 ${msg.role === "assistant" ? "opacity-30" : "opacity-50"}`}>
                          {msg.role === "assistant" ? "agent (SILK)" : "you"}
                        </p>
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What to listen for */}
            {state === "idle" && (
              <div className="mt-4 border border-black/10 px-5 py-4 space-y-2">
                <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest mb-3">what to listen for</p>
                {[
                  { label: "First message", desc: "Agent speaks immediately when call connects" },
                  { label: "PEEK", desc: "Express frustration — tension score should rise above 6" },
                  { label: "MESH", desc: "Call again — agent should remember you (same phone/browser)" },
                  { label: "ElevenLabs voice", desc: "Clear neural TTS, not robotic. SILK tags stripped for now." },
                  { label: "Tool calls", desc: "Say something that triggers an escalation rule" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-[9px] font-mono border border-black/20 px-1.5 py-0.5 opacity-40 flex-shrink-0 mt-0.5">{item.label}</span>
                    <p className="text-[10px] opacity-40">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
