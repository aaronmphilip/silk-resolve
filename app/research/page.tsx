"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── PEEK demo data ────────────────────────────────────────────────────────────

const PEEK_SCENARIOS = [
  {
    phrase: "I'm fine.",
    context: "After a failed transaction, 3rd callback this week",
    hiddenIntent: "Suppressed frustration — caller is not fine at all. Resignation signal.",
    tension: 8,
    arousal: 7,
    intent: "suppressed_anger",
    signals: ["Pitch drop at end", "Shorter sentence than usual", "Repeat caller"],
  },
  {
    phrase: "It's okay, no problem.",
    context: "Agent just apologised for a 45-minute wait",
    hiddenIntent: "Social politeness mask. Caller internally frustrated but avoiding conflict.",
    tension: 5,
    arousal: 4,
    intent: "polite_suppression",
    signals: ["Cadence too fast", "No pause before response", "Contrast with prior tone"],
  },
  {
    phrase: "Sure, whatever you say.",
    context: "After being offered a callback instead of resolution",
    hiddenIntent: "Defeated acceptance. High churn risk. Will not call back — will just leave.",
    tension: 9,
    arousal: 3,
    intent: "defeated_churn_risk",
    signals: ["Low arousal", "Passive agreement", "Zero question marks"],
  },
  {
    phrase: "This is ridiculous.",
    context: "First call, billing dispute",
    hiddenIntent: "Direct frustration. Wants acknowledgement, not solution yet.",
    tension: 7,
    arousal: 9,
    intent: "active_complaint",
    signals: ["High arousal", "Evaluative language", "Implicit demand for empathy"],
  },
];

// ── MESH demo data ────────────────────────────────────────────────────────────

const MESH_HISTORY = [
  { date: "Mar 2024", note: "Called about delivery delay. Agent resolved. Left satisfied.", delta: +12, outcome: "resolved" },
  { date: "May 2024", note: "Billing dispute. Escalated to human. Frustration noted.", delta: -18, outcome: "escalated" },
  { date: "Jul 2024", note: "Product query. Quick resolution. Mentioned anniversary trip.", delta: +8, outcome: "resolved" },
  { date: "Oct 2024", note: "Second billing issue. Agent caught emotional debt, preemptively apologised.", delta: +15, outcome: "resolved" },
  { date: "Jan 2025", note: "Proactive outreach — agent remembered anniversary. Customer delighted.", delta: +22, outcome: "resolved" },
];

// ── SILK prosody examples ─────────────────────────────────────────────────────

const SILK_EXAMPLES = [
  {
    tag: "warm",
    label: "<warm>",
    example: "I completely understand how frustrating that must be.",
    ssml: '<prosody pitch="+1st" volume="medium">I completely understand how frustrating that must be.</prosody>',
    description: "Raises pitch slightly, keeps volume medium. Used for empathetic acknowledgements.",
    color: "amber",
  },
  {
    tag: "apologetic_whisper",
    label: "<apologetic_whisper>",
    example: "I'm so sorry for the inconvenience we caused you today.",
    ssml: '<prosody rate="slow" pitch="-2st" volume="soft">I\'m so sorry for the inconvenience we caused you today.</prosody>',
    description: "Slows rate, drops pitch 2 semitones, reduces volume. Used for genuine apologies.",
    color: "blue",
  },
  {
    tag: "warm_closing",
    label: "<warm_closing>",
    example: "Thank you for your patience. Have a wonderful day.",
    ssml: '<prosody rate="slow" pitch="+1st">Thank you for your patience. Have a wonderful day.</prosody>',
    description: "Slows rate, raises pitch. Used for call endings and farewells.",
    color: "green",
  },
];

// ── Helper components ─────────────────────────────────────────────────────────

function TensionBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct > 70 ? "#ef4444" : pct > 40 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono opacity-40 w-6 text-right">{value}</span>
    </div>
  );
}

function DebtBar({ score }: { score: number }) {
  // -100 to +100 mapped to 0-100%
  const pct = ((score + 100) / 200) * 100;
  const color = score > 20 ? "#22c55e" : score > -20 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-black/10 rounded-full overflow-hidden relative">
        <div className="absolute left-1/2 w-px h-full bg-black/20" />
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.abs(score) / 2}%`,
            marginLeft: score >= 0 ? "50%" : `${50 - Math.abs(score) / 2}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{score > 0 ? `+${score}` : score}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [peekIdx, setPeekIdx] = useState(0);
  const [meshScore, setMeshScore] = useState(-18);
  const [meshStep, setMeshStep] = useState(1);
  const [silkIdx, setSilkIdx] = useState(0);
  const [peekAnimating, setPeekAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animate MESH debt score progression
  useEffect(() => {
    const scores = MESH_HISTORY.reduce<number[]>((acc, h, i) => {
      const running = MESH_HISTORY.slice(0, i + 1).reduce((s, h) => s + h.delta, 0);
      return [...acc, running];
    }, []);
    setMeshScore(scores[meshStep - 1] ?? 0);
  }, [meshStep]);

  // Auto-cycle PEEK
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPeekAnimating(true);
      setTimeout(() => {
        setPeekIdx((i) => (i + 1) % PEEK_SCENARIOS.length);
        setPeekAnimating(false);
      }, 300);
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const peek = PEEK_SCENARIOS[peekIdx];
  const silk = SILK_EXAMPLES[silkIdx];

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">

      {/* ── Nav ── */}
      <nav className="border-b border-black/10 px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">✳ silk resolve</span>
        </Link>
        <div className="flex items-center gap-6 text-xs font-mono opacity-50">
          <Link href="/research" className="opacity-100 border-b border-black pb-0.5">research</Link>
          <Link href="/dashboard" className="hover:opacity-100 transition-opacity">dashboard →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="px-8 pt-20 pb-16 max-w-4xl">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">/ research /</p>
        <h1 className="text-5xl font-bold tracking-tight leading-none mb-6">
          three systems.<br />one intelligent agent.
        </h1>
        <p className="text-base opacity-50 max-w-xl leading-relaxed">
          Silk Resolve is built on three research pillars — each solving a different layer of the human conversation problem.
          Together they enable voice AI that doesn't just respond, but understands.
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════
          1. PEEK
      ══════════════════════════════════════════════════════ */}
      <section className="border-t border-black/10 px-8 py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: explanation */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-mono border border-black/20 px-2 py-1 opacity-40">01</span>
              <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">/ codename: peek /</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">conversation.</h2>
            <p className="text-sm opacity-50 leading-relaxed mb-8 max-w-sm">
              Because the same words carry different meanings in different moments.
              PEEK reads what's beneath the surface — pitch, pacing, context history, and what
              the caller actually means versus what they say.
            </p>

            <div className="space-y-5">
              {[
                { label: "Hidden Intent Detection", desc: "Identifies suppressed frustration, polite deflection, churn signals, and resignation — things a transcript alone can never catch." },
                { label: "Tension Scoring (0–10)", desc: "Real-time emotional activation score updated every agent turn. Drives escalation logic and SILK prosody adjustments." },
                { label: "Arousal Mapping", desc: "Separates emotional intensity from emotional valence. A calm 'sure, whatever' is more dangerous than an angry 'this is ridiculous'." },
                { label: "Context Anchors", desc: "Cross-references current phrasing with caller history from MESH. Repeat callers are flagged automatically." },
              ].map((f) => (
                <div key={f.label} className="border-l-2 border-black/10 pl-4">
                  <p className="text-xs font-bold mb-0.5">{f.label}</p>
                  <p className="text-xs opacity-40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: live demo */}
          <div className="space-y-4">
            <div className={`border border-black/15 bg-white/60 backdrop-blur-sm p-6 transition-opacity duration-300 ${peekAnimating ? "opacity-0" : "opacity-100"}`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">live peek analysis</p>
                <div className="flex gap-1">
                  {PEEK_SCENARIOS.map((_, i) => (
                    <button key={i} onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setPeekIdx(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === peekIdx ? "bg-black" : "bg-black/20"}`} />
                  ))}
                </div>
              </div>

              {/* The phrase */}
              <div className="bg-black/[0.04] px-4 py-4 mb-5 border-l-4 border-black">
                <p className="text-sm font-mono">"{peek.phrase}"</p>
                <p className="text-[10px] opacity-30 mt-1.5 font-mono">{peek.context}</p>
              </div>

              {/* Scores */}
              <div className="space-y-3 mb-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-mono opacity-30">tension level</span>
                  </div>
                  <TensionBar value={peek.tension} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-mono opacity-30">arousal</span>
                  </div>
                  <TensionBar value={peek.arousal} />
                </div>
              </div>

              {/* Intent */}
              <div className="mb-4">
                <p className="text-[10px] font-mono opacity-30 mb-1.5">detected intent</p>
                <span className="text-[10px] font-mono border border-black/30 px-2 py-1 bg-black/[0.03]">
                  {peek.intent}
                </span>
              </div>

              {/* Hidden intent */}
              <div className="border border-amber-200 bg-amber-50/60 px-4 py-3 mb-4">
                <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest mb-1">hidden intent</p>
                <p className="text-xs font-mono leading-relaxed">{peek.hiddenIntent}</p>
              </div>

              {/* Signals */}
              <div>
                <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">signal sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {peek.signals.map((s) => (
                    <span key={s} className="text-[9px] font-mono border border-black/15 px-2 py-1 opacity-50">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-[10px] font-mono opacity-20 text-center">auto-cycling · click dots to select</p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2. MESH
      ══════════════════════════════════════════════════════ */}
      <section className="border-t border-black/10 px-8 py-20 bg-[#ede8dc]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: live demo */}
          <div className="order-2 lg:order-1">
            <div className="border border-black/15 bg-white/70 p-6 mb-3">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-0.5">mesh profile</p>
                  <p className="text-sm font-bold">Priya Sharma</p>
                  <p className="text-[10px] font-mono opacity-30">+91 98765 43210 · 5 interactions</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono opacity-30 mb-1">emotional debt</p>
                  <div className="w-32">
                    <DebtBar score={meshScore} />
                  </div>
                  <p className="text-[9px] font-mono opacity-20 mt-1">
                    {meshScore > 20 ? "positive" : meshScore > -20 ? "neutral" : "negative"}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-0 mb-5">
                {MESH_HISTORY.map((h, i) => (
                  <button key={i} onClick={() => setMeshStep(i + 1)}
                    className={`w-full text-left flex gap-4 py-2.5 border-l-2 pl-3 transition-all ${i < meshStep ? "opacity-100" : "opacity-20"} ${i + 1 === meshStep ? "border-black" : "border-black/15"}`}>
                    <span className="text-[9px] font-mono opacity-40 w-14 flex-shrink-0 pt-0.5">{h.date}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] leading-relaxed">{h.note}</p>
                    </div>
                    <span className={`text-[9px] font-mono flex-shrink-0 pt-0.5 ${h.delta > 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {h.delta > 0 ? `+${h.delta}` : h.delta}
                    </span>
                  </button>
                ))}
              </div>

              {/* Contextual anchor from last resolved call */}
              <div className="bg-black/[0.03] border border-black/10 px-4 py-3">
                <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">contextual anchors</p>
                <div className="space-y-1">
                  {[
                    meshStep >= 3 ? "Mentioned anniversary trip (Jul '24)" : null,
                    meshStep >= 5 ? "Responded positively to proactive outreach" : null,
                    meshStep >= 2 ? "Sensitive to billing topics — approach carefully" : null,
                  ].filter(Boolean).map((a) => (
                    <p key={a} className="text-[10px] font-mono opacity-50">· {a}</p>
                  ))}
                  {meshStep < 2 && <p className="text-[10px] font-mono opacity-20 italic">no anchors yet</p>}
                </div>
              </div>
            </div>

            <p className="text-[10px] font-mono opacity-20 text-center">click timeline entries to see memory build</p>
          </div>

          {/* Right: explanation */}
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-mono border border-black/20 px-2 py-1 opacity-40">02</span>
              <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">/ codename: mesh /</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">memory.</h2>
            <p className="text-sm opacity-50 leading-relaxed mb-8 max-w-sm">
              A relationship stack that remembers what matters and forgets what doesn't.
              Every interaction updates a living profile — emotional debt, context anchors,
              identity preferences — so the agent always knows who it's talking to.
            </p>

            <div className="space-y-5">
              {[
                { label: "Emotional Debt Score (−100 to +100)", desc: "Cumulative score tracking the relationship quality over time. Negative debt means the customer has been let down before — the agent knows to be extra careful." },
                { label: "Contextual Anchors", desc: "Specific details extracted from previous calls — personal events, sensitive topics, preferences. Injected into the AI context on every new call." },
                { label: "Identity Profile", desc: "How the customer wants to be spoken to — companion vibe, preferred address, language, formality level. Persists across all interactions." },
                { label: "Last Resolution Memory", desc: "Did the last call end well? Was it escalated? The agent opens the next call already aware, enabling proactive acknowledgement rather than starting from zero." },
              ].map((f) => (
                <div key={f.label} className="border-l-2 border-black/10 pl-4">
                  <p className="text-xs font-bold mb-0.5">{f.label}</p>
                  <p className="text-xs opacity-40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          3. SILK
      ══════════════════════════════════════════════════════ */}
      <section className="border-t border-black/10 px-8 py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: explanation */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] font-mono border border-black/20 px-2 py-1 opacity-40">03</span>
              <span className="text-[10px] font-mono opacity-30 uppercase tracking-widest">/ codename: silk /</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-4">voice.</h2>
            <p className="text-sm opacity-50 leading-relaxed mb-8 max-w-sm">
              A prosody tag system that tells the voice model how to speak — not just what to say.
              SILK tags wrap key phrases to control warmth, pacing, and emotional tone using
              Amazon Polly SSML, delivered through Twilio in real time.
            </p>

            <div className="space-y-5">
              {[
                { label: "Prosody Markup Language", desc: "Custom XML tags like <warm>, <apologetic_whisper>, <warm_closing> map directly to Polly SSML — no runtime latency added." },
                { label: "Indian English Neural Voice", desc: "Polly.Aditi — a neural Indian English voice with full SSML support, optimised for the Indian market and trained on natural speech patterns." },
                { label: "SILK Voice by Rumik", desc: "Set SILK_API_KEY and the platform automatically switches to Rumik's ultra-low-latency neural voice model. Falls back to Vapi PlayHT when not configured." },
                { label: "PEEK-driven Prosody", desc: "Tension level from PEEK directly influences which SILK tags the AI chooses. High tension → more apologetic_whisper. Resolution → warm_closing." },
              ].map((f) => (
                <div key={f.label} className="border-l-2 border-black/10 pl-4">
                  <p className="text-xs font-bold mb-0.5">{f.label}</p>
                  <p className="text-xs opacity-40 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: live demo */}
          <div>
            {/* Tag selector */}
            <div className="flex gap-2 mb-4">
              {SILK_EXAMPLES.map((s, i) => (
                <button key={s.tag} onClick={() => setSilkIdx(i)}
                  className={`flex-1 text-[10px] font-mono border px-3 py-2.5 transition-all text-left ${i === silkIdx ? "border-black bg-black text-[#f5f0e8]" : "border-black/20 hover:border-black/50"}`}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="border border-black/15 bg-white/70 p-6 space-y-5">
              {/* Example text */}
              <div>
                <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">spoken text</p>
                <div className="bg-black/[0.04] px-4 py-3 font-mono text-sm">
                  <span className="opacity-30">{`<${silk.tag}>`}</span>
                  <span>{silk.example}</span>
                  <span className="opacity-30">{`</${silk.tag}>`}</span>
                </div>
              </div>

              {/* SSML output */}
              <div>
                <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-2">polly ssml output</p>
                <div className="bg-black/[0.04] px-4 py-3 font-mono text-[10px] leading-relaxed text-emerald-800 break-all">
                  {silk.ssml}
                </div>
              </div>

              {/* Description */}
              <div className="border-l-2 border-black/10 pl-4">
                <p className="text-xs opacity-50 leading-relaxed">{silk.description}</p>
              </div>

              {/* Visual waveform mockup */}
              <div>
                <p className="text-[9px] font-mono opacity-20 uppercase tracking-widest mb-2">prosody shape</p>
                <div className="flex items-end gap-0.5 h-10 opacity-30">
                  {Array.from({ length: 40 }).map((_, i) => {
                    const base = silkIdx === 0 ? 0.6 : silkIdx === 1 ? 0.35 : 0.5;
                    const h = base + Math.sin(i * 0.8 + silkIdx) * 0.3 + Math.random() * 0.1;
                    return (
                      <div key={i} className="flex-1 bg-black rounded-sm transition-all duration-300"
                        style={{ height: `${Math.max(15, Math.min(100, h * 100))}%` }} />
                    );
                  })}
                </div>
                <p className="text-[8px] font-mono opacity-20 mt-1">
                  {silkIdx === 0 ? "↑ pitch raised, natural energy" :
                   silkIdx === 1 ? "↓ slower rate, softer volume, lower pitch" :
                   "↓ slower rate, ↑ warmer pitch"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Architecture summary ── */}
      <section className="border-t border-black/10 px-8 py-20 bg-[#1a1a1a] text-[#f5f0e8]">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">/ how it connects /</p>
          <h2 className="text-3xl font-bold mb-12">every call runs all three.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#f5f0e8]/10">
            {[
              {
                step: "01",
                name: "MESH activates",
                desc: "Caller phone number triggers MESH lookup. Emotional debt, contextual anchors, and identity profile are loaded into the AI context before the first word is spoken.",
                pill: "~12ms lookup",
              },
              {
                step: "02",
                name: "PEEK reads",
                desc: "Every customer speech turn is scored for tension, arousal, and hidden intent. The score updates the session and drives escalation logic and SILK tag selection.",
                pill: "per turn",
              },
              {
                step: "03",
                name: "SILK speaks",
                desc: "Agent response wraps key phrases in prosody tags. Tags are converted to Amazon Polly SSML. Caller hears a voice that matches the emotional moment — not a flat TTS robot.",
                pill: "real-time",
              },
            ].map((s, i) => (
              <div key={s.step} className={`px-6 py-8 ${i < 2 ? "border-r border-[#f5f0e8]/10" : ""}`}>
                <p className="text-[10px] font-mono opacity-20 mb-3">{s.step}</p>
                <p className="text-sm font-bold mb-3">{s.name}</p>
                <p className="text-xs opacity-40 leading-relaxed mb-4">{s.desc}</p>
                <span className="text-[9px] font-mono border border-[#f5f0e8]/20 px-2 py-1 opacity-40">{s.pill}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard"
              className="flex items-center justify-center gap-2 bg-[#f5f0e8] text-[#1a1a1a] px-6 py-3 text-sm font-medium hover:bg-[#f5f0e8]/90 transition-colors">
              build your first agent →
            </Link>
            <Link href="/dashboard/agents/new"
              className="flex items-center justify-center gap-2 border border-[#f5f0e8]/20 px-6 py-3 text-sm font-mono hover:border-[#f5f0e8]/50 transition-colors">
              quick start
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/10 px-8 py-6 flex items-center justify-between text-[10px] font-mono opacity-30">
        <span>✳ silk resolve · research</span>
        <div className="flex gap-6">
          <Link href="/dashboard">dashboard</Link>
          <Link href="/research">research</Link>
        </div>
      </footer>
    </div>
  );
}
