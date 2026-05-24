"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Minus } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   DATA
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PLANS = [
  {
    name: "Starter",
    tagline: "For teams getting started.",
    price: { monthly: 299, annual: 249 },
    callLimit: "5,000",
    highlight: false,
    cta: "start free trial",
    ctaHref: "/register",
    features: [
      { label: "5,000 calls / month",          included: true  },
      { label: "Voice prosody analysis",        included: true  },
      { label: "Intent detection",              included: true  },
      { label: "10 languages",                  included: true  },
      { label: "REST API access",               included: true  },
      { label: "Basic analytics dashboard",     included: true  },
      { label: "Memory Mesh",                   included: false },
      { label: "A/B script testing",            included: false },
      { label: "Custom domain models",          included: false },
      { label: "HIPAA BAA",                     included: false },
      { label: "Dedicated support",             included: false },
      { label: "SLA guarantee",                 included: false },
    ],
  },
  {
    name: "Scale",
    tagline: "For teams that run at volume.",
    price: { monthly: 899, annual: 749 },
    callLimit: "50,000",
    highlight: true,
    cta: "start free trial",
    ctaHref: "/register",
    features: [
      { label: "50,000 calls / month",          included: true },
      { label: "Voice prosody analysis",        included: true },
      { label: "Intent detection",              included: true },
      { label: "40+ languages",                 included: true },
      { label: "REST + WebSocket APIs",         included: true },
      { label: "Live analytics dashboard",      included: true },
      { label: "Memory Mesh",                   included: true },
      { label: "A/B script testing",            included: true },
      { label: "Custom domain models",          included: false },
      { label: "HIPAA BAA",                     included: true },
      { label: "Priority support",              included: true },
      { label: "99.9% SLA",                     included: true },
    ],
  },
  {
    name: "Enterprise",
    tagline: "For mission-critical deployments.",
    price: null,
    callLimit: "Unlimited",
    highlight: false,
    cta: "talk to sales",
    ctaHref: "/register",
    features: [
      { label: "Unlimited calls",               included: true },
      { label: "Voice prosody analysis",        included: true },
      { label: "Intent detection",              included: true },
      { label: "40+ languages + custom tuning", included: true },
      { label: "REST + WebSocket + gRPC APIs",  included: true },
      { label: "Custom analytics + BI export",  included: true },
      { label: "Memory Mesh",                   included: true },
      { label: "Unlimited A/B variants",        included: true },
      { label: "Custom domain models",          included: true },
      { label: "HIPAA + SOC 2 + ISO 27001",     included: true },
      { label: "Dedicated CSM + engineer",      included: true },
      { label: "99.99% uptime SLA",             included: true },
    ],
  },
];

const FAQS = [
  {
    q: "What counts as a call?",
    a: "A call is any connected voice session routed through Silk Resolve, regardless of duration. Abandoned calls under 10 seconds are not counted.",
  },
  {
    q: "Can I change plans mid-cycle?",
    a: "Yes. Upgrades apply immediately and are prorated. Downgrades take effect at the start of the next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "Starter and Scale plans include a 14-day free trial with no credit card required. Enterprise trials are scoped by agreement.",
  },
  {
    q: "Does Silk store my audio?",
    a: "No. Audio is processed in-stream and discarded by default. Transcripts are retained for 30 days. Zero-retention mode is available on Scale and Enterprise.",
  },
  {
    q: "What integrations are included?",
    a: "All plans include REST API access. Scale and Enterprise include native connectors for Salesforce, HubSpot, Zendesk, Twilio, Genesys, Five9, and AWS Connect.",
  },
  {
    q: "Do you offer academic or non-profit pricing?",
    a: "Yes. Contact us at billing@silkresolve.com with verification and we'll apply a 40% discount.",
  },
];

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   COMPONENTS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PricingCard({ plan, annual }: { plan: typeof PLANS[0]; annual: boolean }) {
  return (
    <motion.div
      className={`relative border flex flex-col p-8 ${
        plan.highlight
          ? "border-black dark:border-[#e8dece]/60 bg-black dark:bg-[#e8dece]"
          : "border-black/[0.09] dark:border-[#e8dece]/[0.09] bg-white/40 dark:bg-[#e8dece]/[0.025]"
      }`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
    >
      {plan.highlight && (
        <div className="absolute -top-px left-8 right-8 h-px bg-[#e8dece] dark:bg-black" />
      )}
      {plan.highlight && (
        <p className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase tracking-widest
          px-3 py-1 bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#0a0908] border
          border-black/20 dark:border-[#e8dece]/20">
          most popular
        </p>
      )}

      {/* Header */}
      <p className={`text-[9px] font-mono uppercase tracking-widest mb-2 ${
        plan.highlight ? "text-[#e8dece]/40 dark:text-[#0a0908]/40" : "text-black/30 dark:text-[#e8dece]/30"
      }`}>
        / {plan.name.toLowerCase()} /
      </p>
      <h3 className={`text-xl font-bold mb-1 ${
        plan.highlight ? "text-[#e8dece] dark:text-[#0a0908]" : ""
      }`}>
        {plan.name}
      </h3>
      <p className={`text-xs mb-6 ${
        plan.highlight ? "text-[#e8dece]/55 dark:text-[#0a0908]/55" : "text-black/40 dark:text-[#e8dece]/40"
      }`}>
        {plan.tagline}
      </p>

      {/* Price */}
      <div className="mb-7">
        {plan.price ? (
          <div className="flex items-end gap-1">
            <AnimatePresence mode="wait">
              <motion.span
                key={annual ? "annual" : "monthly"}
                className={`text-4xl font-bold font-mono leading-none ${
                  plan.highlight ? "text-[#e8dece] dark:text-[#0a0908]" : ""
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                ${annual ? plan.price.annual : plan.price.monthly}
              </motion.span>
            </AnimatePresence>
            <span className={`text-sm mb-1 ${
              plan.highlight ? "text-[#e8dece]/50 dark:text-[#0a0908]/50" : "text-black/35 dark:text-[#e8dece]/35"
            }`}>
              / mo
            </span>
          </div>
        ) : (
          <p className={`text-3xl font-bold ${
            plan.highlight ? "text-[#e8dece] dark:text-[#0a0908]" : ""
          }`}>
            Custom
          </p>
        )}
        {plan.price && annual && (
          <p className={`text-[11px] font-mono mt-1 ${
            plan.highlight ? "text-[#e8dece]/40 dark:text-[#0a0908]/40" : "text-black/30 dark:text-[#e8dece]/30"
          }`}>
            billed annually Â· save ${(plan.price.monthly - plan.price.annual) * 12}/yr
          </p>
        )}
      </div>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className={`mb-8 text-center py-3 text-sm font-semibold transition-opacity hover:opacity-80 ${
          plan.highlight
            ? "bg-[#e8dece] dark:bg-[#0a0908] text-[#0a0908] dark:text-[#e8dece]"
            : "bg-black dark:bg-[#e8dece] text-[#e8dece] dark:text-[#0a0908]"
        }`}
      >
        {plan.cta}
      </Link>

      {/* Divider */}
      <div className={`h-px mb-7 ${
        plan.highlight ? "bg-[#e8dece]/15 dark:bg-[#0a0908]/15" : "bg-black/[0.07] dark:bg-[#e8dece]/[0.07]"
      }`} />

      {/* Features */}
      <ul className="space-y-3 flex-1">
        {plan.features.map(({ label, included }) => (
          <li key={label} className="flex items-center gap-3">
            {included ? (
              <Check size={13} strokeWidth={2.5} className={
                plan.highlight ? "text-[#e8dece]/70 dark:text-[#0a0908]/70 flex-shrink-0" : "text-black/50 dark:text-[#e8dece]/50 flex-shrink-0"
              } />
            ) : (
              <Minus size={13} strokeWidth={2} className={
                plan.highlight ? "text-[#e8dece]/20 dark:text-[#0a0908]/20 flex-shrink-0" : "text-black/15 dark:text-[#e8dece]/15 flex-shrink-0"
              } />
            )}
            <span className={`text-[12.5px] ${
              !included
                ? plan.highlight
                  ? "text-[#e8dece]/28 dark:text-[#0a0908]/28"
                  : "text-black/22 dark:text-[#e8dece]/22"
                : plan.highlight
                  ? "text-[#e8dece]/75 dark:text-[#0a0908]/75"
                  : "text-black/60 dark:text-[#e8dece]/60"
            }`}>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function FAQItem({ faq }: { faq: typeof FAQS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-black/[0.07] dark:border-[#e8dece]/[0.07]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left py-5 flex items-center justify-between gap-4 group"
      >
        <span className="text-sm font-medium">{faq.q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-black/30 dark:text-[#e8dece]/30 group-hover:text-black dark:group-hover:text-[#e8dece] transition-colors"
        >
          <ArrowRight size={14} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-black/50 dark:text-[#e8dece]/50 leading-relaxed max-w-xl">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PAGE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-[#ECE7D3] dark:bg-[#09090A] dot-pattern">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-36 pb-16 px-6 md:px-10 max-w-6xl mx-auto text-center">
        <Reveal>
          <p className="text-[10px] font-mono uppercase tracking-widest text-black/35 dark:text-[#e8dece]/35 mb-5">
            / pricing /
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
            clear pricing.<br />
            <span className="text-black/25 dark:text-[#e8dece]/25">no surprises.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-base text-black/45 dark:text-[#e8dece]/45 max-w-md mx-auto leading-relaxed mb-8">
            Start with a 14-day free trial. No credit card required.
            Cancel or change plans any time.
          </p>
        </Reveal>

        {/* Annual toggle */}
        <Reveal delay={0.22}>
          <div className="inline-flex items-center gap-3">
            <span className={`text-xs font-mono transition-colors ${!annual ? "text-black dark:text-[#e8dece]" : "text-black/35 dark:text-[#e8dece]/35"}`}>
              monthly
            </span>
            <button
              onClick={() => setAnnual(a => !a)}
              className={`relative w-11 h-6 border-2 transition-colors ${
                annual
                  ? "bg-black dark:bg-[#e8dece] border-black dark:border-[#e8dece]"
                  : "bg-transparent border-black/30 dark:border-[#e8dece]/30"
              }`}
              aria-label="Toggle annual billing"
            >
              <motion.div
                className={`absolute top-0.5 w-4 h-4 ${
                  annual ? "bg-[#e8dece] dark:bg-[#0a0908]" : "bg-black/30 dark:bg-[#e8dece]/30"
                }`}
                animate={{ left: annual ? "calc(100% - 18px)" : "2px" }}
                transition={{ duration: 0.2 }}
              />
            </button>
            <span className={`text-xs font-mono transition-colors flex items-center gap-1.5 ${annual ? "text-black dark:text-[#e8dece]" : "text-black/35 dark:text-[#e8dece]/35"}`}>
              annual
              <span className="text-[9px] px-1.5 py-0.5 bg-black/[0.06] dark:bg-[#e8dece]/[0.08]">
                save 17 %
              </span>
            </span>
          </div>
        </Reveal>
      </section>

      {/* Plans */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start" stagger={0.09}>
          {PLANS.map(plan => (
            <StaggerItem key={plan.name}>
              <PricingCard plan={plan} annual={annual} />
            </StaggerItem>
          ))}
        </Stagger>

        {/* Enterprise note */}
        <Reveal delay={0.1} className="mt-6">
          <p className="text-center text-xs text-black/30 dark:text-[#e8dece]/30 font-mono">
            all plans include a 14-day free trial Â· no credit card required Â·
            SOC 2 Type II compliant
          </p>
        </Reveal>
      </section>

      {/* Comparison table â€” desktop only */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24 hidden md:block">
        <Reveal>
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-6">
            / full comparison /
          </p>
          <div className="border border-black/[0.08] dark:border-[#e8dece]/[0.08] overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.07] dark:border-[#e8dece]/[0.07]">
                  <th className="text-left px-6 py-4 font-medium w-1/2 text-black/50 dark:text-[#e8dece]/50">
                    feature
                  </th>
                  {PLANS.map(p => (
                    <th key={p.name} className={`px-6 py-4 text-center font-semibold ${
                      p.highlight ? "bg-black/[0.04] dark:bg-[#e8dece]/[0.04]" : ""
                    }`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANS[0].features.map(({ label }, fi) => (
                  <tr key={label} className="border-t border-black/[0.05] dark:border-[#e8dece]/[0.05]">
                    <td className="px-6 py-3.5 text-black/55 dark:text-[#e8dece]/55">{label}</td>
                    {PLANS.map(p => (
                      <td key={p.name} className={`px-6 py-3.5 text-center ${
                        p.highlight ? "bg-black/[0.02] dark:bg-[#e8dece]/[0.02]" : ""
                      }`}>
                        {p.features[fi].included ? (
                          <Check size={14} className="mx-auto text-black/55 dark:text-[#e8dece]/55" strokeWidth={2.5} />
                        ) : (
                          <Minus size={14} className="mx-auto text-black/15 dark:text-[#e8dece]/15" strokeWidth={2} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="px-6 md:px-10 max-w-3xl mx-auto pb-24">
        <Reveal>
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-8">
            / frequently asked /
          </p>
        </Reveal>
        {FAQS.map((faq, i) => (
          <Reveal key={faq.q} delay={i * 0.04}>
            <FAQItem faq={faq} />
          </Reveal>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Reveal>
          <div className="border border-black/[0.09] dark:border-[#e8dece]/[0.09]
            p-10 md:p-14 text-center bg-white/40 dark:bg-[#e8dece]/[0.02]">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">
              Still deciding?
            </h2>
            <p className="text-sm text-black/45 dark:text-[#e8dece]/45 max-w-md mx-auto leading-relaxed mb-8">
              We&apos;ll run a call from your own call centre data â€” live, in 30 minutes â€”
              and show you exactly what Silk catches that you&apos;re currently missing.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold bg-black dark:bg-[#e8dece]
                text-[#F0EBE0] dark:text-[#09090A]
                hover:opacity-80 transition-opacity group"
            >
              book a live demo
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}


