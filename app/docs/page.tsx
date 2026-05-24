"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Code2, Plug, ShieldCheck, Zap } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/Reveal";

const SECTIONS = [
  {
    icon: Zap,
    tag: "getting started",
    title: "Quickstart",
    desc: "Install the SDK, authenticate, and stream your first call in under 10 minutes.",
    links: ["installation", "authentication", "your first stream", "handling events"],
  },
  {
    icon: Code2,
    tag: "api reference",
    title: "REST & WebSocket API",
    desc: "Full endpoint reference for streaming, memory, analytics, and configuration APIs.",
    links: ["streams API", "memory API", "analytics API", "webhooks"],
  },
  {
    icon: Plug,
    tag: "integrations",
    title: "Native Connectors",
    desc: "Drop-in connectors for Salesforce, HubSpot, Zendesk, Twilio, Genesys, and more.",
    links: ["Salesforce", "Twilio", "Genesys", "AWS Connect"],
  },
  {
    icon: BookOpen,
    tag: "guides",
    title: "Guides & Tutorials",
    desc: "Step-by-step walkthroughs for intent routing, memory mesh setup, and A/B testing.",
    links: ["intent routing setup", "memory mesh", "A/B testing", "custom models"],
  },
  {
    icon: ShieldCheck,
    tag: "compliance",
    title: "Security & Compliance",
    desc: "Data residency, retention policies, HIPAA configuration, and audit log access.",
    links: ["HIPAA guide", "data retention", "SOC 2 report", "PCI redaction"],
  },
];

const CODE_EXAMPLE = `import { Resolve } from "silk-resolve";

const sr = new Resolve({ apiKey: process.env.SILK_API_KEY });

// Stream a live call
const stream = await sr.streams.create({
  callId: "call_abc123",
  onIntent: ({ intent, confidence }) => {
    console.log(\`Intent: \${intent} (\${confidence}%)\`);
  },
  onEmotion: ({ emotion, intensity }) => {
    // Surface to agent in real-time
    updateAgentPanel({ emotion, intensity });
  },
});

// Pull caller memory
const memory = await sr.memory.get(callerId);
// → { history: [...], preferences: {...}, lastIssue: "..." }`;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#F6F1E9] dark:bg-[#09090A] dot-pattern">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-36 pb-16 px-6 md:px-10 max-w-6xl mx-auto">
        <Reveal>
          <p className="text-[10px] font-mono uppercase tracking-widest text-black/35 dark:text-[#e8dece]/35 mb-5">
            / documentation /
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            everything you need<br />
            <span className="text-black/25 dark:text-[#e8dece]/25">to ship fast.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-base text-black/45 dark:text-[#e8dece]/45 max-w-lg leading-relaxed mb-10">
            The Silk Resolve SDK ships in Python, Node, and Go.
            Full API reference, integration guides, and compliance docs — all in one place.
          </p>
        </Reveal>

        {/* Search bar (decorative — full search coming soon) */}
        <Reveal delay={0.22}>
          <div className="max-w-xl border border-black/[0.1] dark:border-[#e8dece]/[0.1]
            bg-white/50 dark:bg-[#e8dece]/[0.03] flex items-center gap-3 px-4 py-3">
            <span className="text-black/25 dark:text-[#e8dece]/25 font-mono text-sm">⌘</span>
            <span className="text-sm text-black/25 dark:text-[#e8dece]/25 font-mono">
              search docs...
            </span>
            <span className="ml-auto text-[10px] font-mono text-black/20 dark:text-[#e8dece]/20
              border border-black/10 dark:border-[#e8dece]/10 px-1.5 py-0.5">
              K
            </span>
          </div>
        </Reveal>
      </section>

      {/* Quickstart code */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-20">
        <Reveal>
          <div className="border border-black/[0.09] dark:border-[#e8dece]/[0.09]
            bg-white/40 dark:bg-[#e8dece]/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3
              border-b border-black/[0.07] dark:border-[#e8dece]/[0.07]
              bg-black/[0.02] dark:bg-[#e8dece]/[0.02]">
              <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest">
                quickstart · node.js
              </p>
              <div className="flex gap-1.5">
                {["","",""].map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-black/10 dark:bg-[#e8dece]/10" />
                ))}
              </div>
            </div>
            <pre className="px-6 py-6 text-xs font-mono leading-7 overflow-x-auto
              text-black/65 dark:text-[#e8dece]/60">
              <code>{CODE_EXAMPLE}</code>
            </pre>
          </div>
        </Reveal>
      </section>

      {/* Doc sections */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" stagger={0.07}>
          {SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <StaggerItem key={section.title}>
                <motion.div
                  className="border border-black/[0.09] dark:border-[#e8dece]/[0.09]
                    bg-white/40 dark:bg-[#e8dece]/[0.025] p-7 h-full
                    hover:border-black/20 dark:hover:border-[#e8dece]/20 transition-all duration-300 group"
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-4">
                    {section.tag}
                  </p>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="mt-0.5 w-8 h-8 flex items-center justify-center flex-shrink-0
                      border border-black/10 dark:border-[#e8dece]/10">
                      <Icon size={15} strokeWidth={1.5} className="text-black/55 dark:text-[#e8dece]/55" />
                    </div>
                    <h3 className="text-[15px] font-semibold">{section.title}</h3>
                  </div>
                  <p className="text-[13px] text-black/45 dark:text-[#e8dece]/45 leading-relaxed mb-5">
                    {section.desc}
                  </p>
                  <ul className="space-y-2">
                    {section.links.map(l => (
                      <li key={l}>
                        <Link
                          href="#"
                          className="text-xs font-mono flex items-center gap-1.5 group/link
                            text-black/40 dark:text-[#e8dece]/40
                            hover:text-black dark:hover:text-[#e8dece] transition-colors"
                        >
                          <ArrowRight size={10} className="group-hover/link:translate-x-0.5 transition-transform" />
                          {l}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      {/* SDK download */}
      <section className="px-6 md:px-10 max-w-6xl mx-auto pb-24">
        <Reveal>
          <p className="text-[9px] font-mono uppercase tracking-widest text-black/30 dark:text-[#e8dece]/30 mb-5">
            / install the sdk /
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { lang: "Python", cmd: "pip install silk-resolve" },
              { lang: "Node.js", cmd: "npm install silk-resolve" },
              { lang: "Go", cmd: "go get github.com/silkresolve/sdk-go" },
            ].map(({ lang, cmd }) => (
              <div key={lang}
                className="border border-black/[0.09] dark:border-[#e8dece]/[0.09]
                  bg-white/40 dark:bg-[#e8dece]/[0.02] px-5 py-4">
                <p className="text-[9px] font-mono uppercase tracking-widest text-black/25 dark:text-[#e8dece]/25 mb-2">
                  {lang}
                </p>
                <code className="text-sm font-mono text-black/70 dark:text-[#e8dece]/70">
                  {cmd}
                </code>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <MarketingFooter />
    </div>
  );
}
