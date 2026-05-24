"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { VoiceOrb } from "@/components/marketing/VoiceOrb";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";
import SilkTerminal from "@/components/marketing/SilkTerminal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CYCLING TAGLINE  â€” fixed-height container prevents layout shift
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TAGLINES = [
  "empathy at enterprise scale.",
  "every call, forever felt.",
  "intent detected before the complaint.",
  "voice that actually lands.",
];

function CyclingTagline() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % TAGLINES.length), 3200);
    return () => clearInterval(id);
  }, []);
  return (
    /* fixed height = no layout shift regardless of text length */
    <div className="relative h-7 w-full overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.span
          key={idx}
          className="absolute inset-0 flex items-center justify-center
            text-lg text-black/38 dark:text-[#e8dece]/38 font-light"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.42, ease: [0.215, 0.61, 0.355, 1.0] }}
        >
          {TAGLINES[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   ANIMATED HEADLINE â€” plain Y + opacity, no rotateX (no jitter)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AnimatedHeadline({ text, className }: { text: string; className?: string }) {
  return (
    <h1 className={className}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.22em]"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.5 + i * 0.09, ease: [0.215, 0.61, 0.355, 1.0] }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAGNETIC BUTTON
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MagneticButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`will-change-transform transition-transform duration-300 ease-out ${className ?? ""}`}
      onMouseMove={e => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.16;
        const y = (e.clientY - r.top - r.height / 2) * 0.16;
        ref.current.style.transform = `translate(${x}px,${y}px)`;
      }}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = ""; }}
    >
      {children}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   SCROLL-AWARE NAV
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NAV_LINKS = [
  { label: "use cases",  href: "/use-cases"  },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 flex items-center justify-between h-16 transition-all duration-500 ${
        scrolled
          ? "brand-nav-surface backdrop-blur-xl border-b border-black/[0.07] dark:border-[#e8dece]/[0.07] shadow-sm"
          : "bg-transparent"
      }`}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <BrandLogo />

      {/* Links */}
      <div className="hidden md:flex items-center gap-5 lg:gap-7">
        {NAV_LINKS.map(({ label, href }, i) => (
          <motion.div key={label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 + i * 0.06 }}
          >
            <Link
              href={href}
              className="text-[13.5px] text-black/45 dark:text-[#e8dece]/45
                hover:text-black dark:hover:text-[#e8dece] transition-colors"
            >
              {label}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <ThemeToggle />
        <Link
          href="/register"
          className="flex items-center gap-1.5 whitespace-nowrap bg-black dark:bg-[#e8dece]
            text-[#e8dece] dark:text-[#0a0908]
            px-4 lg:px-5 py-2 rounded-full text-[13px] font-semibold hover:opacity-80 transition-opacity"
        >
          get access <ArrowUpRight size={12} />
        </Link>
      </motion.div>
    </motion.nav>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PILL BADGE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-mono
        border border-black/10 dark:border-[#e8dece]/10
        bg-black/[0.025] dark:bg-[#e8dece]/[0.04]
        text-black/45 dark:text-[#e8dece]/45"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.2 }}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
      </span>
      {children}
    </motion.div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PILLAR CARD
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
          bg-white/40 dark:bg-[#e8dece]/[0.025] backdrop-blur-sm
          hover:border-black/20 dark:hover:border-[#e8dece]/20 transition-all duration-300"
        whileHover={{ y: -3 }}
        transition={{ duration: 0.18 }}
      >
        <div className="p-8 border-b border-black/[0.06] dark:border-[#e8dece]/[0.06]">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-3xl font-bold tracking-tight mb-0.5">{num}</p>
              <p className="text-xl font-bold">{name}</p>
            </div>
            <span className="text-[10px] font-mono text-black/22 dark:text-[#e8dece]/22 pt-1">{codename}</span>
          </div>
          <p className="text-sm text-black/48 dark:text-[#e8dece]/48 leading-relaxed">{desc}</p>
        </div>
        <div className="p-8 min-h-[168px] flex items-center justify-center">
          {children}
        </div>
      </motion.div>
    </Reveal>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   WAVEFORM VISUAL (div-based, framer animates height fine)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Waveform() {
  const bars = [3,6,10,16,24,32,38,42,40,34,27,20,15,11,7,5,9,17,27,38,44,40,34,26,17,11,7,5,8,14,22,32,38,42,36,28,17,9,5,3];
  return (
    <div className="flex items-end justify-center gap-[3px] w-full max-w-xs h-14 opacity-55">
      {bars.map((h, i) => (
        <motion.div key={i}
          className="rounded-full bg-current flex-shrink-0"
          style={{ width: 4 }}
          animate={{ height: [`${h * 0.45}px`, `${h}px`, `${h * 0.45}px`] }}
          transition={{ duration: 1.1 + i * 0.028, repeat: Infinity, delay: i * 0.038, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MEMORY PREVIEW
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MemoryPreview() {
  const rows = [
    { label: "emotional debt", val: "âˆ’42", note: "negative" },
    { label: "anchors",        val: "3",   note: "active" },
    { label: "interactions",   val: "18",  note: "retrieved" },
    { label: "last outcome",   val: "â†‘",   note: "resolved" },
  ];
  return (
    <div className="w-full space-y-2.5 font-mono text-xs">
      {rows.map((r, i) => (
        <Reveal key={r.label} delay={0.08 * i}>
          <div className="flex items-center gap-3">
            <span className="text-black/28 dark:text-[#e8dece]/28 w-28 flex-shrink-0">{r.label}</span>
            <span className="font-bold">{r.val}</span>
            <span className="text-black/28 dark:text-[#e8dece]/28">{r.note}</span>
          </div>
        </Reveal>
      ))}
      <Reveal delay={0.38}>
        <div className="mt-3 border border-black/10 dark:border-[#e8dece]/10 px-3 py-2 text-[10px] text-black/38 dark:text-[#e8dece]/38 leading-relaxed">
          <span className="text-black/65 dark:text-[#e8dece]/65">mesh pre-load â†’</span>&nbsp;
          "Sir, main personally sorry hoon..."
        </div>
      </Reveal>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   CONTEXT PREVIEW
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ContextPreview() {
  const signals = [
    { signal: '"theek hai"',  intent: "frustrated",          score: "8.2" },
    { signal: '"haan haan"',  intent: "suppressed_sarcasm",  score: "7.4" },
    { signal: "340ms pause",  intent: "hesitation_spike",    score: "â€”"  },
    { signal: '"chhodiye"',   intent: "disengagement_risk",  score: "9.1" },
  ];
  return (
    <div className="w-full font-mono text-xs space-y-2.5">
      {signals.map((s, i) => (
        <Reveal key={s.signal} delay={0.1 * i}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="border border-black/12 dark:border-[#e8dece]/12 px-2 py-0.5 text-black/55 dark:text-[#e8dece]/55">{s.signal}</span>
            <span className="text-black/22 dark:text-[#e8dece]/22">â†’</span>
            <span className="text-black/68 dark:text-[#e8dece]/68">{s.intent}</span>
            {s.score !== "â€”" && <span className="ml-auto text-black/28 dark:text-[#e8dece]/28">{s.score}/10</span>}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   LANDING PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0]);
  const heroY       = useTransform(scrollYProgress, [0, 0.22], [0, -48]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#ECE7D3] dark:bg-[#09090A] text-[#0A0908] dark:text-[#F0EBE0]"
    >
      <Nav />

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• HERO â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <motion.section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 pb-16 overflow-hidden"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Dark mode radial glow */}
        <div
          className="absolute inset-0 pointer-events-none hidden dark:block"
          style={{ background: "radial-gradient(ellipse 70% 55% at 50% 35%, rgba(232,220,206,0.035) 0%, transparent 70%)" }}
        />

        <Badge>Enterprise Voice AI Â· Now in Early Access</Badge>

        {/* Voice Orb */}
        <motion.div
          className="my-10"
          initial={{ opacity: 0, scale: 0.82 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.215, 0.61, 0.355, 1.0] }}
        >
          <VoiceOrb size={270} />
        </motion.div>

        {/* Headline */}
        <AnimatedHeadline
          text="Resolution that remembers."
          className="text-[clamp(36px,6vw,86px)] font-bold tracking-tight leading-[1.03] text-center mb-5"
        />

        {/* Cycling sub-tagline â€” fixed height, no layout shift */}
        <motion.div
          className="mb-8 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          <CyclingTagline />
        </motion.div>

        {/* Body copy */}
        <motion.p
          className="max-w-[480px] text-center text-[15px] text-black/48 dark:text-[#e8dece]/48 leading-relaxed mb-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 1.05 }}
        >
          Not just what happened â€” how it made them feel. Silk carries emotional
          memory into every call, detects hidden intent before the complaint, and
          speaks with prosody that actually lands.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 1.18 }}
        >
          <MagneticButton>
            <Link href="/register"
              className="flex items-center gap-2 bg-black dark:bg-[#e8dece]
                text-[#e8dece] dark:text-[#09090A]
                px-8 py-3.5 rounded-full text-[14px] font-semibold hover:opacity-80 transition-opacity">
              get early access <ArrowRight size={14} />
            </Link>
          </MagneticButton>
          <MagneticButton>
            <Link href="/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px]
                border border-black/14 dark:border-[#e8dece]/14
                text-black/48 dark:text-[#e8dece]/48
                hover:border-black/36 dark:hover:border-[#e8dece]/36
                hover:text-black dark:hover:text-[#e8dece] transition-all">
              sign in to dashboard â†’
            </Link>
          </MagneticButton>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        >
          <motion.div
            className="w-px h-10 bg-gradient-to-b from-transparent via-black/25 dark:via-[#e8dece]/25 to-transparent"
            animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[9px] font-mono text-black/18 dark:text-[#e8dece]/18 uppercase tracking-widest">scroll</span>
        </motion.div>
      </motion.section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• STATS STRIP â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="border-y border-black/[0.07] dark:border-[#e8dece]/[0.07]
        bg-black/[0.012] dark:bg-[#e8dece]/[0.012]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4
          divide-x divide-black/[0.07] dark:divide-[#e8dece]/[0.07]">
          {[
            { raw: "94.7%", label: "resolution rate" },
            { raw: "93%",   label: "avg empathy score" },
            { raw: "2m41s", label: "avg handle time" },
            { raw: "L3",    label: "autonomy level" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="px-8 py-8 text-center">
                <p className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{s.raw}</p>
                <p className="text-[10px] font-mono text-black/32 dark:text-[#e8dece]/32 uppercase tracking-widest">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• 3 PILLARS â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="px-6 md:px-10 py-24 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[10px] font-mono text-black/28 dark:text-[#e8dece]/28 uppercase tracking-widest mb-4">
            / the three pillars /
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-14">
            this requires mastering<br />3 essentials.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PillarCard num="1." name="voice" codename="/ silk /"
            desc="Injects mid-sentence prosody â€” <whisper>, <warm>, <apologetic> â€” matched to user tension in real-time."
            delay={0}>
            <div className="w-full text-black/55 dark:text-[#e8dece]/55"><Waveform /></div>
          </PillarCard>

          <PillarCard num="2." name="memory" codename="/ mesh /"
            desc="Recalls emotional debt from past interactions to calibrate today's greeting and escalation threshold."
            delay={0.1}>
            <MemoryPreview />
          </PillarCard>

          <PillarCard num="3." name="context" codename="/ peek /"
            desc='Identifies when "theek hai" means frustrated. Triggers priority workflows before the explicit complaint.'
            delay={0.2}>
            <ContextPreview />
          </PillarCard>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• LIVE TERMINAL â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="px-6 md:px-10 py-24 max-w-5xl mx-auto">
        <Reveal>
          <p className="text-[10px] font-mono text-black/28 dark:text-[#e8dece]/28 uppercase tracking-widest mb-4">
            / live call observer /
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            watch silk fire in real time.
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="text-[15px] text-black/40 dark:text-[#e8dece]/40 mb-10 leading-relaxed max-w-lg">
            Every millisecond, Silk reads emotion, pulls memory, and crafts exactly the right words.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="border border-black/10 dark:border-[#e8dece]/10
            shadow-[0_16px_48px_rgba(0,0,0,0.07)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
            <SilkTerminal />
          </div>
          <p className="text-[9px] font-mono text-black/18 dark:text-[#e8dece]/18 mt-3">
            â†‘ simulated call Â· peek â†’ mesh â†’ silk â†’ action â†’ resolution
          </p>
        </Reveal>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• ENTERPRISE â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="px-6 md:px-10 py-24 border-t border-black/[0.06] dark:border-[#e8dece]/[0.06]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <p className="text-[10px] font-mono text-black/28 dark:text-[#e8dece]/28 uppercase tracking-widest mb-4">/ enterprise /</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
                built for scale.<br />
                <span className="text-black/22 dark:text-[#e8dece]/22">deployed in 48 hours.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="text-[15px] text-black/42 dark:text-[#e8dece]/42 leading-relaxed mb-10">
                Multi-tenant infrastructure. Your data stays yours, isolated at row level.
                Connect your own database so agents look up real orders and process real refunds.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <MagneticButton className="inline-block">
                <Link href="/register"
                  className="inline-flex items-center gap-2
                    bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#09090A]
                    px-7 py-3 rounded-full text-sm font-semibold hover:opacity-80 transition-opacity">
                  request enterprise access <ArrowUpRight size={13} />
                </Link>
              </MagneticButton>
            </Reveal>
          </div>

          <Stagger className="space-y-0" stagger={0.07} delay={0.2}>
            {[
              "multi-tenant Â· rls-isolated per client",
              "hinglish, hindi, tamil, telugu + 8 more",
              "connects to your crm, database, or rest api",
              "deploy in 48 hours Â· no infrastructure overhead",
              "full call analysis Â· empathy heatmaps Â· a/b testing",
              "soc 2 ready Â· data never leaves your region",
            ].map((item, i) => (
              <StaggerItem key={i}>
                <div className="flex items-center gap-4 px-5 py-4
                  border-b border-black/[0.055] dark:border-[#e8dece]/[0.055]
                  hover:bg-black/[0.018] dark:hover:bg-[#e8dece]/[0.018] transition-colors">
                  <span className="text-black/18 dark:text-[#e8dece]/18 text-sm flex-shrink-0">âœ“</span>
                  <p className="text-[13px] text-black/52 dark:text-[#e8dece]/52 font-mono">{item}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• FINAL CTA â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section className="relative px-6 py-32 overflow-hidden">
        <div className="max-w-2xl mx-auto text-center">
          <Reveal>
            <p className="text-[10px] font-mono text-black/22 dark:text-[#e8dece]/22 uppercase tracking-widest mb-6">/ get access /</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              ready to resolve<br />
              <span className="text-black/20 dark:text-[#e8dece]/20">with empathy?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="text-[15px] text-black/38 dark:text-[#e8dece]/38 mb-12 leading-relaxed max-w-sm mx-auto">
              Set up in 48 hours. No infrastructure. Per-minute billing. Every call remembered.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <MagneticButton>
                <Link href="/register"
                  className="flex items-center justify-center gap-2
                    bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#09090A]
                    px-10 py-4 rounded-full text-sm font-semibold hover:opacity-80 transition-opacity">
                  create your account <ArrowRight size={14} />
                </Link>
              </MagneticButton>
              <MagneticButton>
                <Link href="/login"
                  className="flex items-center justify-center gap-2
                    border border-black/14 dark:border-[#e8dece]/14
                    px-10 py-4 rounded-full text-sm
                    text-black/38 dark:text-[#e8dece]/38
                    hover:border-black/32 dark:hover:border-[#e8dece]/32
                    hover:text-black/70 dark:hover:text-[#e8dece]/70 transition-all">
                  sign in to dashboard
                </Link>
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• FOOTER â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <footer className="border-t border-black/[0.055] dark:border-[#e8dece]/[0.055] px-6 md:px-10 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" textClassName="text-sm" />
            <span className="text-[10px] font-mono text-black/18 dark:text-[#e8dece]/18 ml-1">/ enterprise voice infrastructure /</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: "use cases", href: "/use-cases" },
              { label: "sign in", href: "/login" },
              { label: "get access", href: "/register" },
            ].map(({ label, href }) => (
              <Link key={label} href={href}
                className="text-[11px] font-mono text-black/25 dark:text-[#e8dece]/25
                  hover:text-black/55 dark:hover:text-[#e8dece]/55 transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <p className="text-[10px] font-mono text-black/18 dark:text-[#e8dece]/18">
            &copy; 2026 silk resolve
          </p>
        </div>
      </footer>
    </div>
  );
}

