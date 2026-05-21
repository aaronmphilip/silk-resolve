import { clsx, type ClassValue } from "clsx";
import type { AgentStatus, CallOutcome } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function statusDot(status: AgentStatus): string {
  switch (status) {
    case "live":
      return "bg-black";
    case "paused":
      return "bg-black/30";
    case "draft":
      return "bg-black/15";
    case "error":
      return "bg-black animate-pulse";
    default:
      return "bg-black/20";
  }
}

export function statusLabel(status: AgentStatus): string {
  return status;
}

export function outcomeBorder(outcome: CallOutcome): string {
  switch (outcome) {
    case "resolved":
      return "border-black";
    case "escalated":
      return "border-black/50 opacity-70";
    case "abandoned":
      return "border-black/20 opacity-40";
    default:
      return "border-black/20";
  }
}

export function scoreLabel(score: number): string {
  if (score === 0) return "—";
  if (score >= 92) return "optimal";
  if (score >= 80) return "strong";
  if (score >= 65) return "moderate";
  return "low";
}

export function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1) + " Plan";
}

export function relativeTime(input: string): string {
  if (input === "never" || input === "—") return input;
  if (input.includes("ago") || input === "now") return input;
  try {
    const date = new Date(input);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return input;
  }
}
