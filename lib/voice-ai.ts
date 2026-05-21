/**
 * Voice AI — generates agent responses during live calls.
 * Uses platform AI config (Anthropic/OpenAI/Gemini).
 * Optimised for low latency: short responses, voice-first prompting.
 */
import { callAI, extractJSON } from "./ai";
import { getPlatformAIConfig } from "./platform";
import type { AgentScript } from "./types";

export interface Message {
  role: "agent" | "customer";
  content: string;
}

export interface PEEKAnalysis {
  tensionLevel: number;    // 0-10
  intent: string;          // e.g. "complaint", "query", "frustrated_acceptance"
  arousal: number;         // 0-10 emotional activation
  hiddenIntent?: string;   // what they really mean
}

export interface VoiceTurn {
  agentText: string;       // what the agent says (may have SILK tags)
  peek: PEEKAnalysis;
  shouldEscalate: boolean;
  escalationReason?: string;
  isFinal: boolean;        // true = end call after speaking
  toolCalls?: string[];    // tool names to execute
}

const VOICE_SYSTEM = `You are a voice AI agent handling a live phone call. Rules:
- Keep responses to 1-3 SHORT sentences max (this is spoken aloud)
- Never use bullet points, markdown, or formatting
- You MAY use SILK prosody tags: <warm>text</warm>, <apologetic_whisper>text</apologetic_whisper>, <warm_closing>text</warm_closing>
- Respond in the SAME language the customer is using
- Never repeat what the customer just said back verbatim
- Sound human and natural, not robotic`;

/**
 * Run one turn of the voice conversation.
 * Returns what the agent should say + PEEK analysis + escalation decision.
 */
export async function runVoiceTurn(opts: {
  script: AgentScript;
  history: Message[];
  customerSpeech: string;
  tensionLevel: number;
  meshContext?: string;
}): Promise<VoiceTurn> {
  const { script, history, customerSpeech, tensionLevel, meshContext } = opts;

  const { provider, apiKey } = await getPlatformAIConfig();
  if (!apiKey) {
    return {
      agentText: "I'm sorry, I'm having technical difficulties. Let me connect you with a human agent.",
      peek: { tensionLevel, intent: "technical_error", arousal: 5 },
      shouldEscalate: true,
      escalationReason: "AI not configured",
      isFinal: false,
    };
  }

  // Build conversation context
  const conversationStr = history
    .slice(-6) // last 3 turns for context window efficiency
    .map((m) => `${m.role === "agent" ? "Agent" : "Customer"}: ${m.content}`)
    .join("\n");

  const systemPrompt = [
    VOICE_SYSTEM,
    "",
    "=== YOUR SCRIPT & IDENTITY ===",
    script.systemPrompt,
    "",
    script.linguisticNotes ? `=== LINGUISTIC RULES ===\n${script.linguisticNotes}` : "",
    meshContext ? `=== CUSTOMER MEMORY (MESH) ===\n${meshContext}` : "",
    "",
    `=== ESCALATION RULES ===`,
    script.escalationRules.map((r) => `- If ${r.condition} → ${r.action}`).join("\n"),
    "",
    `Current tension level: ${tensionLevel}/10`,
    `Preferred address: ${script.preferredAddress}`,
  ].filter(Boolean).join("\n");

  const userPrompt = `Conversation so far:
${conversationStr || "(call just started)"}

Customer just said: "${customerSpeech}"

Reply as the agent. Return JSON:
{
  "agentText": "what you say (1-3 sentences, may use SILK tags)",
  "intent": "one-word intent (complaint/query/frustrated/satisfied/angry/confused/etc)",
  "tensionLevel": <0-10 based on this customer's current state>,
  "arousal": <0-10>,
  "hiddenIntent": "what they REALLY mean beyond the words (optional)",
  "shouldEscalate": <true/false>,
  "escalationReason": "why (only if shouldEscalate=true)",
  "isFinal": <true if issue is fully resolved and call should end>,
  "toolCalls": []
}`;

  try {
    const raw = await callAI({
      provider,
      apiKey,
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 400,
    });

    const parsed = JSON.parse(extractJSON(raw));
    return {
      agentText: parsed.agentText ?? "I understand. Let me help you with that.",
      peek: {
        tensionLevel: Math.min(10, Math.max(0, parsed.tensionLevel ?? tensionLevel)),
        intent: parsed.intent ?? "unknown",
        arousal: parsed.arousal ?? 5,
        hiddenIntent: parsed.hiddenIntent,
      },
      shouldEscalate: !!parsed.shouldEscalate,
      escalationReason: parsed.escalationReason,
      isFinal: !!parsed.isFinal,
      toolCalls: parsed.toolCalls ?? [],
    };
  } catch (err) {
    console.error("Voice AI error:", err);
    return {
      agentText: `${script.preferredAddress}, main samajh raha hoon. Ek second de dijiye.`,
      peek: { tensionLevel, intent: "error", arousal: 5 },
      shouldEscalate: false,
      isFinal: false,
    };
  }
}

/**
 * Generate the opening greeting for a call.
 * Uses MESH profile if available for personalised greeting.
 */
export async function generateGreeting(opts: {
  script: AgentScript;
  callerName?: string;
  meshContext?: string;
  previousOutcome?: string;
}): Promise<string> {
  const { script, callerName, meshContext, previousOutcome } = opts;

  const { provider, apiKey } = await getPlatformAIConfig();
  if (!apiKey) {
    return `Namaste! Main aapka ${script.agentName} hoon. Aaj main aapki kaise madad kar sakta hoon?`;
  }

  const prompt = `Generate a SHORT opening greeting for a voice call (1-2 sentences max).
Agent name: ${script.agentName}
Companion vibe: ${script.companionVibe}
Language: ${script.language}
Preferred address: ${script.preferredAddress}
${callerName ? `Customer name: ${callerName}` : "Unknown caller"}
${meshContext ? `MESH context: ${meshContext}` : ""}
${previousOutcome === "escalated" ? "Note: This customer escalated last time — be extra warm and proactive." : ""}

Return ONLY the greeting text (no JSON). May use SILK tags like <warm>text</warm>.`;

  try {
    const raw = await callAI({
      provider, apiKey,
      system: VOICE_SYSTEM,
      user: prompt,
      maxTokens: 100,
    });
    return raw.trim().replace(/^["']|["']$/g, "");
  } catch {
    return `<warm>Namaste, ${script.preferredAddress}! Main aapki kaise madad kar sakta hoon aaj?</warm>`;
  }
}
