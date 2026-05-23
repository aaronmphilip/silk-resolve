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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import("@vapi-ai/web").then(({ default: Vapi }) => {
      (window as unknown as Record<string, unknown>).__VapiSDK = Vapi;
      setVapiReady(true);
    }).catch(() => setError("Failed to load Vapi SDK"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [metrics.transcript]);

  async function startCall() {
    setState("connecting");
    setError("");
    setMetrics({ tension: 0, turn: 0, duration: 0, transcript: [] });

    try {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (vapi as any).start({
        assistantOverrides: {
          serverUrl: `${appUrl}/api/voice/vapi-incoming`,
          clientMessages: ["transcript", "hang", "function-call", "speech-update"],
          serverMessages: ["end-of-call-report", "status-update", "transcript"],
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const v = vapi as any;

      v.on("call-start", () => {
        setState("active");
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
      <div className="border-b-2 border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-1.5">/ test call /</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">browser test call.</h1>
        <p className="text-xs text-black/50 mt-1 font-mono">
          Full pipeline — same as a real phone call. No phone number needed.
        </p>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-4xl">
        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-6">

          {/* Call panel */}
          <div className="sm:col-span-1">
            <div className="border-2 border-black p-6 text-center space-y-5">
              <div className="space-y-2">
                <div className={`w-4 h-4 rounded-full mx-auto transition-all ${
                  state === "active"     ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.5)]" :
                  state === "connecting" ? "bg-amber-400 animate-pulse" :
                  state === "error"      ? "bg-red-500" : "bg-black/20"
                }`} />
                <p className="text-sm font-bold text-black uppercase tracking-widest">
                  {state === "idle"       ? "ready" :
                   state === "connecting" ? "connecting..." :
                   state === "active"     ? fmt(metrics.duration) :
                   state === "ending"     ? "ending..." :
                   state === "ended"      ? "call ended" : "error"}
                </p>
              </div>

              {state === "active" && (
                <div>
                  <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-2 font-semibold">peek tension</p>
                  <p className="text-3xl font-bold font-mono text-black">{metrics.tension.toFixed(1)}</p>
                  <div className="w-full bg-black/10 h-2 mt-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 transition-all rounded-full ${metrics.tension > 7 ? "bg-red-500" : metrics.tension > 5 ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${metrics.tension * 10}%` }}
                    />
                  </div>
                </div>
              )}

              {state === "active" && (
                <div className="grid grid-cols-2 gap-3 border-t border-black/10 pt-4">
                  <div>
                    <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest font-semibold">turns</p>
                    <p className="text-2xl font-bold font-mono text-black">{metrics.turn}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest font-semibold">msgs</p>
                    <p className="text-2xl font-bold font-mono text-black">{metrics.transcript.length}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="border-2 border-red-400 bg-red-50 px-3 py-3 text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-mono text-red-700 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {(state === "idle" || state === "ended" || state === "error") && (
                  <button
                    onClick={state === "idle" ? startCall : reset}
                    disabled={!vapiReady}
                    className="w-full flex items-center justify-center gap-2 bg-black text-[#e8dece] py-3.5 text-sm font-bold hover:opacity-75 transition-opacity disabled:opacity-30"
                  >
                    {!vapiReady ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}
                    {!vapiReady ? "loading sdk..." : state === "idle" ? "start call" : "start new call"}
                  </button>
                )}
                {state === "connecting" && (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-black/20 py-3.5 text-sm font-mono text-black/50">
                    <Loader2 size={14} className="animate-spin" /> connecting...
                  </button>
                )}
                {state === "active" && (
                  <div className="space-y-2">
                    <button onClick={toggleMute}
                      className={`w-full flex items-center justify-center gap-2 border-2 py-3 text-sm font-bold transition-colors ${
                        muted ? "border-amber-400 text-amber-700 bg-amber-50" : "border-black hover:bg-black/5"
                      }`}>
                      {muted ? <MicOff size={14} /> : <Mic size={14} />}
                      {muted ? "unmute" : "mute"}
                    </button>
                    <button onClick={endCall}
                      className="w-full flex items-center justify-center gap-2 border-2 border-red-500 text-red-600 py-3 text-sm font-bold hover:bg-red-50 transition-colors">
                      <PhoneOff size={14} /> end call
                    </button>
                  </div>
                )}
                {state === "ending" && (
                  <button disabled className="w-full flex items-center justify-center gap-2 border-2 border-black/20 py-3 text-sm font-mono text-black/40">
                    <Loader2 size={14} className="animate-spin" /> ending...
                  </button>
                )}
              </div>

              <div className="border-t border-black/10 pt-4 text-left">
                <p className="text-[10px] font-mono text-black/40 leading-relaxed">
                  mic → Vapi STT → LLM → ElevenLabs/SILK → speaker
                </p>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-3 font-semibold">live transcript</p>
            <div ref={scrollRef} className="border-2 border-black min-h-72 max-h-[500px] overflow-y-auto">
              {metrics.transcript.length === 0 ? (
                <div className="flex items-center justify-center h-72">
                  <div className="text-center">
                    <Volume2 size={24} className="text-black/20 mx-auto mb-3" />
                    <p className="text-sm font-mono text-black/30">
                      {state === "connecting" ? "connecting to agent..." : "transcript appears here during the call"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {metrics.transcript.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 ${
                        msg.role === "assistant" ? "bg-black/5 border-2 border-black/15" : "bg-black text-[#e8dece]"
                      }`}>
                        <p className={`text-[10px] font-mono font-semibold mb-1.5 ${msg.role === "assistant" ? "text-black/40" : "text-[#e8dece]/60"}`}>
                          {msg.role === "assistant" ? "agent (SILK)" : "you"}
                        </p>
                        <p className={`text-sm leading-relaxed ${msg.role === "user" ? "text-[#e8dece]" : "text-black"}`}>{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {state === "idle" && (
              <div className="mt-4 border-2 border-black/15 bg-black/[0.03] px-5 py-4 space-y-3">
                <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest font-semibold">what to test</p>
                {[
                  { label: "First message", desc: "Agent speaks immediately when call connects" },
                  { label: "PEEK",          desc: "Express frustration — tension score should rise above 6" },
                  { label: "MESH",          desc: "Call again — agent should recall your history" },
                  { label: "Voice",         desc: "Neural TTS — ElevenLabs now, SILK when key is added" },
                  { label: "Escalation",    desc: "Say something that triggers your agent's escalation rule" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono border-2 border-black/20 px-2 py-0.5 text-black/50 flex-shrink-0 mt-0.5">{item.label}</span>
                    <p className="text-xs text-black/60">{item.desc}</p>
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
