import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SilkTerminal from "@/components/marketing/SilkTerminal";

/* ─── Waveform SVG (mirrors Rumik's voice card visual) ─────────────── */
function Waveform() {
  const bars = [2,4,8,14,22,30,36,40,38,32,26,20,16,12,8,6,10,18,28,38,44,40,34,26,18,12,8,4,6,10,16,24,32,38,42,36,28,18,10,6,4];
  const W = 320, H = 56, cx = W / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs" fill="currentColor">
      {bars.map((h, i) => {
        const x = (i / (bars.length - 1)) * W;
        const barW = 5;
        return (
          <rect
            key={i}
            x={x - barW / 2}
            y={(H - h) / 2}
            width={barW}
            height={h}
            rx={2.5}
          />
        );
      })}
      {/* Arrow heads */}
      <path d={`M${cx - 28} ${H / 2} L${cx - 18} ${H / 2 - 5} L${cx - 18} ${H / 2 + 5}Z`} />
      <path d={`M${cx + 28} ${H / 2} L${cx + 18} ${H / 2 - 5} L${cx + 18} ${H / 2 + 5}Z`} />
    </svg>
  );
}

const PILLARS = [
  {
    num: "1.",
    name: "voice",
    codename: "/ codename: silk/",
    desc: "emotional reactor. injects mid-sentence prosody tags — <whisper>, <warm>, <apologetic> — matched to user tension level in real-time.",
    visual: "waveform",
  },
  {
    num: "2.",
    name: "memory",
    codename: "/ codename: mesh/",
    desc: "relationship vault. recalls emotional debt from past interactions to calibrate today's greeting and escalation threshold.",
    visual: "mesh",
  },
  {
    num: "3.",
    name: "context",
    codename: "/ codename: peek/",
    desc: 'intent radar. identifies when "theek hai" means frustrated. triggers high-priority workflows before explicit complaint.',
    visual: "peek",
  },
];

const ENTERPRISE_FEATURES = [
  "multi-tenant · rls-isolated per client",
  "hinglish, hindi, tamil, telugu + 8 more",
  "connects to your crm, database, or rest api",
  "deploy in 48 hours · no infrastructure overhead",
  "full call analysis · empathy heatmaps · a/b testing",
  "soc 2 ready · data never leaves your region",
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#e8dece] text-[#111111]"
      style={{
        backgroundImage: "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      {/* Binary watermark — same as dashboard */}
      <div className="fixed top-3 right-4 pointer-events-none select-none opacity-[0.07] font-mono text-[10px] leading-relaxed text-right z-0">
        <div>11111111</div><div>111011 1</div><div>000 10</div><div>11111</div><div>0001111</div><div>0000000</div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 px-8 py-4 flex items-center justify-between bg-[#e8dece]/90 backdrop-blur-sm border-b border-black/10">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">✳</span>
          <span className="font-bold text-base tracking-tight">silk resolve</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["research", "community", "careers", "api"].map((l) => (
            <a key={l} href="#" className="text-sm text-black/50 hover:text-black transition-colors">
              {l}
            </a>
          ))}
        </div>

        <Link
          href="/register"
          className="flex items-center gap-2 bg-black text-[#e8dece] px-5 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
        >
          get access <ArrowUpRight size={13} />
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="px-8 pt-20 pb-8 max-w-5xl mx-auto">
        <p className="text-xs font-mono text-black/30 uppercase tracking-widest mb-6">
          / silk resolve · level 3 autonomous voice ai /
        </p>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
          resolution that<br />
          <span className="text-black/30">remembers.</span>
        </h1>

        <p className="text-base text-black/50 leading-relaxed max-w-xl mb-10">
          not just what happened — how it made them feel.
          silk carries emotional memory into every call, detects hidden intent before the complaint,
          and speaks with prosody that actually lands.
        </p>

        <div className="flex items-center gap-4 flex-wrap mb-4">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-black text-[#e8dece] px-7 py-3 rounded-full text-sm font-semibold hover:bg-black/80 transition-colors"
          >
            get early access
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 border border-black/20 px-7 py-3 rounded-full text-sm text-black/50 hover:border-black/50 hover:text-black transition-colors"
          >
            sign in →
          </Link>
        </div>
      </section>

      {/* ── "this requires mastering 3 essentials" ─────────── */}
      <section className="px-8 pb-0 max-w-5xl mx-auto">
        <div className="border border-black/15">

          <div className="px-8 py-6 border-b border-black/10">
            <h2 className="text-2xl font-bold">this requires mastering 3 essentials:</h2>
          </div>

          {/* Pillar 1 — Voice / Silk */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-black/10">
            <div className="px-8 py-10 flex flex-col justify-center">
              <p className="text-2xl font-bold mb-1">{PILLARS[0].num} {PILLARS[0].name}</p>
              <p className="text-xs font-mono text-black/30 mb-5">{PILLARS[0].codename}</p>
              <p className="text-sm text-black/55 leading-relaxed">{PILLARS[0].desc}</p>
            </div>
            <div className="border-l border-black/10 px-8 py-10 flex flex-col items-center justify-center gap-6">
              <div className="text-black/70">
                <Waveform />
              </div>
              <Link
                href="/register"
                className="border border-black/20 px-7 py-2 rounded-full text-sm text-black/60 hover:border-black hover:text-black transition-colors"
              >
                call now
              </Link>
            </div>
          </div>

          {/* Pillar 2 — Memory / Mesh */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-black/10">
            <div className="px-8 py-10 flex flex-col justify-center">
              <p className="text-2xl font-bold mb-1">{PILLARS[1].num} {PILLARS[1].name}</p>
              <p className="text-xs font-mono text-black/30 mb-5">{PILLARS[1].codename}</p>
              <p className="text-sm text-black/55 leading-relaxed">{PILLARS[1].desc}</p>
            </div>
            <div className="border-l border-black/10 px-8 py-10 flex flex-col items-start justify-center gap-3 font-mono text-xs">
              {[
                { label: "emotional debt", val: "-42", note: "negative" },
                { label: "anchors",        val: "3",   note: "active" },
                { label: "interactions",   val: "18",  note: "retrieved" },
                { label: "last outcome",   val: "↑",   note: "escalated → resolved" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3 w-full">
                  <span className="text-black/30 w-32 flex-shrink-0">{r.label}</span>
                  <span className="font-bold">{r.val}</span>
                  <span className="text-black/30">{r.note}</span>
                </div>
              ))}
              <div className="mt-4 border border-black/10 px-3 py-2 text-[10px] text-black/40 leading-relaxed">
                <span className="text-black/70">mesh pre-load →</span> &nbsp;
                "Sir, main personally sorry hoon..."
              </div>
            </div>
          </div>

          {/* Pillar 3 — Context / Peek */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="px-8 py-10 flex flex-col justify-center">
              <p className="text-2xl font-bold mb-1">{PILLARS[2].num} {PILLARS[2].name}</p>
              <p className="text-xs font-mono text-black/30 mb-5">{PILLARS[2].codename}</p>
              <p className="text-sm text-black/55 leading-relaxed">{PILLARS[2].desc}</p>
            </div>
            <div className="border-l border-black/10 px-8 py-10 font-mono text-xs space-y-3">
              {[
                { signal: "\"theek hai\"",     intent: "frustrated",            score: "8.2/10" },
                { signal: "\"haan haan\"",      intent: "suppressed_sarcasm",    score: "7.4/10" },
                { signal: "340ms pause",        intent: "hesitation_spike",      score: "—" },
                { signal: "\"chhodiye\"",       intent: "disengagement_risk",    score: "9.1/10" },
              ].map((r) => (
                <div key={r.signal} className="flex items-center gap-2">
                  <span className="border border-black/15 px-2 py-0.5 text-black/60">{r.signal}</span>
                  <span className="text-black/30">→</span>
                  <span className="text-black/70">{r.intent}</span>
                  {r.score !== "—" && <span className="ml-auto text-black/30">{r.score}</span>}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── Live observer terminal ───────────────────────── */}
      <section className="px-8 py-16 max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-mono text-black/30 uppercase tracking-widest mb-2">/ live call observer /</p>
          <h2 className="text-2xl font-bold">watch silk fire in real time.</h2>
        </div>
        <SilkTerminal light />
        <p className="text-[10px] font-mono text-black/25 mt-3">
          ↑ simulated call · peek → mesh → silk → action → resolution
        </p>
      </section>

      {/* ── Stats strip ─────────────────────────────────── */}
      <section className="border-y border-black/10 px-8 py-0 bg-black/[0.02]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-black/10">
          {[
            { value: "94.7%",  label: "resolution rate" },
            { value: "93%",    label: "avg empathy score" },
            { value: "2m 41s", label: "avg handle time" },
            { value: "L3",     label: "autonomy level" },
          ].map((s) => (
            <div key={s.label} className="px-8 py-7 text-center">
              <p className="text-3xl font-bold tracking-tight mb-1">{s.value}</p>
              <p className="text-[10px] font-mono text-black/30 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Enterprise ──────────────────────────────────── */}
      <section className="px-8 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs font-mono text-black/30 uppercase tracking-widest mb-4">/ enterprise /</p>
            <h2 className="text-3xl font-bold tracking-tight mb-4 leading-tight">
              built for scale.<br />deployed in 48 hours.
            </h2>
            <p className="text-sm text-black/50 leading-relaxed mb-8">
              silk resolve is multi-tenant infrastructure. your data stays yours, isolated at the row level.
              connect your own database so your agents look up real orders and process real refunds.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-black text-[#e8dece] px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-colors"
            >
              request enterprise access <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="border border-black/12">
            {ENTERPRISE_FEATURES.map((item, i) => (
              <div
                key={i}
                className={`px-5 py-3.5 flex items-center gap-3 ${i < ENTERPRISE_FEATURES.length - 1 ? "border-b border-black/8" : ""}`}
              >
                <span className="text-black/25 text-sm flex-shrink-0">✓</span>
                <p className="text-sm text-black/60 font-mono">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="border-t border-black/10 px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-mono text-black/25 uppercase tracking-widest mb-5">/ get started /</p>
          <h2 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
            ready to resolve<br />
            <span className="text-black/25">with empathy?</span>
          </h2>
          <p className="text-sm text-black/45 mb-10 leading-relaxed max-w-md mx-auto">
            set up in 48 hours. no infrastructure. per-minute billing.
            every call remembered. every customer felt.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-black text-[#e8dece] px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-black/80 transition-colors"
            >
              create your account
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 border border-black/15 px-8 py-3.5 rounded-full text-sm text-black/45 hover:border-black/40 hover:text-black/70 transition-colors"
            >
              sign in to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-black/10 px-8 py-7">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">✳</span>
            <span className="font-bold text-sm">silk resolve</span>
            <span className="text-[10px] font-mono text-black/25 ml-1">/ enterprise voice infrastructure /</span>
          </div>
          <div className="flex items-center gap-6">
            {["product", "pricing", "docs", "privacy", "terms"].map((l) => (
              <a key={l} href="#" className="text-[11px] font-mono text-black/30 hover:text-black/60 transition-colors">
                {l}
              </a>
            ))}
          </div>
          <p className="text-[10px] font-mono text-black/25">© 2026 silk resolve</p>
        </div>
      </footer>
    </div>
  );
}
