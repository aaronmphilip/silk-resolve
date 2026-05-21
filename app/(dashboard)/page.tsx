import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import SilkTerminal from "@/components/marketing/SilkTerminal";

const STATS = [
  { value: "94.7%",  label: "resolution rate" },
  { value: "93%",    label: "avg empathy score" },
  { value: "2m 41s", label: "avg handle time" },
  { value: "L3",     label: "autonomy level" },
];

const PILLARS = [
  {
    num: "01",
    name: "peek",
    codename: "/ intent radar /",
    body: "identifies when \"theek hai\" means frustrated. detects arousal spikes, latency hesitation, and sarcasm mismatch 140ms before the words fully land.",
    tags: ["tension_detect", "sarcasm_flag", "latency_spike"],
  },
  {
    num: "02",
    name: "mesh",
    codename: "/ relationship vault /",
    body: "carries 18 months of emotional history into every call. not just what happened — how it made them feel. emotional debt tracked, anchors set, vibe calibrated.",
    tags: ["emotional_debt", "contextual_anchors", "identity_profile"],
  },
  {
    num: "03",
    name: "silk",
    codename: "/ voice synthesis /",
    body: "injects prosody mid-sentence. not robotic tts. <apologetic_whisper> when debt is negative. <warm_closing> when trust is rebuilt. matched to real-time tension level.",
    tags: ["<apologetic_whisper>", "<warm>", "<warm_closing>"],
  },
];

const HOW = [
  { step: "01", title: "call comes in",    body: "peek analyzes pitch, jitter, environment and arousal in under 140ms. hidden intent flagged before the customer even finishes their first sentence." },
  { step: "02", title: "memory loads",     body: "mesh retrieves up to 18 months of interaction history. emotional debt score, preferred name, last outcome — all injected before the first word is spoken." },
  { step: "03", title: "silk speaks",      body: "prosody-tagged output synthesised in real time. the agent doesn't just say the right thing — it says it the right way, in your customer's language." },
  { step: "04", title: "action executes",  body: "whitelisted tools fire: refunds processed, queues jumped, tickets raised. your agent resolves — not just talks. every outcome logged to the dashboard." },
];

const ENTERPRISE = [
  "multi-tenant · rls-isolated per client",
  "hinglish, hindi, tamil, telugu, marathi + 8 more",
  "connects to your crm, database, or rest api",
  "deploy in 48 hours · no infrastructure overhead",
  "full call analysis · empathy heatmaps · a/b testing",
  "soc 2 ready · data never leaves your region",
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#0e0e0e] text-[#f0ebe0]"
      style={{
        backgroundImage: "radial-gradient(rgba(240,235,224,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[#f0ebe0]/[0.08] bg-[#0e0e0e]/90 backdrop-blur-sm px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 border border-[#f0ebe0]/30 rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold font-mono leading-none">SR</span>
          </div>
          <span className="font-bold text-sm tracking-tight">silk resolve</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["product", "how it works", "pricing", "enterprise"].map((l) => (
            <a
              key={l}
              href={`#${l.replace(" ", "-")}`}
              className="text-xs font-mono text-[#f0ebe0]/40 hover:text-[#f0ebe0] transition-colors"
            >
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs font-mono text-[#f0ebe0]/50 hover:text-[#f0ebe0] transition-colors">
            sign in
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-1.5 bg-[#f0ebe0] text-[#0e0e0e] px-4 py-2 text-xs font-medium hover:bg-[#f0ebe0]/85 transition-colors"
          >
            get access <ArrowRight size={11} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="px-8 pt-24 pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[10px] font-mono text-[#f0ebe0]/30 uppercase tracking-widest mb-6">
              / silk resolve · level 3 autonomous voice ai /
            </p>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
              resolution
              <br />
              that{" "}
              <span className="text-[#f0ebe0]/35">remembers.</span>
            </h1>
            <p className="text-base text-[#f0ebe0]/50 leading-relaxed mb-10 max-w-md">
              not just what happened — how it made them feel.
              silk carries emotional memory into every call, detects hidden intent before the complaint,
              and speaks with prosody that actually lands.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href="/register"
                className="flex items-center gap-2 bg-[#f0ebe0] text-[#0e0e0e] px-6 py-3 text-sm font-semibold hover:bg-[#f0ebe0]/85 transition-colors"
              >
                get early access <ArrowRight size={13} />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-mono text-[#f0ebe0]/40 hover:text-[#f0ebe0]/70 transition-colors"
              >
                view dashboard <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mt-10">
              {["peek · intent", "mesh · memory", "silk · voice", "action · resolution"].map((t) => (
                <span key={t} className="text-[10px] font-mono border border-[#f0ebe0]/[0.12] px-2.5 py-1 text-[#f0ebe0]/30">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <SilkTerminal />
            <p className="text-[10px] font-mono text-[#f0ebe0]/20 mt-3 text-center">
              ↑ live call simulation · peek → mesh → silk · firing in real time
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────── */}
      <section className="border-y border-[#f0ebe0]/[0.08] px-8 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-[#f0ebe0]/[0.08]">
          {STATS.map((s) => (
            <div key={s.label} className="px-8 py-4 text-center">
              <p className="text-3xl font-bold tracking-tight mb-1">{s.value}</p>
              <p className="text-[11px] font-mono text-[#f0ebe0]/30 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Three Pillars ───────────────────────────────── */}
      <section id="product" className="px-8 py-20 max-w-7xl mx-auto">
        <div className="mb-12">
          <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-3">the three essentials</p>
          <h2 className="text-3xl font-bold tracking-tight">resolution requires mastering three things.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 border border-[#f0ebe0]/[0.10]">
          {PILLARS.map((p, i) => (
            <div key={p.num} className={`px-7 py-8 ${i < 2 ? "border-b md:border-b-0 md:border-r border-[#f0ebe0]/[0.10]" : ""}`}>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold opacity-15 font-mono">{p.num}</span>
                <span className="text-2xl font-bold">{p.name}</span>
              </div>
              <p className="text-[10px] font-mono text-[#f0ebe0]/25 mb-5">{p.codename}</p>
              <p className="text-sm text-[#f0ebe0]/50 leading-relaxed mb-6">{p.body}</p>
              <div className="flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span key={t} className="text-[9px] font-mono border border-[#f0ebe0]/15 px-2 py-1 text-[#f0ebe0]/35">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section id="how-it-works" className="px-8 py-20 border-t border-[#f0ebe0]/[0.08]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-3">under the hood</p>
            <h2 className="text-3xl font-bold tracking-tight">a single call. four systems firing.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-[#f0ebe0]/[0.10]">
            {HOW.map((h, i) => (
              <div key={h.step} className={`px-6 py-7 ${i < 3 ? "border-b lg:border-b-0 lg:border-r border-[#f0ebe0]/[0.10]" : ""}`}>
                <span className="text-[10px] font-mono text-[#f0ebe0]/20 block mb-4">{h.step}</span>
                <p className="font-bold text-sm mb-3">{h.title}</p>
                <p className="text-xs text-[#f0ebe0]/40 leading-relaxed">{h.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Silk prosody sample ─────────────────────────── */}
      <section className="border-t border-[#f0ebe0]/[0.08] px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-6">silk · prosody output sample</p>
          <div className="border border-[#f0ebe0]/[0.10] bg-[#0a0a0a] px-8 py-7 font-mono">
            <div className="text-[10px] text-[#f0ebe0]/20 mb-5">
              MESH → debt: -42 · PEEK → arousal: 8.2/10 · hesitation_spike detected
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-[#f0ebe0]/80 leading-relaxed">
                <span className="text-amber-400/50 text-[10px]">&lt;apologetic_whisper&gt;</span>
                {" "}Rajesh Sir, main personally sorry hoon is delay ke liye.{" "}
                <span className="text-amber-400/50 text-[10px]">&lt;/apologetic_whisper&gt;</span>
              </p>
              <p className="text-[#f0ebe0]/80 leading-relaxed">
                <span className="text-blue-400/50 text-[10px]">&lt;warm&gt;</span>
                {" "}Aapka report queue mein 47 number pe tha — humne abhi 1 pe kar diya.{" "}
                <span className="text-blue-400/50 text-[10px]">&lt;/warm&gt;</span>
              </p>
              <p className="text-[#f0ebe0]/80 leading-relaxed">
                <span className="text-emerald-400/50 text-[10px]">&lt;warm_closing&gt;</span>
                {" "}4 ghante mein milega. Pakka. Dhanyavaad Sir.{" "}
                <span className="text-emerald-400/50 text-[10px]">&lt;/warm_closing&gt;</span>
              </p>
              <div className="text-[10px] text-emerald-400/50 mt-4 pt-4 border-t border-[#f0ebe0]/[0.08]">
                empathy_score: 96 · outcome: resolved · tension: 88 → 14 · duration: 3m 12s
              </div>
            </div>
          </div>
          <p className="text-[10px] font-mono text-[#f0ebe0]/20 mt-3">
            ↑ not scripted. generated in real time based on mesh debt score and peek arousal level.
          </p>
        </div>
      </section>

      {/* ── Enterprise ──────────────────────────────────── */}
      <section id="enterprise" className="border-t border-[#f0ebe0]/[0.08] px-8 py-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-4">/ enterprise /</p>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              built for scale.<br />deployed in 48 hours.
            </h2>
            <p className="text-sm text-[#f0ebe0]/45 leading-relaxed mb-8">
              silk resolve is multi-tenant infrastructure. your data stays yours, isolated at the row level.
              connect your own database so your agents can look up real orders, process real refunds,
              and resolve real problems — not just simulate them.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 border border-[#f0ebe0]/25 px-5 py-2.5 text-xs font-mono hover:bg-[#f0ebe0]/5 transition-colors"
            >
              request enterprise access <ArrowRight size={11} />
            </Link>
          </div>

          <div className="border border-[#f0ebe0]/[0.10]">
            {ENTERPRISE.map((item, i) => (
              <div key={i} className={`px-6 py-4 flex items-center gap-3 ${i < ENTERPRISE.length - 1 ? "border-b border-[#f0ebe0]/[0.08]" : ""}`}>
                <span className="text-[#f0ebe0]/20 font-mono text-xs flex-shrink-0">✓</span>
                <p className="text-sm text-[#f0ebe0]/55 font-mono">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-[#f0ebe0]/[0.08] px-8 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] font-mono text-[#f0ebe0]/25 uppercase tracking-widest mb-5">/ get started /</p>
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            ready to resolve<br />
            <span className="text-[#f0ebe0]/30">with empathy?</span>
          </h2>
          <p className="text-sm text-[#f0ebe0]/40 mb-10 leading-relaxed">
            join enterprises already using silk to turn every call into a relationship.
            set up in 48 hours. no infrastructure. per-minute billing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-[#f0ebe0] text-[#0e0e0e] px-8 py-3.5 text-sm font-semibold hover:bg-[#f0ebe0]/85 transition-colors"
            >
              create your account <ArrowRight size={13} />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 border border-[#f0ebe0]/20 px-8 py-3.5 text-sm font-mono text-[#f0ebe0]/50 hover:border-[#f0ebe0]/40 hover:text-[#f0ebe0]/70 transition-colors"
            >
              sign in to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[#f0ebe0]/[0.08] px-8 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 border border-[#f0ebe0]/25 rounded-full flex items-center justify-center">
              <span className="text-[8px] font-bold font-mono">SR</span>
            </div>
            <span className="text-sm font-bold">silk resolve</span>
            <span className="text-[10px] font-mono text-[#f0ebe0]/20 ml-2">/ enterprise voice infrastructure /</span>
          </div>
          <div className="flex items-center gap-6">
            {["product", "pricing", "docs", "privacy", "terms"].map((l) => (
              <a key={l} href="#" className="text-[11px] font-mono text-[#f0ebe0]/25 hover:text-[#f0ebe0]/50 transition-colors">
                {l}
              </a>
            ))}
          </div>
          <p className="text-[10px] font-mono text-[#f0ebe0]/20">© 2026 silk resolve</p>
        </div>
      </footer>
    </div>
  );
}
