"use client";
/**
 * Test Call page — same Daily.co-direct approach as TalkModal.
 * No @vapi-ai/web npm package. Daily.co loaded from CDN.
 */
import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2, Volume2, AlertTriangle, ChevronDown } from "lucide-react";

type CallState = "idle" | "connecting" | "joining" | "active" | "ending" | "ended" | "error";
interface Agent { id: string; name: string; status: string; }
interface Transcript { role: "user" | "assistant"; text: string; }

function loadDailySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Daily) { resolve(); return; }
    const existing = document.getElementById("daily-sdk");
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.id = "daily-sdk";
    script.src = "https://unpkg.com/@daily-co/daily-js@0.85.0/dist/daily.js";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Daily.co SDK"));
    document.head.appendChild(script);
  });
}

export default function TestCallPage() {
  const [state, setState]         = useState<CallState>("idle");
  const [error, setError]         = useState("");
  const [muted, setMuted]         = useState(false);
  const [duration, setDuration]   = useState(0);
  const [tension, setTension]     = useState(0);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [agentId, setAgentId]     = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef  = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then((data: Agent[]) => {
        setAgents(data ?? []);
        if (data?.length > 0) setAgentId(data[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript]);

  async function startCall() {
    if (!agentId) { setError("Select an agent first"); return; }
    setState("connecting");
    setError("");
    setTranscript([]);
    setTension(0);
    setDuration(0);

    try {
      // Step 1: Create Vapi web call server-side
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

      // Step 2: Load Daily.co SDK from CDN
      setState("joining");
      await loadDailySDK();

      // Step 3: Create call object and join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Daily = (window as any).Daily;
      if (!Daily) throw new Error("Daily.co SDK failed to load");

      const call = Daily.createCallObject({ audioSource: true, videoSource: false });
      callRef.current = call;

      // Step 4: Wire events
      call.on("joined-meeting", () => {
        setState("active");
        const t0 = Date.now();
        timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - t0) / 1000)), 1000);
      });

      call.on("left-meeting", () => {
        setState("ended");
        if (timerRef.current) clearInterval(timerRef.current);
      });

      call.on("error", (e: { errorMsg?: string }) => {
        setError(e?.errorMsg ?? "Call error");
        setState("error");
        if (timerRef.current) clearInterval(timerRef.current);
      });

      call.on("app-message", (e: { data: string }) => {
        if (!e?.data) return;
        if (e.data === "listening") { setState("active"); return; }
        try {
          const msg = JSON.parse(e.data) as Record<string, unknown>;
          if (msg.type === "transcript" && msg.transcriptType === "final") {
            setTranscript(t => [...t, {
              role: msg.role as "user" | "assistant",
              text: msg.transcript as string,
            }]);
            if (msg.role === "user") setTension(t => Math.min(10, t + 0.4));
          }
          if (msg.type === "status-update" && msg.status === "ended") call.leave();
          if (msg.type === "hang") call.leave();
        } catch {}
      });

      // Step 5: Join
      await call.join({ url: roomUrl });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start call");
      setState("error");
    }
  }

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

  function reset() {
    setState("idle");
    setError("");
    callRef.current = null;
    setTranscript([]);
    setTension(0);
    setDuration(0);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const selectedAgent = agents.find(a => a.id === agentId);

  return (
    <div className="min-h-screen">
      <div className="border-b-2 border-black px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-1.5">/ test call /</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">browser test call.</h1>
        <p className="text-xs text-black/50 mt-1 font-mono">Full pipeline — no phone number needed.</p>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-4xl">

        {/* Agent selector */}
        {agents.length > 0 && (state === "idle" || state === "ended" || state === "error") && (
          <div className="mb-6">
            <label className="block text-xs font-semibold text-black mb-1.5">Agent to test</label>
            <div className="relative max-w-xs">
              <select
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                className="w-full border-2 border-black bg-white px-3 py-2.5 text-sm font-mono appearance-none focus:outline-none pr-8"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.status}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-black/50" />
            </div>
          </div>
        )}

        {agents.length === 0 && (
          <div className="mb-6 border-2 border-amber-400 bg-amber-50 px-4 py-3">
            <p className="text-xs font-mono text-amber-800">
              No agents found — <a href="/agents/new" className="underline">create one first</a>.
            </p>
          </div>
        )}

        <div className="flex flex-col sm:grid sm:grid-cols-3 gap-6">

          {/* Call panel */}
          <div className="sm:col-span-1">
            <div className="border-2 border-black p-6 text-center space-y-5">

              {/* Status dot + label */}
              <div className="space-y-2">
                <div className={`w-4 h-4 rounded-full mx-auto transition-all ${
                  state === "active"                               ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.5)]" :
                  state === "connecting" || state === "joining"   ? "bg-amber-400 animate-pulse" :
                  state === "error"                               ? "bg-red-500" : "bg-black/20"
                }`} />
                <p className="text-sm font-bold text-black uppercase tracking-widest">
                  {state === "idle"                             ? (selectedAgent?.name ?? "ready") :
                   state === "connecting"                       ? "creating call..." :
                   state === "joining"                          ? "joining room..." :
                   state === "active"                           ? fmt(duration) :
                   state === "ending"                           ? "ending..." :
                   state === "ended"                            ? "call ended" : "error"}
                </p>
              </div>

              {/* PEEK tension */}
              {state === "active" && (
                <div>
                  <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-2 font-semibold">peek tension</p>
                  <p className="text-3xl font-bold font-mono">{tension.toFixed(1)}</p>
                  <div className="w-full bg-black/10 h-2 mt-2 rounded-full overflow-hidden">
                    <div
                      className={`h-2 transition-all rounded-full ${tension > 7 ? "bg-red-500" : tension > 5 ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${tension * 10}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="border-2 border-red-400 bg-red-50 px-3 py-3 text-left">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-mono text-red-700 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="space-y-2">
                {(state === "idle" || state === "ended" || state === "error") && (
                  <button
                    onClick={state === "idle" ? startCall : reset}
                    disabled={!agentId}
                    className="w-full flex items-center justify-center gap-2 bg-black text-[#e8dece] py-3.5 text-sm font-bold hover:opacity-75 transition-opacity disabled:opacity-30"
                  >
                    <Phone size={14} />
                    {state === "idle" ? "start call" : "start new call"}
                  </button>
                )}
                {(state === "connecting" || state === "joining") && (
                  <button disabled className="w-full flex items-center justify-center gap-2 bg-black/20 py-3.5 text-sm font-mono text-black/50">
                    <Loader2 size={14} className="animate-spin" />
                    {state === "connecting" ? "creating call..." : "joining room..."}
                  </button>
                )}
                {state === "active" && (
                  <div className="space-y-2">
                    <button
                      onClick={toggleMute}
                      className={`w-full flex items-center justify-center gap-2 border-2 py-3 text-sm font-bold transition-colors ${
                        muted ? "border-amber-400 text-amber-700 bg-amber-50" : "border-black hover:bg-black/5"
                      }`}
                    >
                      {muted ? <MicOff size={14} /> : <Mic size={14} />}
                      {muted ? "unmute" : "mute"}
                    </button>
                    <button
                      onClick={endCall}
                      className="w-full flex items-center justify-center gap-2 border-2 border-red-500 text-red-600 py-3 text-sm font-bold hover:bg-red-50 transition-colors"
                    >
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
                  mic → Vapi STT → grok-4 → SILK / PlayHT → speaker
                </p>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="sm:col-span-2">
            <p className="text-[10px] font-mono text-black/50 uppercase tracking-widest mb-3 font-semibold">live transcript</p>
            <div ref={scrollRef} className="border-2 border-black min-h-72 max-h-[500px] overflow-y-auto">
              {transcript.length === 0 ? (
                <div className="flex items-center justify-center h-72">
                  <div className="text-center">
                    <Volume2 size={24} className="text-black/20 mx-auto mb-3" />
                    <p className="text-sm font-mono text-black/30">
                      {state === "connecting" || state === "joining"
                        ? "setting up call..."
                        : "transcript appears here during the call"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {transcript.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-3 ${
                        msg.role === "assistant" ? "bg-black/5 border-2 border-black/15" : "bg-black text-[#e8dece]"
                      }`}>
                        <p className={`text-[10px] font-mono font-semibold mb-1.5 ${msg.role === "assistant" ? "text-black/40" : "text-[#e8dece]/60"}`}>
                          {msg.role === "assistant" ? "agent" : "you"}
                        </p>
                        <p className={`text-sm leading-relaxed ${msg.role === "user" ? "text-[#e8dece]" : "text-black"}`}>
                          {msg.text}
                        </p>
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
                  { label: "PEEK",          desc: "Express frustration — tension score should rise" },
                  { label: "Voice",         desc: "SILK voice (Rumik) if key set, else Vapi PlayHT" },
                  { label: "Escalation",    desc: "Push hard — agent should offer to escalate" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="text-[10px] font-mono border-2 border-black/20 px-2 py-0.5 text-black/50 flex-shrink-0 mt-0.5">
                      {item.label}
                    </span>
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
