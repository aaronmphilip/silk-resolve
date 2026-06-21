import { replyLanguagePrompt } from "@/lib/speech-languages";

export interface AgentPromptInput {
  system_prompt?: string | null;
  description?: string | null;
  name?: string | null;
  client?: string | null;
  linguistic_notes?: string | null;
  preferred_address?: string | null;
  companion_vibe?: string | null;
  escalation_rules?: Array<{ condition?: string; action?: string; trigger?: string }> | null;
  no_go_topics?: string[] | null;
  hinglish_mode?: boolean | null;
  meshContext?: string;
}

export function buildAgentVoiceSystemPrompt(
  agent: AgentPromptInput,
  speechLanguage: string
): string {
  const base =
    agent.system_prompt?.trim() ||
    `You are ${agent.name ?? "a voice agent"}, a helpful assistant for ${agent.client || "this company"}.${agent.description ? ` You handle: ${agent.description}.` : ""} Be concise, accurate, and friendly.`;

  const rules = agent.escalation_rules ?? [];
  const noGo = agent.no_go_topics ?? [];
  const addr = agent.preferred_address?.trim() || "Sir/Ma'am";
  const vibe = agent.companion_vibe ?? "professional";

  return [
    base,
    "",
    agent.linguistic_notes?.trim() ? `LINGUISTIC RULES:\n${agent.linguistic_notes.trim()}` : "",
    agent.meshContext?.trim() ? `CUSTOMER MEMORY (MESH):\n${agent.meshContext.trim()}` : "",
    "",
    rules.length
      ? "ESCALATION RULES:\n" +
        rules
          .map((r) => `- If ${r.condition ?? r.trigger ?? "condition"} → ${r.action ?? "escalate"}`)
          .join("\n")
      : "",
    noGo.length ? `NO-GO TOPICS (never discuss): ${noGo.join(", ")}` : "",
    "",
    `COMPANION VIBE: ${vibe}`,
    agent.hinglish_mode ? "HINGLISH: Fluent Hindi–English code-switching when the caller mixes languages." : "",
    "",
    "VOICE CALL RULES:",
    "- Reply in plain spoken sentences. NO markdown, bullets, headers, or lists — ever.",
    "- Short questions: 1–2 sentences. Detailed questions: 2–3 sentences max.",
    "- Use natural contractions and spoken numbers.",
    "- Sound like a calm human support agent.",
    "- NEVER say goodbye unless the caller says goodbye first.",
    "- If you cannot answer from the script or knowledge base, say so honestly and offer what you can help with.",
    `- Preferred address: ${addr}`,
    "",
    replyLanguagePrompt(speechLanguage),
  ]
    .filter(Boolean)
    .join("\n");
}