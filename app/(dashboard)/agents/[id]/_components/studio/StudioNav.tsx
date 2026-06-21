"use client";

import { motion } from "framer-motion";
import {
  Bot, Mic2, BookOpen, Wrench, Layout, Shield, Settings2, PhoneCall, FlaskConical,
} from "lucide-react";
import type { StudioSection } from "./types";

const CONFIGURE: { id: StudioSection; label: string; icon: typeof Bot }[] = [
  { id: "agent", label: "Agent", icon: Bot },
  { id: "voice", label: "Voice", icon: Mic2 },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "widget", label: "Widget", icon: Layout },
  { id: "guardrails", label: "Guardrails", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const MONITOR: { id: StudioSection; label: string; icon: typeof Bot; badge?: number }[] = [
  { id: "calls", label: "Conversations", icon: PhoneCall },
  { id: "tests", label: "Tests", icon: FlaskConical },
];

export default function StudioNav({
  section,
  onSection,
  callCount,
  dirty,
}: {
  section: StudioSection;
  onSection: (s: StudioSection) => void;
  callCount: number;
  dirty?: boolean;
}) {
  return (
    <nav className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-[#E8E4DE] bg-[#F7F5F2] lg:min-h-[calc(100vh-3.5rem)] py-4">
      <p className="px-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#6B6560] mb-2">Configure</p>
      <ul className="flex lg:flex-col gap-0.5 px-2 overflow-x-auto lg:overflow-visible">
        {CONFIGURE.map((item) => {
          const active = section === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id} className="min-w-[7rem] lg:min-w-0">
              <button
                type="button"
                onClick={() => onSection(item.id)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "text-[#1A1814] font-medium" : "text-[#6B6560] hover:text-[#1A1814] hover:bg-white/60"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="studio-nav-configure-active"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm border border-[#E8E4DE]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon size={15} className="relative z-10 shrink-0" />
                <span className="relative z-10">{item.label}</span>
                {dirty && active && (
                  <span className="relative z-10 w-1.5 h-1.5 rounded-full bg-[#C4A882]" title="Unsaved changes" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="px-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#6B6560] mt-6 mb-2">Monitor</p>
      <ul className="flex lg:flex-col gap-0.5 px-2">
        {MONITOR.map((item) => {
          const active = section === item.id;
          const Icon = item.icon;
          const badge = item.id === "calls" ? callCount : 0;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSection(item.id)}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "text-[#1A1814] font-medium" : "text-[#6B6560] hover:text-[#1A1814] hover:bg-white/60"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="studio-nav-monitor-active"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm border border-[#E8E4DE]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon size={15} className="relative z-10" />
                <span className="relative z-10 flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className="relative z-10 text-[10px] font-mono bg-[#2D4A3E]/10 text-[#2D4A3E] px-1.5 py-0.5 rounded">
                    {badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}