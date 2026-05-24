/**
 * Client-safe AI provider metadata.
 * NO Node.js imports — safe to import from "use client" components.
 * The actual callAI() logic lives in lib/ai.ts (server-only).
 */

export type AIProvider = "anthropic" | "openai" | "gemini";

export const AI_PROVIDERS: {
  id: AIProvider;
  label: string;
  model: string;
  note: string;
  keyHint: string;
}[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-2.5-flash",
    note: "Fast, large context window. Excellent for voice scripts and multilingual support.",
    keyHint: "AIza...",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    model: "claude-sonnet-4-5",
    note: "Best reasoning + instruction following. Top choice for complex scripts.",
    keyHint: "sk-ant-...",
  },
  {
    id: "openai",
    label: "OpenAI GPT-4o",
    model: "gpt-4o",
    note: "Reliable, fast. Strong multilingual support.",
    keyHint: "sk-...",
  },
];
