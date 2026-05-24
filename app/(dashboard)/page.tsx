"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, PhoneCall, Zap, Brain, Mic } from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "@/components/marketing/VoiceOrb";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";
import SilkTerminal from "@/components/marketing/SilkTerminal";

/* ── Animated counter ───────────────────────────────────────── */
function Counter({ end, suffix = "", prefix = "", duration = 2000 }: {
  end: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(eased * end * 10) / 10);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{prefix}{typeof end === "number" && !Number.isInteger(end) ? val.toFixed(1) : Math.round(val)}{suffix}</span>;
}

/* ── Word-by-word headline animation ───────────────────────── */
function AnimatedHeadline({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 40, rotateX: -20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.4 + i * 0.1,
            ease: [0.215, 0.61, 0.355, 1.0],
          }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

/* ── Magnetic button wrapper ────────────────────────────────── */
function MagneticButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function handleMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    ref.current.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  }
  function handleLeave() {
    if (ref.current) ref.current.style.transform = "";
  }
  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-out ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}

/* ── Typewriter tagline cycles ──────────────────────────────── */
const TAGLINES = [
  "empathy at enterprise scale.",
  "every call, forever felt.",
  "intent detected before the complaint.",
  "voice that lands, every time.",
];

function CyclingTagline() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % TAGLINES.length), 3500);
    return () => clearInterval(id);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        className="block"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.5, ease: [0.215, 0.61, 0.355, 1.0] }}
      >
        {TAGLINES[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

/* ── Nav scroll-aware transparency ─────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-4 flex items-center justify-between transition-all duration-500 ${
        scrolled
          ? "bg-[#F6F1E9]/80 dark:bg-[#09090A]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-[#e8dece]/[0.06]"
          : "bg-transparent"
      }`}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <div className="flex items-center gap-2.5">
        <motion.span
          className="text-xl leading-none"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          ✳
        </motion.span>
        <span className="font-bold text-[15px] tracking-tight">silk resolve</span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        {["research", "community", "docs", "api"].map((l, i) => (
          <motion.a
            key={l}
            href="#"
            className="text-sm text-black/45 hover:text-black dark:text-[#e8dece]/45 dark:hover:text-[#e8dece] transition-colors"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
          >
            {l}
          </motion.a>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Link
          href="/register"
          className="flex items-center gap-2 bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#0a0908]
            px-5 py-2 rounded-full text-sm font-semibold
            hover:opacity-80 transition-opacity"
        >
          get access <ArrowUpRight size={13} />
        </Link>
      </motion.div>
    </motion.nav>
  );
}

/* ── Pill badge ─────────────────────────────────────────────── */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono
        border border-black/10 dark:border-[#e8dece]/10
        bg-black/[0.03] dark:bg-[#e8dece]/[0.04]
        text-black/50 dark:text-[#e8dece]/50"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      {children}
    </motion.div>
  );
}

/* ── Pillar card ─────────────────────────────────────────────── */
function PillarCard({
  num, name, codename, desc, children, delay = 0,
}: {
  num: string; name: string; codename: string; desc: string;
  children: React.ReactNode; delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <motion.div
        className="border border-black/10 dark:border-[#e8dece]/10
          bg-white/40 dark:bg-[#e8dece]/[0.03]
          backdrop-blur-sm overflow-hidden group
          hover:border-black/20 dark:hover:border-[#e8dece]/20
          transition-all duration-300"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-8 md:p-10 border-b border-black/[0.06] dark:border-[#e8dece]/[0.06]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-3xl font-bold tracking-tight mb-0.5">{num}</p>
              <p className="text-2xl font-bold">{name}</p>
            </div>
            <span className="text-[10px] font-mono text-black/25 dark:text-[#e8dece]/25 pt-1">{codename}</span>
          </div>
          <p className="text-sm text-black/50 dark:text-[#e8dece]/50 leading-relaxed">{desc}</p>
        </div>
        <div className="p-8 md:p-10 min-h-[180px] flex items-center justify-center">
          {children}
        </div>
      </motion.div>
    </Reveal>
  );
}

/* ── Waveform (div-based so framer-motion can animate height) ── */
function Waveform() {
  const bars = [2,4,8,14,22,30,36,40,38,32,26,20,16,12,8,6,10,18,28,38,44,40,34,26,18,12,8,4,6,10,16,24,32,38,42,36,28,18,10,6,4];
  return (
    <div className="flex items-end justify-center gap-[3px] w-full max-w-xs h-14 opacity-60">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="rounded-full bg-current flex-shrink-0"
          style={{ width: 5, minWidth: 5 }}
          animate={{ height: [`${h * 0.5}px`, `${h}px`, `${h * 0.5}px`] }}
          transition={{ duration: 1.2 + i * 0.03, repeat: Infinity, delay: i * 0.04, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Memory preview ─────────────────────────────────────────── */
function MemoryPreview() {
  const rows = [
    { label: "emotional debt", val: "−42", note: "negative" },
    { label: "anchors",        val: "3",   note: "active" },
    { label: "interactions",   val: "18",  note: "retrieved" },
    { label: "last outcome",   val: "↑",   note: "escalated → resolved" },
  ];
  return (
    <div className="w-full space-y-3 font-mono text-xs">
      {rows.map((r, i) => (
        <motion.div
          key={r.label}
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 * i }}
        >
          <span className="text-black/30 dark:text-[#e8dece]/30 w-28 flex-shrink-0">{r.label}</span>
          <span className="font-bold">{r.val}</span>
          <span className="text-black/30 dark:text-[#e8dece]/30">{r.note}</span>
        </motion.div>
      ))}
      <motion.div
        className="mt-4 border border-black/10 dark:border-[#e8dece]/10 px-3 py-2 text-[10px] text-black/40 dark:text-[#e8dece]/40 leading-relaxed"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-black/70 dark:text-[#e8dece]/70">mesh pre-load →</span>&nbsp;
        "Sir, main personally sorry hoon..."
      </motion.div>
    </div>
  );
}

/* ── Context preview ─────────────────────────────────────────── */
function ContextPreview() {
  const signals = [
    { signal: '"theek hai"',  intent: "frustrated",         score: "8.2" },
    { signal: '"haan haan"',  intent: "suppressed_sarcasm", score: "7.4" },
    { signal: "340ms pause",  intent: "hesitation_spike",   score: "—"  },
    { signal: '"chhodiye"',   intent: "disengagement_risk", score: "9.1" },
  ];
  return (
    <div className="w-full font-mono text-xs space-y-3">
      {signals.map((s, i) => (
        <motion.div
          key={s.signal}
          className="flex items-center gap-2 flex-wrap"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12 }}
        >
          <span className="border border-black/15 dark:border-[#e8dece]/15 px-2 py-0.5 text-black/60 dark:text-[#e8dece]/60">
            {s.signal}
          </span>
          <span className="text-black/25 dark:text-[#e8dece]/25">→</span>
          <span className="text-black/70 dark:text-[#e8dece]/70">{s.intent}</span>
          {s.score !== "—" && (
            <span className="ml-auto text-black/30 dark:text-[#e8dece]/30">{s.score}/10</span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ── STATS STRIP ────────────────────────────────────────────── */
const STATS = [
  { value: 94.7, suffix: "%", label: "resolution rate" },
  { value: 93,   suffix: "%", label: "avg empathy score" },
  { value: 2,    suffix: "m 41s", label: "avg handle time", raw: "2m 41s" },
  { value: 3,    suffix: "",  label: "autonomy level", raw: "L3" },
];

/* ── ENTERPRISE FEATURES ────────────────────────────────────── */
const FEATURES = [
  { icon: Zap,      text: "deploy in 48 hours · no infrastructure overhead" },
  { icon: Brain,    text: "hinglish, hindi, tamil, telugu + 8 more languages" },
  { icon: PhoneCall,text: "connects to your crm, database, or rest api" },
  { icon: Mic,      text: "full call analysis · empathy heatmaps · a/b testing" },
];

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.25], [0, -60]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#F6F1E9] dark:bg-[#09090A] text-[#0A0908] dark:text-[#F0EBE0]
        selection:bg-black/10 dark:selection:bg-[#e8dece]/10"
    >
      {/* ── Dot grid (light only) ─────────────────────────── */}
      <div
        className="fixed inset-0 pointer-events-none dark:opacity-0 opacity-100 transition-opacity duration-500"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <Nav />

      {/* ════════════════════════════════════════
          HERO
      ════════════════════════════════════════ */}
      <motion.section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-12 overflow-hidden"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Background radial glow — dark mode only */}
        <motion.div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(232,220,206,0.04) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Badge */}
        <Badge>Enterprise Voice AI · Now in Early Access</Badge>

        {/* Voice Orb — the hero centrepiece */}
        <motion.div
          className="my-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.215, 0.61, 0.355, 1.0] }}
        >
          <VoiceOrb size={280} />
        </motion.div>

        {/* Headline */}
        <div className="text-center" style={{ perspective: 800 }}>
          <AnimatedHeadline
            text="Resolution that remembers."
            className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tight leading-[1.02] mb-6"
          />
        </div>

        {/* Cycling sub-tagline */}
        <div className="h-8 mb-6 overflow-hidden">
          <motion.p
            className="text-lg md:text-xl text-black/40 dark:text-[#e8dece]/40 font-light tracking-tight text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <CyclingTagline />
          </motion.p>
        </div>

        {/* Sub copy */}
        <motion.p
          className="max-w-xl text-center text-base text-black/50 dark:text-[#e8dece]/50 leading-relaxed mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
        >
          Not just what happened — how it made them feel.
          Silk carries emotional memory into every call, detects hidden intent
          before the complaint, and speaks with prosody that actually lands.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.2 }}
        >
          <MagneticButton>
            <Link
              href="/register"
              className="flex items-center gap-2.5 bg-black dark:bg-[#e8dece]
                text-[#e8dece] dark:text-[#09090A]
                px-8 py-3.5 rounded-full text-sm font-semibold
                hover:opacity-80 transition-opacity"
            >
              get early access <ArrowRight size={14} />
            </Link>
          </MagneticButton>
          <MagneticButton>
            <Link
              href="/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full text-sm
                border border-black/15 dark:border-[#e8dece]/15
                text-black/50 dark:text-[#e8dece]/50
                hover:border-black/40 dark:hover:border-[#e8dece]/40
                hover:text-black dark:hover:text-[#e8dece]
                transition-all"
            >
              sign in to dashboard →
            </Link>
          </MagneticButton>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        >
          <motion.div
            className="w-px h-12 bg-gradient-to-b from-transparent via-black/30 dark:via-[#e8dece]/30 to-transparent"
            animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] font-mono text-black/20 dark:text-[#e8dece]/20 tracking-widest uppercase">scroll</span>
        </motion.div>
      </motion.section>

      {/* ════════════════════════════════════════
          STATS STRIP
      ════════════════════════════════════════ */}
      <section className="border-y border-black/8 dark:border-[#e8dece]/8 bg-black/[0.015] dark:bg-[#e8dece]/[0.015]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-black/8 dark:divide-[#e8dece]/8">
          {[
            { raw: "94.7%", label: "resolution rate" },
            { raw: "93%",   label: "avg empathy score" },
            { raw: "2m41s", label: "avg handle time" },
            { raw: "L3",    label: "autonomy level" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="px-8 py-8 text-center">
                <p className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{s.raw}</p>
                <p className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35 uppercase tracking-widest">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════
          3 PILLARS
      ════════════════════════════════════════ */}
      <section className="px-6 md:px-10 py-24 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-xs font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-4">
            / the three pillars /
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-16">
            this requires<br />mastering 3 essentials.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PillarCard
            num="1." name="voice" codename="/ codename: silk /"
            desc="Emotional reactor. Injects mid-sentence prosody tags — <whisper>, <warm>, <apologetic> — matched to user tension in real-time."
            delay={0}
          >
            <div className="w-full text-black/60 dark:text-[#e8dece]/60">
              <Waveform />
            </div>
          </PillarCard>

          <PillarCard
            num="2." name="memory" codename="/ codename: mesh /"
            desc="Relationship vault. Recalls emotional debt from past interactions to calibrate today's greeting and escalation threshold."
            delay={0.1}
          >
            <MemoryPreview />
          </PillarCard>

          <PillarCard
            num="3." name="context" codename="/ codename: peek /"
            desc='Intent radar. Identifies when "theek hai" means frustrated. Triggers high-priority workflows before the explicit complaint.'
            delay={0.2}
          >
            <ContextPreview />
          </PillarCard>
        </div>
      </section>

      {/* ════════════════════════════════════════
          LIVE OBSERVER TERMINAL
      ════════════════════════════════════════ */}
      <section className="px-6 md:px-10 py-24 max-w-5xl mx-auto">
        <Reveal>
          <p className="text-xs font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-4">
            / live call observer /
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            watch silk fire in real time.
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="text-base text-black/40 dark:text-[#e8dece]/40 mb-10 leading-relaxed max-w-lg">
            Every millisecond, Silk is reading emotion, pulling memory, and crafting the exact right words.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="rounded-none overflow-hidden
            border border-black/10 dark:border-[#e8dece]/10
            shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <SilkTerminal />
          </div>
          <p className="text-[10px] font-mono text-black/20 dark:text-[#e8dece]/20 mt-3">
            ↑ simulated call · peek → mesh → silk → action → resolution
          </p>
        </Reveal>
      </section>

      {/* ════════════════════════════════════════
          ENTERPRISE
      ════════════════════════════════════════ */}
      <section className="px-6 md:px-10 py-24 border-t border-black/[0.06] dark:border-[#e8dece]/[0.06]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <p className="text-xs font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-4">/ enterprise /</p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
                built for scale.<br />
                <span className="text-black/25 dark:text-[#e8dece]/25">deployed in 48 hours.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-base text-black/45 dark:text-[#e8dece]/45 leading-relaxed mb-10">
                Multi-tenant infrastructure. Your data stays yours, isolated at the row level.
                Connect your own database so your agents look up real orders and process real refunds.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <MagneticButton className="inline-block">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2
                    bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#09090A]
                    px-7 py-3 rounded-full text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  request enterprise access <ArrowUpRight size={13} />
                </Link>
              </MagneticButton>
            </Reveal>
          </div>

          <Stagger className="space-y-0" stagger={0.08} delay={0.2}>
            {[
              "multi-tenant · rls-isolated per client",
              "hinglish, hindi, tamil, telugu + 8 more",
              "connects to your crm, database, or rest api",
              "deploy in 48 hours · no infrastructure overhead",
              "full call analysis · empathy heatmaps · a/b testing",
              "soc 2 ready · data never leaves your region",
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div className="flex items-center gap-4 px-5 py-4
                  border-b border-black/[0.06] dark:border-[#e8dece]/[0.06]
                  group hover:bg-black/[0.02] dark:hover:bg-[#e8dece]/[0.02] transition-colors">
                  <span className="text-black/20 dark:text-[#e8dece]/20 text-sm flex-shrink-0">✓</span>
                  <p className="text-sm text-black/55 dark:text-[#e8dece]/55 font-mono">{item}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════ */}
      <section className="relative px-6 py-32 overflow-hidden">
        {/* Glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,0,0,0.04) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-xs font-mono text-black/25 dark:text-[#e8dece]/25 uppercase tracking-widest mb-6">/ get started today /</p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              ready to resolve<br />
              <span className="text-black/22 dark:text-[#e8dece]/22">with empathy?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-base text-black/40 dark:text-[#e8dece]/40 mb-12 leading-relaxed max-w-md mx-auto">
              Set up in 48 hours. No infrastructure. Per-minute billing.
              Every call remembered. Every customer felt.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2
                    bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#09090A]
                    px-10 py-4 rounded-full text-sm font-semibold
                    hover:opacity-80 transition-opacity"
                >
                  create your account <ArrowRight size={14} />
                </Link>
              </MagneticButton>
              <MagneticButton>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2
                    border border-black/15 dark:border-[#e8dece]/15
                    px-10 py-4 rounded-full text-sm
                    text-black/40 dark:text-[#e8dece]/40
                    hover:border-black/35 dark:hover:border-[#e8dece]/35
                    hover:text-black/70 dark:hover:text-[#e8dece]/70
                    transition-all"
                >
                  sign in to dashboard
                </Link>
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="border-t border-black/[0.06] dark:border-[#e8dece]/[0.06] px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="text-base leading-none">✳</span>
            <span className="font-bold text-sm tracking-tight">silk resolve</span>
            <span className="text-[10px] font-mono text-black/20 dark:text-[#e8dece]/20 ml-1">
              / enterprise voice infrastructure /
            </span>
          </div>
          <div className="flex items-center gap-6">
            {["product", "pricing", "docs", "privacy", "terms"].map(l => (
              <a key={l} href="#"
                className="text-[11px] font-mono text-black/25 dark:text-[#e8dece]/25
                  hover:text-black/60 dark:hover:text-[#e8dece]/60 transition-colors">
                {l}
              </a>
            ))}
          </div>
          <p className="text-[10px] font-mono text-black/20 dark:text-[#e8dece]/20">© 2026 silk resolve</p>
        </div>
      </footer>
    </div>
  );
}
