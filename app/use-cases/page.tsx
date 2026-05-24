"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DATA
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const INDUSTRIES = [
  {
    tag: "healthcare",
    title: "Clinical & Patient Operations",
    headline: "Patients who feel heard return.",
    body: "Route appointment calls with clinical intent detection. Flag anxiety or pain indicators in patient voices before the agent responds. Auto-populate EHR fields from call context. HIPAA BAA included on all plans.",
    outcomes: [
      { metric: "38 %", detail: "drop in missed appointments" },
      { metric: "2.1Ã—", detail: "faster triage routing" },
      { metric: "HIPAA", detail: "BAA on every plan" },
    ],
    quote: "Silk caught that a patient was in distress three exchanges before our agent did. That gap used to cost us escalations.",
    quoteBy: "Head of Patient Experience, Apollo Health",
  },
  {
    tag: "banking & finance",
    title: "Wealth, Retail & Collections",
    headline: "Trust is built in the first 8 seconds.",
    body: "Detect fraudulent call patterns via voice biometrics. Surface account context before the first question. Compliance-grade call recording with automatic PCI redaction. Real-time advisor coaching on regulated language.",
    outcomes: [
      { metric: "61 %", detail: "fraud pattern detection" },
      { metric: "< 4 s", detail: "account context surface" },
      { metric: "PCI", detail: "auto redaction" },
    ],
    quote: "Our fraud team now gets a flag before the conversation is 30 seconds in. The model picks up what humans miss.",
    quoteBy: "VP Risk, Meridian Bank",
  },
  {
    tag: "e-commerce & retail",
    title: "Support, Returns & Retention",
    headline: "Every return call is a retention opportunity.",
    body: "Predict churn intent from voice signal and sentiment drift. Auto-suggest retention offers in real time. Classify complaint type before the script reaches its second line. Average handle time drops on day one.",
    outcomes: [
      { metric: "22 %", detail: "churn reduction" },
      { metric: "34 s", detail: "AHT reduction per call" },
      { metric: "91 %", detail: "correct complaint routing" },
    ],
    quote: "The first week, we recovered 14 customers who called to cancel. Silk surfaced intent, our agents acted on it.",
    quoteBy: "CX Director, Volta Commerce",
  },
  {
    tag: "telecom",
    title: "Technical Support & Retention",
    headline: "Frustration is measurable. Churn is preventable.",
    body: "Detect escalation before it happens. Route technical calls based on issue-type prediction from the first sentence. Surface troubleshooting steps contextually while the caller is still talking. Proactive outbound powered by propensity scoring.",
    outcomes: [
      { metric: "47 %", detail: "escalation reduction" },
      { metric: "1.8Ã—", detail: "first call resolution rate" },
      { metric: "29 %", detail: "NPS lift" },
    ],
    quote: "We stopped measuring deflection rate. We started measuring resolution rate. That shift came the week Silk went live.",
    quoteBy: "Director of CX Engineering, Axis Telecom",
  },
  {
    tag: "insurance",
    title: "Claims, Policy & Renewals",
    headline: "A claim call is a relationship stress test.",
    body: "Auto-extract claim details from natural conversation â€” no IVR menus, no scripted questions. Voice-verify policyholder identity. Surface coverage context mid-call. Flag potential fraud indicators from vocal pattern deviations.",
    outcomes: [
      { metric: "3.2Ã—", detail: "claim intake speed" },
      { metric: "55 %", detail: "fewer identity failures" },
      { metric: "âˆ… IVR", detail: "on claims calls" },
    ],
    quote: "Claims calls went from a pain point to a differentiator. Policyholders now notice. They comment on it unprompted.",
    quoteBy: "VP Operations, Shield Direct",
  },
  {
    tag: "government",
    title: "Citizen Services & Helplines",
    headline: "Every citizen call deserves respect.",
    body: "Multi-language routing without language-selection menus â€” the system detects and routes automatically. Accessibility-aware prosody interpretation. ADA compliance tooling. Anonymised analytics for public service dashboards.",
    outcomes: [
      { metric: "40 +", detail: "languages auto-detected" },
      { metric: "ADA", detail: "compliant by default" },
      { metric: "0", detail: "language-select menus" },
    ],
    quote: "Citizens with limited English used to abandon calls at 58%. After Silk, the abandon rate is 9%. That's lives changed.",
    quoteBy: "Technology Director, City of Mesa",
  },
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   INDUSTRY CARD
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function IndustryCard({ industry, idx }: { industry: typeof INDUSTRIES[0]; idx: number }) {
  const isEven = idx % 2 === 0;
  return (
    <Reveal delay={0.05}>
      <div className={`grid md:grid-cols-2 gap-8 items-start py-16 border-t
        border-black/[0.08] dark:border-[#e8dece]/[0.08]
        ${isEven ? "" : "md:flex-row-reverse"}`}>

        {/* Text */}
        <div className={isEven ? "" : "md:order-2"}>
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-3">
            / {industry.tag} /
          </p>
          <p className="text-[10px] font-mono text-black/45 dark:text-[#e8dece]/45 mb-1 uppercase tracking-widest">
            {industry.title}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug mb-4">
            {industry.headline}
          </h2>
          <p className="text-[14px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed mb-8 max-w-md">
            {industry.body}
          </p>

          {/* Quote */}
          <blockquote className="border-l-2 border-black/15 dark:border-[#e8dece]/15 pl-4 mb-8">
            <p className="text-[13px] text-black/55 dark:text-[#e8dece]/55 leading-relaxed italic mb-2">
              &ldquo;{industry.quote}&rdquo;
            </p>
            <footer className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30">
              â€” {industry.quoteBy}
            </footer>
          </blockquote>

          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm font-semibold group"
          >
            see it in your industry
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Outcomes */}
        <div className={`flex flex-col gap-4 ${isEven ? "" : "md:order-1"}`}>
          {industry.outcomes.map(({ metric, detail }) => (
            <motion.div
              key={detail}
              className="border border-black/[0.08] dark:border-[#e8dece]/[0.08]
                bg-white/40 dark:bg-[#e8dece]/[0.025] px-7 py-5 flex items-center gap-6"
              whileHover={{ x: isEven ? 4 : -4 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-3xl font-bold font-mono leading-none flex-shrink-0">
                {metric}
              </span>
              <span className="text-[13px] text-black/45 dark:text-[#e8dece]/45">
                {detail}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PAGE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[#ECE7D3] dark:bg-[#09090A] dot-pattern">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-36 pb-12 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[10px] font-mono uppercase tracking-widest text-black/35 dark:text-[#e8dece]/35 mb-5">
            / use cases /
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            built for every industry<br />
            <span className="text-black/25 dark:text-[#e8dece]/25">that talks to humans.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-base text-black/45 dark:text-[#e8dece]/45 max-w-lg leading-relaxed">
            Six verticals. One infrastructure. Silk Resolve ships with pre-trained
            domain models â€” no fine-tuning required to get day-one accuracy.
          </p>
        </Reveal>

        {/* Industry tabs */}
        <Reveal delay={0.22} className="mt-10">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(({ tag }) => (
              <span key={tag}
                className="text-[11px] font-mono px-3 py-1.5 border
                  border-black/[0.09] dark:border-[#e8dece]/[0.09]
                  text-black/45 dark:text-[#e8dece]/45
                  bg-white/30 dark:bg-[#e8dece]/[0.02]">
                {tag}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Industry sections */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        {INDUSTRIES.map((industry, idx) => (
          <IndustryCard key={industry.tag} industry={industry} idx={idx} />
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Reveal>
          <div className="border border-black/[0.09] dark:border-[#e8dece]/[0.09]
            bg-white/40 dark:bg-[#e8dece]/[0.02] p-10 md:p-14 text-center">
            <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-5">
              / your industry /
            </p>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">
              Don&apos;t see yours?
            </h2>
            <p className="text-sm text-black/45 dark:text-[#e8dece]/45 max-w-md mx-auto leading-relaxed mb-8">
              We work with teams in logistics, legal, automotive, hospitality, and education too.
              Tell us your use case and we&apos;ll walk you through it live.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold bg-black dark:bg-[#e8dece]
                text-[#F0EBE0] dark:text-[#09090A]
                hover:opacity-80 transition-opacity group"
            >
              book a custom demo
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}


