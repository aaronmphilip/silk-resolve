"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mic, Brain, Zap, Globe2, BarChart2, FlaskConical, Plug, ShieldCheck } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";

/* ─────────────────────────────────────────────────────────────────
   THE OPPORTUNITY
───────────────────────────────────────────────────────────────── */
const MARKET_STATS = [
  { value: "$280B+",  label: "spent on enterprise customer service annually" },
  { value: "17M",     label: "contact center agents globally" },
  { value: "65 %",    label: "of enterprise interactions still happen by voice" },
  { value: "40 %",    label: "of agent time spent on tasks AI can do better" },
];

/* ─────────────────────────────────────────────────────────────────
   CAPABILITIES — each one anchored to a dollar outcome
───────────────────────────────────────────────────────────────── */
const CAPABILITIES = [
  {
    icon: Mic,
    tag: "voice · silk",
    name: "Prosody Intelligence",
    what: "Real-time detection of tone, stress, hesitation, and emotional temperature — from the audio signal, not the transcript. The model knows a caller is frustrated before they use the word.",
    why: "Agents who understand emotional state resolve calls 34% faster and receive CSAT scores 2.1× higher. At 10,000 calls/day, that is $2.4M/year recovered in agent capacity alone.",
    metric: "< 180 ms",
    metricLabel: "detection latency",
    roiLabel: "$2.4M / yr",
    roiNote: "per 500-agent center at 10K calls/day",
  },
  {
    icon: Brain,
    tag: "memory · mesh",
    name: "Memory Mesh",
    what: "A persistent emotional and operational memory graph per caller. Every complaint, preference, and unresolved issue is carried forward. The caller never repeats themselves. The agent always knows.",
    why: "Repeat-call rate is the silent killer of contact center economics. Eliminating it for 30% of callers — which Mesh does — saves an average of $1.8M/year in unnecessary repeat handling costs.",
    metric: "0",
    metricLabel: "\"can you repeat that?\"",
    roiLabel: "$1.8M / yr",
    roiNote: "eliminated repeat-call handling cost",
  },
  {
    icon: Zap,
    tag: "context · peek",
    name: "Intent Peek",
    what: "Surfaces what a caller needs before they finish the sentence. Trained on 600M+ enterprise call transcripts. The model predicts intent, pre-routes, and primes the agent — all before the second exchange.",
    why: "Correct first routing eliminates 91% of transfers. Every unnecessary transfer costs 4–7 minutes of dual agent time. At scale, fixing routing is worth $3.1M/year in recovered hours.",
    metric: "94 %",
    metricLabel: "first-routing accuracy",
    roiLabel: "$3.1M / yr",
    roiNote: "recovered from eliminated transfers",
  },
  {
    icon: Globe2,
    tag: "language · global",
    name: "40+ Language Intelligence",
    what: "Not translation. Cultural prosody calibration — silence means different things in Tokyo vs São Paulo. The model understands what is not said, in the language it was not said in.",
    why: "Multilingual callers who are routed incorrectly abandon at 58%. Silk's auto-detect brings that to 9%. For a 500-seat center handling 20% multilingual traffic, that recovers $900K/year in abandonment revenue.",
    metric: "40 +",
    metricLabel: "languages, zero IVR menus",
    roiLabel: "$900K / yr",
    roiNote: "recovered from multilingual abandonment",
  },
  {
    icon: BarChart2,
    tag: "analytics · live",
    name: "Real-Time Intelligence Dashboard",
    what: "Sentiment drift, silence ratios, resolution probability, and escalation risk — all streamed live. QA teams see what is happening on every call, not in yesterday's report.",
    why: "Live intervention on at-risk calls — flagged by Silk before the caller raises their voice — reduces escalations by 47%. Each prevented escalation saves 18 minutes of supervisor time.",
    metric: "< 2 s",
    metricLabel: "lag from call event to dashboard",
    roiLabel: "47 %",
    roiNote: "escalation reduction, live",
  },
  {
    icon: FlaskConical,
    tag: "experimentation · ab",
    name: "Script A/B Engine",
    what: "Run statistically rigorous experiments on call scripts at enterprise scale. Track resolution rate, handle time, and CSAT delta per variant. Ship winners with a toggle. Kill losers the same way.",
    why: "Teams that run 4+ script experiments per quarter see 22% higher annual CSAT improvement than teams that don't. The compounding effect over 3 years is worth more than any single feature.",
    metric: "∞",
    metricLabel: "concurrent variants",
    roiLabel: "22 %",
    roiNote: "higher CSAT growth for teams that test",
  },
  {
    icon: Plug,
    tag: "infrastructure · api",
    name: "API-First by Design",
    what: "REST and WebSocket APIs. Native connectors for Salesforce, HubSpot, Zendesk, Genesys, Five9, Twilio, AWS Connect. Silk plugs into the stack you already run. No rip-and-replace.",
    why: "Time-to-value is everything in enterprise. Silk deploys in 48 hours. Teams that can show ROI in month one retain their AI budgets. Teams that can't, don't.",
    metric: "48 hrs",
    metricLabel: "average deployment time",
    roiLabel: "48 hrs",
    roiNote: "to first live call, any stack",
  },
  {
    icon: ShieldCheck,
    tag: "compliance · trust",
    name: "Enterprise-Grade Security",
    what: "SOC 2 Type II, HIPAA BAA, ISO 27001, PCI-DSS auto-redaction. Data residency by region. Zero audio retention by default. Audit logs on every action. No exceptions.",
    why: "Healthcare, financial services, and government cannot touch AI that is not compliant. These verticals represent 58% of enterprise voice volume. Compliance is not a feature — it is the door.",
    metric: "0",
    metricLabel: "audio retained by default",
    roiLabel: "58 %",
    roiNote: "of enterprise voice unlocked",
  },
];

/* ─────────────────────────────────────────────────────────────────
   THE VISION
───────────────────────────────────────────────────────────────── */
const VISION_STEPS = [
  {
    year: "2025",
    title: "The Enterprise Layer",
    desc: "Silk Resolve becomes the enterprise deployment infrastructure for human-quality voice AI. Any contact center. Any stack. Deployed in 48 hours.",
  },
  {
    year: "2026",
    title: "The Intelligence Network",
    desc: "Memory Mesh spans across tenants. Anonymised emotional intelligence from 100M+ calls per month shapes a model that gets smarter with every conversation on the network.",
  },
  {
    year: "2027",
    title: "The Autonomous Agent",
    desc: "Silk agents operate at Level 4 autonomy — handling the full call lifecycle, booking, refunding, escalating and closing, without a human in the loop unless the caller asks.",
  },
  {
    year: "2030",
    title: "The Standard",
    desc: "Every enterprise voice interaction in the world runs on infrastructure built on top of Rumik's voice model and Silk's intelligence layer. One standard. Every language. Every industry.",
  },
];

/* ─────────────────────────────────────────────────────────────────
   CAPABILITY CARD
───────────────────────────────────────────────────────────────── */
function CapabilityCard({ cap }: { cap: typeof CAPABILITIES[0] }) {
  const Icon = cap.icon;
  return (
    <motion.div
      className="border border-black/[0.09] dark:border-[#e8dece]/[0.09] bg-white/35 dark:bg-[#e8dece]/[0.02] p-8 flex flex-col gap-5 group hover:border-black/18 dark:hover:border-[#e8dece]/18 transition-all duration-300"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
    >
      {/* Tag + icon */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-widest text-black/28 dark:text-[#e8dece]/28">
          {cap.tag}
        </span>
        <div className="w-7 h-7 border border-black/10 dark:border-[#e8dece]/10 flex items-center justify-center">
          <Icon size={13} strokeWidth={1.5} className="text-black/50 dark:text-[#e8dece]/50" />
        </div>
      </div>

      {/* Name */}
      <h3 className="text-[17px] font-bold tracking-tight leading-snug">{cap.name}</h3>

      {/* What */}
      <p className="text-[13px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed">{cap.what}</p>

      {/* Divider */}
      <div className="border-t border-black/[0.06] dark:border-[#e8dece]/[0.06] pt-5 mt-auto space-y-4">
        {/* Why it matters */}
        <p className="text-[12px] text-black/40 dark:text-[#e8dece]/40 leading-relaxed italic">
          {cap.why}
        </p>
        {/* Stats row */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-mono font-bold">{cap.metric}</p>
            <p className="text-[9px] font-mono text-black/28 dark:text-[#e8dece]/28">{cap.metricLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono font-bold text-black dark:text-[#e8dece]">{cap.roiLabel}</p>
            <p className="text-[9px] font-mono text-black/28 dark:text-[#e8dece]/28">{cap.roiNote}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#ECE7D3] dark:bg-[#09090A] dot-pattern">
      <MarketingNav />

      {/* ── HERO ── */}
      <section className="pt-36 pb-20 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-6">
            / capabilities /
          </p>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-12 items-end mb-16">
          <Reveal delay={0.06}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.04]">
              The problem<br />
              <span className="text-black/22 dark:text-[#e8dece]/22">is $280 billion.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="space-y-4">
              <p className="text-[15px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                Enterprise customer service is the largest untouched AI opportunity in existence.
                $280B+ spent annually. 17 million agents globally. 65% of interactions still
                handled over the phone. 40% of agent time spent on tasks a well-trained AI
                can do in milliseconds.
              </p>
              <p className="text-[15px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                The AI model exists. Rumik built it. What the market has been missing is
                the enterprise infrastructure to deploy it at scale — with memory, compliance,
                real-time integration, and measurable ROI on day one.
              </p>
              <p className="text-[14px] font-semibold text-black dark:text-[#e8dece]">
                That is what Silk Resolve is.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Market stats */}
        <Reveal delay={0.2}>
          <div className="grid grid-cols-2 md:grid-cols-4 border border-black/[0.08] dark:border-[#e8dece]/[0.08]">
            {MARKET_STATS.map(({ value, label }, i) => (
              <div key={label}
                className="px-6 py-6 border-r border-b md:border-b-0 border-black/[0.06] dark:border-[#e8dece]/[0.06] last:border-r-0">
                <p className="text-2xl md:text-3xl font-bold font-mono mb-1">{value}</p>
                <p className="text-[10px] font-mono text-black/35 dark:text-[#e8dece]/35 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── CAPABILITIES ── */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-28">
        <Reveal className="mb-10">
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-3">
            / eight capabilities. one platform. /
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Every feature is an ROI line item.
          </h2>
        </Reveal>

        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" stagger={0.07}>
          {CAPABILITIES.map(cap => (
            <StaggerItem key={cap.name}>
              <CapabilityCard cap={cap} />
            </StaggerItem>
          ))}

          {/* The math card */}
          <StaggerItem>
            <motion.div
              className="border border-black dark:border-[#e8dece]/40 bg-[#0A0908] dark:bg-[#e8dece] p-8 flex flex-col justify-between min-h-[360px]"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.22 }}
            >
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#ECE7D3]/35 dark:text-[#0A0908]/35 mb-4">
                  / the math /
                </p>
                <h3 className="text-xl font-bold text-[#ECE7D3] dark:text-[#0A0908] mb-4 leading-snug">
                  A 500-seat center.<br />
                  What Silk is worth.
                </h3>
                <div className="space-y-3 font-mono text-xs">
                  {[
                    ["handle time saved",    "34s/call",    "$2.4M/yr"],
                    ["repeat calls removed", "30% reduction","$1.8M/yr"],
                    ["transfers eliminated", "91% accuracy", "$3.1M/yr"],
                    ["churn recovered",      "22% lift",     "$4.2M/yr"],
                  ].map(([label, metric, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-[#ECE7D3]/45 dark:text-[#0A0908]/45">{label}</span>
                      <span className="text-[#ECE7D3]/55 dark:text-[#0A0908]/55">{metric}</span>
                      <span className="text-[#ECE7D3] dark:text-[#0A0908] font-bold">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#ECE7D3]/12 dark:border-[#0A0908]/12 pt-3 flex items-center justify-between">
                    <span className="text-[#ECE7D3]/60 dark:text-[#0A0908]/60">total annual value</span>
                    <span className="text-[#ECE7D3] dark:text-[#0A0908] font-bold text-sm">$11.5M / yr</span>
                  </div>
                </div>
              </div>
              <Link href="/register"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#ECE7D3] dark:text-[#0A0908] group">
                see your ROI estimate
                <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* ── THE STACK ── */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-28">
        <Reveal>
          <div className="border border-black/[0.09] dark:border-[#e8dece]/[0.09] bg-white/30 dark:bg-[#e8dece]/[0.02] p-10 md:p-14">
            <div className="grid md:grid-cols-2 gap-14 items-center">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-black/28 dark:text-[#e8dece]/28 mb-5">
                  / the stack /
                </p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-snug mb-5">
                  Rumik's voice.<br />
                  <span className="text-black/28 dark:text-[#e8dece]/28">Silk's intelligence.</span>
                </h2>
                <p className="text-[14px] text-black/48 dark:text-[#e8dece]/48 leading-relaxed mb-5">
                  Rumik built the most human voice AI in existence. Silk Resolve is the
                  enterprise intelligence layer that deploys it — adding persistent memory,
                  real-time intent detection, compliance infrastructure, and deep CRM integration
                  to every call.
                </p>
                <p className="text-[14px] text-black/48 dark:text-[#e8dece]/48 leading-relaxed mb-8">
                  Together: a complete enterprise voice AI that sounds human, remembers everything,
                  understands intent, integrates with any stack, and generates measurable ROI
                  from the first call.
                </p>
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-[#0A0908] dark:bg-[#e8dece] text-[#ECE7D3] dark:text-[#0A0908] hover:opacity-80 transition-opacity group">
                  book a live demo
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Stack diagram */}
              <div className="space-y-2 font-mono text-xs">
                {[
                  { layer: "01", name: "Rumik SILK Voice Model", desc: "prosody · emotion · 40+ languages · < 180ms", dark: true },
                  { layer: "02", name: "Silk Intent Peek",       desc: "real-time intent · routing · pre-resolution", dark: false },
                  { layer: "03", name: "Silk Memory Mesh",       desc: "persistent caller graph · emotional debt · context", dark: false },
                  { layer: "04", name: "Silk Analytics",         desc: "live dashboards · CSAT · resolution rate · QA", dark: false },
                  { layer: "05", name: "Your Stack",             desc: "Salesforce · Twilio · Genesys · any REST API", dark: false },
                ].map(({ layer, name, desc, dark }) => (
                  <div key={layer}
                    className={`px-5 py-4 border flex items-center gap-5 ${
                      dark
                        ? "bg-[#0A0908] dark:bg-[#e8dece] border-black/80 dark:border-[#e8dece]/80"
                        : "bg-black/[0.03] dark:bg-[#e8dece]/[0.03] border-black/[0.08] dark:border-[#e8dece]/[0.08]"
                    }`}>
                    <span className={`text-[9px] flex-shrink-0 ${dark ? "text-[#ECE7D3]/35 dark:text-[#0A0908]/35" : "text-black/22 dark:text-[#e8dece]/22"}`}>
                      {layer}
                    </span>
                    <div>
                      <p className={`font-semibold text-[11px] mb-0.5 ${dark ? "text-[#ECE7D3] dark:text-[#0A0908]" : ""}`}>
                        {name}
                      </p>
                      <p className={`text-[10px] ${dark ? "text-[#ECE7D3]/40 dark:text-[#0A0908]/40" : "text-black/30 dark:text-[#e8dece]/30"}`}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── THE VISION ── */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-28">
        <Reveal className="mb-10">
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/28 dark:text-[#e8dece]/28 mb-3">
            / the vision /
          </p>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-snug">
            Where this ends up.
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {VISION_STEPS.map((step, i) => (
            <Reveal key={step.year} delay={i * 0.08}>
              <div className="border border-black/[0.09] dark:border-[#e8dece]/[0.09] bg-white/30 dark:bg-[#e8dece]/[0.02] p-6 h-full">
                <p className="text-3xl font-bold font-mono mb-3 text-black/15 dark:text-[#e8dece]/15">{step.year}</p>
                <p className="text-sm font-bold mb-3">{step.title}</p>
                <p className="text-[12.5px] text-black/45 dark:text-[#e8dece]/45 leading-relaxed">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-28">
        <Reveal>
          <div className="bg-[#0A0908] dark:bg-[#e8dece] p-10 md:p-16 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-[#ECE7D3]/30 dark:text-[#0A0908]/30 mb-5">
                / ready /
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#ECE7D3] dark:text-[#0A0908] tracking-tight leading-snug mb-4">
                See it live.<br />In your industry.<br />On your data.
              </h2>
              <p className="text-[14px] text-[#ECE7D3]/50 dark:text-[#0A0908]/50 leading-relaxed">
                30 minutes. We run a live call from your sector, show you the real-time
                intelligence layer firing, and model your specific ROI. No slides.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-sm font-semibold bg-[#ECE7D3] dark:bg-[#0A0908] text-[#0A0908] dark:text-[#ECE7D3] hover:opacity-85 transition-opacity group">
                book a demo
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/use-cases"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-sm font-semibold border border-[#ECE7D3]/20 dark:border-[#0A0908]/20 text-[#ECE7D3]/60 dark:text-[#0A0908]/60 hover:border-[#ECE7D3]/40 dark:hover:border-[#0A0908]/40 transition-colors">
                see use cases by industry
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
