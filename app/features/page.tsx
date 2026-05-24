"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mic, Brain, Zap, Globe2, BarChart2, FlaskConical,
  Plug, ShieldCheck, ArrowRight,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";

/* ────────────────────────────────────────────────────────────
   DATA
──────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Mic,
    tag: "voice intelligence",
    title: "Prosody & Emotion Analysis",
    body:
      "Detect tone, stress, hesitation, and emotional state in real time — not from transcripts, but from the actual audio signal. Know when a caller is frustrated before they say the word.",
    stat: "< 180 ms",
    statLabel: "latency",
  },
  {
    icon: Brain,
    tag: "memory",
    title: "Memory Mesh",
    body:
      "Agents that remember. Every interaction, preference, and complaint is encoded into a persistent memory graph. Callers never repeat themselves. Context is instant.",
    stat: "∞",
    statLabel: "call history",
  },
  {
    icon: Zap,
    tag: "intent detection",
    title: "Intent Peek",
    body:
      "Surface what a caller needs before they finish the sentence. Trained on 600M+ enterprise call transcripts across industries — the model predicts, routes, and prepares before the human speaks.",
    stat: "94 %",
    statLabel: "intent accuracy",
  },
  {
    icon: Globe2,
    tag: "multilingual",
    title: "40+ Languages",
    body:
      "Not just translation. Cultural prosody calibration means the model understands that silence means different things in Tokyo vs. São Paulo. Nuance travels with the voice.",
    stat: "40 +",
    statLabel: "languages",
  },
  {
    icon: BarChart2,
    tag: "analytics",
    title: "Live Call Intelligence",
    body:
      "Real-time dashboards tracking sentiment drift, silence ratios, call resolution probability, and agent assist triggers — all piped back to your existing BI stack via webhook or query API.",
    stat: "< 2 s",
    statLabel: "dashboard lag",
  },
  {
    icon: FlaskConical,
    tag: "experimentation",
    title: "Script A/B Testing",
    body:
      "Run controlled experiments on call scripts at scale. Track resolution rate, handle time, and CSAT delta across cohorts — then ship the winning variant with a single toggle.",
    stat: "∞",
    statLabel: "variants",
  },
  {
    icon: Plug,
    tag: "infrastructure",
    title: "API-First by Design",
    body:
      "REST and WebSocket APIs. Native connectors for Salesforce, HubSpot, Zendesk, Genesys, Five9, Twilio, and AWS Connect. If it has an API, Silk plugs in.",
    stat: "99.99 %",
    statLabel: "uptime SLA",
  },
  {
    icon: ShieldCheck,
    tag: "compliance",
    title: "Enterprise Security",
    body:
      "SOC 2 Type II, HIPAA BAA, ISO 27001, PCI-DSS. Data residency by region. No audio stored by default. Zero-retention mode available on Scale and Enterprise plans.",
    stat: "0",
    statLabel: "retained by default",
  },
];

const DEMO_METRICS = [
  { value: "600 M+", label: "training calls" },
  { value: "< 180 ms", label: "voice latency" },
  { value: "94 %", label: "intent accuracy" },
  { value: "99.99 %", label: "uptime SLA" },
];

/* ────────────────────────────────────────────────────────────
   FEATURE CARD
──────────────────────────────────────────────────────────── */
function FeatureCard({ feature }: { feature: typeof FEATURES[0] }) {
  const Icon = feature.icon;
  return (
    <motion.div
      className="relative border border-black/[0.09] dark:border-[#e8dece]/[0.09]
        bg-white/40 dark:bg-[#e8dece]/[0.025] backdrop-blur-sm p-7 group
        hover:border-black/20 dark:hover:border-[#e8dece]/20 transition-all duration-300"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25 }}
    >
      {/* Tag */}
      <p className="text-[9px] font-mono uppercase tracking-widest mb-4
        text-black/30 dark:text-[#e8dece]/30">
        {feature.tag}
      </p>

      {/* Icon + title */}
      <div className="flex items-start gap-3 mb-3">
        <div className="mt-0.5 w-8 h-8 flex items-center justify-center flex-shrink-0
          border border-black/10 dark:border-[#e8dece]/10
          bg-black/[0.03] dark:bg-[#e8dece]/[0.04]">
          <Icon size={15} strokeWidth={1.5} className="text-black/60 dark:text-[#e8dece]/60" />
        </div>
        <h3 className="text-[15px] font-semibold leading-snug tracking-tight">{feature.title}</h3>
      </div>

      {/* Body */}
      <p className="text-[13px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed mb-6">
        {feature.body}
      </p>

      {/* Stat */}
      <div className="flex items-end gap-2 pt-4 border-t border-black/[0.06] dark:border-[#e8dece]/[0.06]">
        <span className="text-xl font-bold font-mono leading-none">{feature.stat}</span>
        <span className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35 mb-0.5">
          {feature.statLabel}
        </span>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────── */
export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F6F1E9] dark:bg-[#09090A] dot-pattern">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[10px] font-mono uppercase tracking-widest text-black/35 dark:text-[#e8dece]/35 mb-5">
            / capabilities /
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            built for how<br />
            <span className="text-black/25 dark:text-[#e8dece]/25">voice actually works.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-base text-black/45 dark:text-[#e8dece]/45 max-w-lg leading-relaxed">
            Every feature ships as a single API surface. Mix, match, and integrate
            with the stack you already run — no rip-and-replace required.
          </p>
        </Reveal>

        {/* Metric bar */}
        <Reveal delay={0.24} className="mt-12">
          <div className="flex flex-wrap gap-px border border-black/[0.08] dark:border-[#e8dece]/[0.08]">
            {DEMO_METRICS.map(({ value, label }) => (
              <div key={label} className="flex-1 min-w-[120px] px-6 py-5
                bg-white/50 dark:bg-[#e8dece]/[0.03] border-r border-black/[0.06] dark:border-[#e8dece]/[0.06]
                last:border-r-0">
                <p className="text-xl font-bold font-mono leading-none mb-1">{value}</p>
                <p className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Features grid */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" stagger={0.07}>
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <FeatureCard feature={f} />
            </StaggerItem>
          ))}
          {/* CTA card */}
          <StaggerItem>
            <motion.div
              className="border border-black dark:border-[#e8dece]/30
                bg-black dark:bg-[#e8dece]
                p-7 flex flex-col justify-between min-h-[280px]"
              whileHover={{ y: -3 }}
              transition={{ duration: 0.25 }}
            >
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest mb-4 text-[#e8dece]/40 dark:text-[#0a0908]/40">
                  / get started /
                </p>
                <h3 className="text-2xl font-bold text-[#e8dece] dark:text-[#0a0908] leading-snug mb-3">
                  See all of this.<br />Live.
                </h3>
                <p className="text-sm text-[#e8dece]/55 dark:text-[#0a0908]/55 leading-relaxed">
                  Book a 30-minute call and watch Silk Resolve handle a real call from your industry.
                </p>
              </div>
              <Link
                href="/register"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold
                  text-[#e8dece] dark:text-[#0a0908] group"
              >
                book demo
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Architecture callout */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Reveal>
          <div className="border border-black/[0.09] dark:border-[#e8dece]/[0.09]
            bg-white/40 dark:bg-[#e8dece]/[0.02] p-10 md:p-14">
            <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-6">
              / architecture /
            </p>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                  One SDK.<br />
                  <span className="text-black/30 dark:text-[#e8dece]/30">Everything connects.</span>
                </h2>
                <p className="text-sm text-black/45 dark:text-[#e8dece]/45 leading-relaxed mb-6">
                  The Silk SDK ships in Python, Node, and Go. All eight capability modules behind
                  one import. Instrument your stack once and swap or upgrade features without touching
                  your codebase.
                </p>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 text-sm font-semibold group"
                >
                  read the docs
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              {/* Pseudo code block */}
              <div className="border border-black/[0.08] dark:border-[#e8dece]/[0.08]
                bg-black/[0.03] dark:bg-[#e8dece]/[0.03] p-6 font-mono text-xs leading-7
                text-black/60 dark:text-[#e8dece]/55 overflow-x-auto">
                <p className="text-black/30 dark:text-[#e8dece]/30"># one install</p>
                <p><span className="text-black/50 dark:text-[#e8dece]/50">pip install </span>silk-resolve</p>
                <br />
                <p className="text-black/30 dark:text-[#e8dece]/30"># one client</p>
                <p><span className="text-black/50 dark:text-[#e8dece]/50">from </span>silk <span className="text-black/50 dark:text-[#e8dece]/50">import </span>Resolve</p>
                <p>sr = Resolve(api_key=<span className="text-black/70 dark:text-[#e8dece]/70">"sk-..."</span>)</p>
                <br />
                <p className="text-black/30 dark:text-[#e8dece]/30"># stream a call</p>
                <p>sr.stream(call_id, on_intent=handler)</p>
                <br />
                <p className="text-black/30 dark:text-[#e8dece]/30"># get memory</p>
                <p>ctx = sr.memory.get(caller_id)</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
