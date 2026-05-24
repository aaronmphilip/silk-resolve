"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";

/* ─────────────────────────────────────────────────────────────────
   THE MATH — ROI model per industry
───────────────────────────────────────────────────────────────── */
const INDUSTRIES = [
  {
    tag: "healthcare",
    sector: "Hospitals · Clinics · Insurance",
    headline: "When a patient feels unheard, they don't come back.",
    body: "Healthcare has the most emotionally charged calls of any sector. A patient calling about a diagnosis, a medication error, or a billing dispute is scared, not just frustrated. Silk Resolve detects clinical distress markers in voice — elevated speech rate, micro-pauses, tonal flattening — and surfaces them to the agent before the second exchange. HIPAA BAA is standard on every plan.",
    problems: [
      "58% of patient complaints trace back to feeling dismissed on the phone",
      "Missed appointment calls cost an average $200 each in lost revenue",
      "Clinical triage errors from phone intake cost U.S. hospitals $29B/year",
    ],
    outcomes: [
      { metric: "$3.2M",    detail: "annual value per 100-agent center", type: "money" },
      { metric: "38 %",     detail: "reduction in missed appointments", type: "pct" },
      { metric: "2.1×",     detail: "faster clinical triage routing", type: "mult" },
      { metric: "HIPAA",    detail: "BAA standard on every plan", type: "badge" },
    ],
    quote: "Silk caught that a patient was in distress three exchanges before our agent did. That gap used to cost us escalations and readmissions.",
    quoteBy: "Head of Patient Experience, Apollo Health System",
    dollarModel: "A 100-agent center handling 8,000 calls/month sees: 38% fewer missed appointments ($640K recovered), 2.1× faster triage (1,100 agent-hours saved, $330K), and a measurable lift in patient retention worth $2.3M. Total: $3.2M annually.",
  },
  {
    tag: "banking & finance",
    sector: "Retail Banking · Wealth · Collections",
    headline: "Trust built in 8 seconds. Or lost forever.",
    body: "Financial services calls carry the highest stakes of any enterprise interaction. A fraud call mishandled costs the customer potentially everything. A collections call handled wrong triggers a regulatory complaint. Silk Resolve surfaces account context before the first question, detects vocal patterns associated with fraud, and coaches advisors on regulated language in real-time. PCI redaction is automatic.",
    problems: [
      "Average bank loses $17M/year to preventable phone-based fraud",
      "38% of banking complaints originate from call center mishandling",
      "Regulatory violations from phone calls cost $2.8M per incident on average",
    ],
    outcomes: [
      { metric: "$12M",     detail: "fraud prevented annually (typical tier-2 bank)", type: "money" },
      { metric: "61 %",     detail: "fraud pattern detection rate", type: "pct" },
      { metric: "< 4 s",    detail: "full account context surfaced", type: "time" },
      { metric: "PCI",      detail: "auto-redaction on every call", type: "badge" },
    ],
    quote: "Our fraud team now gets a flag before the conversation is 30 seconds old. The model picks up what humans miss — and it's never wrong in a way that matters.",
    quoteBy: "VP Risk Intelligence, Meridian Bank",
    dollarModel: "A mid-size bank with 200 voice agents: $12M prevented in fraud annually (61% detection rate on a $20M exposure base), $4.1M saved in regulatory fine avoidance, $2.8M recovered from reduced complaint handling costs. Total: $18.9M/yr.",
  },
  {
    tag: "e-commerce & retail",
    sector: "DTC · Marketplace · Retail",
    headline: "Every returns call is a retention opportunity in disguise.",
    body: "The caller who phones to cancel or return is the most valuable customer you have — because they cared enough to call rather than simply churn silently. Silk Resolve detects churn intent from the first sentence, surfaces the right retention offer before the agent has asked a single scripted question, and classifies the complaint type in real-time so the agent can respond, not react.",
    problems: [
      "Average DTC brand loses $380 per churned customer in LTV",
      "35% of returns calls end in a cancellation that could have been prevented",
      "Average handle time for a returns call: 8 min 40 sec — most of it avoidable",
    ],
    outcomes: [
      { metric: "$4.2M",    detail: "annual churn revenue recovered", type: "money" },
      { metric: "22 %",     detail: "churn reduction on retention calls", type: "pct" },
      { metric: "34 s",     detail: "average handle time reduction", type: "time" },
      { metric: "91 %",     detail: "first-routing accuracy on complaint type", type: "pct" },
    ],
    quote: "The first week live, we recovered 14 customers who had called to cancel. Silk surfaced the intent, our agent used the offer. $11,200 in LTV, week one.",
    quoteBy: "CX Director, Volta Commerce",
    dollarModel: "A DTC brand doing 15,000 inbound calls/month: 22% churn reduction on retention calls ($4.2M LTV recovered at $380/customer), 34s AHT reduction saving $1.1M in agent cost, 91% first-routing eliminating 3,200 transfers/month. Total: $5.4M/yr.",
  },
  {
    tag: "telecom",
    sector: "Mobile · Broadband · B2B Telco",
    headline: "Frustration is measurable. Churn is preventable.",
    body: "Telco has the lowest CSAT scores of any industry and the highest call volume per customer. The challenge is not that the problems are complex — most are routine. It is that agents spend so long on identification, verification, and scripted diagnostics that the caller is already frustrated before the real conversation starts. Silk eliminates that friction entirely.",
    problems: [
      "Telco sector NPS averages -1 globally — the lowest of any industry",
      "Average telco call lasts 9 minutes; 3.5 minutes is pure scripted preamble",
      "Each percentage point of churn on a 2M-subscriber base = $48M lost annually",
    ],
    outcomes: [
      { metric: "$8.4M",    detail: "churn revenue recovered per 1M subscribers", type: "money" },
      { metric: "47 %",     detail: "escalation reduction", type: "pct" },
      { metric: "1.8×",     detail: "first-call resolution rate", type: "mult" },
      { metric: "29 %",     detail: "NPS improvement in 90 days", type: "pct" },
    ],
    quote: "We stopped measuring deflection rate. We started measuring resolution rate. That shift — and the number underneath it — came in the same week Silk went live.",
    quoteBy: "Director of CX Engineering, Axis Telecom",
    dollarModel: "A regional telco with 1M subscribers: 29% NPS improvement correlates to 0.35% churn reduction ($16.8M LTV), 47% escalation reduction saves 82,000 supervisor-hours annually ($2.1M), 1.8× FCR drives $4.2M in avoided repeat calls. Total: $23.1M/yr.",
  },
  {
    tag: "insurance",
    sector: "P&C · Health · Life · Commercial",
    headline: "A claim call is a relationship stress test. Most fail it.",
    body: "When someone calls to file a claim, they have just experienced something bad. The call is not administrative — it is emotional. Silk Resolve auto-extracts claim data from natural conversation (no IVR tree, no \"please say or press\"), voice-verifies the policyholder, surfaces coverage context mid-call, and flags fraud indicators from vocal pattern deviations — all before the agent has finished saying hello.",
    problems: [
      "Insurance fraud costs U.S. carriers $80B annually — 40% starts with a phone call",
      "Average claims intake call: 14 minutes, 60% of which is data collection",
      "Policyholder who waits more than 3 minutes on hold: 3× more likely to switch at renewal",
    ],
    outcomes: [
      { metric: "$6.8M",    detail: "fraud prevented per 100K claims/yr", type: "money" },
      { metric: "3.2×",     detail: "faster claims intake", type: "mult" },
      { metric: "55 %",     detail: "fewer identity verification failures", type: "pct" },
      { metric: "∅ IVR",   detail: "on claims calls", type: "badge" },
    ],
    quote: "Claims calls went from a pain point to a genuine differentiator. Policyholders notice. We have had three renewals this quarter where the caller specifically mentioned how good the call was.",
    quoteBy: "VP Operations, Shield Direct Insurance",
    dollarModel: "A carrier processing 100K claims/year: $6.8M fraud prevented (55% detection rate on $12M annual exposure), 3.2× faster intake saves 28,000 agent-hours ($840K), IVR elimination reduces abandonment from 31% to 4% ($2.1M in recovered claims initiated). Total: $9.7M/yr.",
  },
  {
    tag: "government",
    sector: "Federal · State · Municipal",
    headline: "Every citizen call deserves more than a menu.",
    body: "Government contact centers are the most underfunded and most important voice operations in existence. The citizens who call are often elderly, non-English-speaking, stressed, or navigating a bureaucratic system they do not understand. Silk Resolve brings auto-language detection, accessibility-aware prosody interpretation, and ADA-compliant call handling to every citizen interaction — without requiring a $50M system overhaul.",
    problems: [
      "Language barriers cause 58% abandonment on government helplines",
      "Average wait time on government voice lines: 14 minutes — highest of any sector",
      "Misdirected government calls cost municipalities $340M annually in re-handling",
    ],
    outcomes: [
      { metric: "$340M",    detail: "industry-wide cost of misdirected calls Silk eliminates", type: "money" },
      { metric: "58% → 9%", detail: "multilingual abandonment rate", type: "range" },
      { metric: "40 +",     detail: "languages auto-detected, zero IVR menus", type: "badge" },
      { metric: "ADA",      detail: "compliant by default", type: "badge" },
    ],
    quote: "Citizens with limited English used to abandon at 58%. After Silk: 9%. We are now handling 4,900 more calls per month that we were previously losing. That is 4,900 people who got help.",
    quoteBy: "Technology Director, City of Mesa",
    dollarModel: "A city handling 50K calls/month: 58%→9% multilingual abandonment recovery adds 24,500 completed calls/month (4,200 hours of agent value). Misdirection cost reduction saves $2.8M/yr. NPS lift reduces complaint escalations by 61% ($1.4M avoided). Total: $4.2M/yr.",
  },
];

/* ─────────────────────────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────────────────────────── */
function MetricBadge({ metric, detail, type }: { metric: string; detail: string; type: string }) {
  const isMoney = type === "money";
  return (
    <motion.div
      className={`border p-5 flex flex-col gap-1 ${
        isMoney
          ? "border-black/20 dark:border-[#e8dece]/20 bg-black/[0.04] dark:bg-[#e8dece]/[0.04]"
          : "border-black/[0.07] dark:border-[#e8dece]/[0.07] bg-white/25 dark:bg-[#e8dece]/[0.02]"
      }`}
      whileHover={{ x: 3 }}
      transition={{ duration: 0.18 }}
    >
      <span className={`font-bold font-mono leading-none ${isMoney ? "text-2xl" : "text-xl"}`}>
        {metric}
      </span>
      <span className="text-[11px] text-black/40 dark:text-[#e8dece]/40 leading-snug">{detail}</span>
    </motion.div>
  );
}

function IndustrySection({ industry, idx }: { industry: typeof INDUSTRIES[0]; idx: number }) {
  const isEven = idx % 2 === 0;
  return (
    <Reveal delay={0.04}>
      <div className="py-18 border-t border-black/[0.07] dark:border-[#e8dece]/[0.07]" style={{ paddingTop: "4.5rem", paddingBottom: "4.5rem" }}>
        <div className={`grid md:grid-cols-[1fr_420px] gap-12 items-start ${!isEven ? "md:grid-cols-[420px_1fr]" : ""}`}>

          {/* Left — text */}
          <div className={!isEven ? "md:order-2" : ""}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[9px] font-mono uppercase tracking-widest text-black/28 dark:text-[#e8dece]/28">
                / {industry.tag} /
              </span>
              <span className="text-[9px] font-mono text-black/20 dark:text-[#e8dece]/20">
                {industry.sector}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug mb-5">
              {industry.headline}
            </h2>

            <p className="text-[14px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed mb-6">
              {industry.body}
            </p>

            {/* Problem list */}
            <div className="space-y-2.5 mb-7">
              {industry.problems.map(p => (
                <div key={p} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-black/25 dark:bg-[#e8dece]/25 flex-shrink-0" />
                  <p className="text-[12.5px] text-black/45 dark:text-[#e8dece]/45 leading-relaxed">{p}</p>
                </div>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="border-l-2 border-black/12 dark:border-[#e8dece]/12 pl-5 mb-7">
              <p className="text-[13px] text-black/55 dark:text-[#e8dece]/55 leading-relaxed italic mb-2">
                &ldquo;{industry.quote}&rdquo;
              </p>
              <footer className="text-[10px] font-mono text-black/28 dark:text-[#e8dece]/28">
                — {industry.quoteBy}
              </footer>
            </blockquote>

            {/* Dollar model */}
            <div className="border border-black/[0.07] dark:border-[#e8dece]/[0.07] bg-white/20 dark:bg-[#e8dece]/[0.02] px-5 py-4 mb-7">
              <p className="text-[9px] font-mono uppercase tracking-widest text-black/25 dark:text-[#e8dece]/25 mb-2">
                the math
              </p>
              <p className="text-[12px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed font-mono">
                {industry.dollarModel}
              </p>
            </div>

            <Link href="/register"
              className="inline-flex items-center gap-2 text-sm font-semibold group">
              see it live in {industry.tag}
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right — metrics */}
          <div className={`grid grid-cols-2 gap-3 ${!isEven ? "md:order-1" : ""}`}>
            {industry.outcomes.map(o => (
              <MetricBadge key={o.detail} {...o} />
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ─────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────── */
export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[#ECE7D3] dark:bg-[#09090A] dot-pattern">
      <MarketingNav />

      {/* ── HERO ── */}
      <section className="pt-36 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/28 dark:text-[#e8dece]/28 mb-6">
            / use cases /
          </p>
        </Reveal>
        <div className="grid md:grid-cols-2 gap-12 items-end mb-16">
          <Reveal delay={0.06}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.04]">
              Every call.<br />
              <span className="text-black/22 dark:text-[#e8dece]/22">Every dollar.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="space-y-4">
              <p className="text-[15px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                Six industries. One common truth: the gap between a good call and a bad call
                is measured in seconds of delay, one misread emotional signal, one routing error,
                one piece of context the agent didn&apos;t have.
              </p>
              <p className="text-[15px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                Silk Resolve closes that gap on every call — in real time, at enterprise scale,
                with measurable dollar outcomes from the first week of deployment.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Total addressable impact */}
        <Reveal delay={0.2}>
          <div className="border border-black/[0.08] dark:border-[#e8dece]/[0.08] bg-white/30 dark:bg-[#e8dece]/[0.02] p-6 md:p-8">
            <p className="text-[9px] font-mono uppercase tracking-widest text-black/25 dark:text-[#e8dece]/25 mb-5">
              / total addressable impact across all six industries /
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {[
                { v: "$280B+",  l: "annual enterprise voice spend" },
                { v: "17M",     l: "agents globally we can augment" },
                { v: "$11.5M",  l: "annual value per 500-agent center" },
                { v: "48 hrs",  l: "to first live call" },
                { v: "94.7%",   l: "first-call resolution rate" },
                { v: "Day 1",   l: "measurable ROI" },
              ].map(({ v, l }) => (
                <div key={l}>
                  <p className="text-2xl md:text-3xl font-bold font-mono mb-1">{v}</p>
                  <p className="text-[10px] font-mono text-black/32 dark:text-[#e8dece]/32">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── INDUSTRIES ── */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-16">
        {INDUSTRIES.map((industry, idx) => (
          <IndustrySection key={industry.tag} industry={industry} idx={idx} />
        ))}
      </section>

      {/* ── THE VISION ── */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-28">
        <Reveal>
          <div className="bg-[#0A0908] dark:bg-[#e8dece] p-10 md:p-16">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#ECE7D3]/25 dark:text-[#0A0908]/25 mb-5">
                  / the ultimate vision /
                </p>
                <h2 className="text-3xl md:text-5xl font-bold text-[#ECE7D3] dark:text-[#0A0908] tracking-tight leading-snug mb-6">
                  1 million agents.<br />
                  <span className="text-[#ECE7D3]/35 dark:text-[#0A0908]/35">Running on Silk.</span><br />
                  <span className="text-[#ECE7D3]/18 dark:text-[#0A0908]/18">By 2028.</span>
                </h2>
                <p className="text-[14px] text-[#ECE7D3]/50 dark:text-[#0A0908]/50 leading-relaxed mb-5">
                  There are 17 million contact center agents globally. The ones running on
                  generic telephony platforms have no memory, no emotional intelligence,
                  no real-time context. They are operating blind.
                </p>
                <p className="text-[14px] text-[#ECE7D3]/50 dark:text-[#0A0908]/50 leading-relaxed mb-5">
                  Silk Resolve is the infrastructure that changes that. Built on Rumik&apos;s
                  voice AI — the most human model in existence — and deployed across every
                  major vertical, every language, every regulatory environment.
                </p>
                <p className="text-[14px] text-[#ECE7D3]/60 dark:text-[#0A0908]/60 leading-relaxed font-semibold">
                  Not the AI that replaces agents. The intelligence layer that makes every
                  agent — human or AI — dramatically more effective.
                </p>
              </div>

              <div className="space-y-5">
                {[
                  {
                    n: "1",
                    title: "The Enterprise Layer is live",
                    desc: "Any contact center. Any stack. Deployed in 48 hours. Memory, prosody, intent, compliance — all on from day one.",
                  },
                  {
                    n: "2",
                    title: "The Network compounds",
                    desc: "100M+ calls/month flow through Silk. The Memory Mesh learns. The intent model sharpens. Every call on the network makes every other call better.",
                  },
                  {
                    n: "3",
                    title: "The Agent goes autonomous",
                    desc: "Level 4 autonomy. Handle, book, refund, escalate, close — without a human unless the caller asks. The call center as software.",
                  },
                  {
                    n: "4",
                    title: "The Standard is set",
                    desc: "Silk + Rumik becomes what Stripe is to payments and Twilio was to SMS. The default enterprise voice infrastructure for the world.",
                  },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex gap-5 items-start">
                    <span className="text-2xl font-bold font-mono text-[#ECE7D3]/12 dark:text-[#0A0908]/12 flex-shrink-0 mt-0.5">
                      {n}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#ECE7D3]/80 dark:text-[#0A0908]/80 mb-1">{title}</p>
                      <p className="text-[12.5px] text-[#ECE7D3]/45 dark:text-[#0A0908]/45 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <Link href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold bg-[#ECE7D3] dark:bg-[#0A0908] text-[#0A0908] dark:text-[#ECE7D3] hover:opacity-85 transition-opacity group">
                    be part of it
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
