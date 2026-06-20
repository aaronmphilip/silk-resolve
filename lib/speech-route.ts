import {
  cachedAudioText,
  cachedMugaAudioForText,
  isClearlyOutOfScope,
  isNovaCareAgentId,
  needsNovaCareBrain,
  novaCareConversationalReply,
  novaCareFaqCacheAnswer,
  novaCareFollowUpAnswer,
  type NovaCareConversationTurn,
  shouldRouteNovaCareToGemini,
} from "@/lib/novacare-knowledge";

export type SpeechRouteKind = "cached-faq" | "conversational" | "contextual" | "brain" | "out-of-scope";

export type SpeechRouteContext = {
  agentId: string;
  systemPrompt: string;
  history?: NovaCareConversationTurn[];
  /** Demo / explicit test — skip FAQ cache and contextual shortcuts, use Gemini brain. */
  forceBrain?: boolean;
};

export type SpeechRoute = {
  kind: SpeechRouteKind;
  /** Precomputed spoken answer for cached / conversational routes. */
  answer: string;
  transport: "cached-mulberry-faq" | "gemini-live";
};

const SCRIPT_MISSING_SNIPPET = /don't have the answer to this question from my support script/i;
const GENERIC_BRAIN_FALLBACK =
  /^i'?m here to help[.!?\s]*what would you like to know[.!?]*$/i;

export function isScriptMissingResponse(text: string): boolean {
  return SCRIPT_MISSING_SNIPPET.test(text.toLowerCase());
}

/** Empty Gemini / API failure placeholder — never speak this to the caller. */
export function isGenericBrainFallback(text: string): boolean {
  const clean = text.trim();
  if (!clean) return true;
  return GENERIC_BRAIN_FALLBACK.test(clean);
}

function isGenericSmallTalk(text: string): boolean {
  return /^(hi|hello|hey|thanks|thank you|bye|goodbye|good morning|good evening)[\s.!?]*$/i.test(
    text.trim()
  );
}

function genericConversationalReply(userText: string): string {
  const t = userText.trim();
  if (/^(hi|hello|hey|good morning|good evening)[\s.!?]*$/i.test(t)) {
    return "Hi! How can I help you today?";
  }
  if (/^(thanks|thank you)[\s.!?]*$/i.test(t)) {
    return "Glad to help. What else can I look up for you?";
  }
  if (/^(bye|goodbye|see you)[\s.!?]*$/i.test(t)) {
    return "Take care. Reach out anytime if you need more help.";
  }
  return "";
}

/**
 * Single routing table for speech-to-speech turns.
 * NovaCare: exact FAQ clips only → else Gemini brain.
 * Custom agents: always Gemini brain (agent system prompt), except small-talk.
 */
function resolveNovaCareFollowUp(
  userText: string,
  history: NovaCareConversationTurn[]
): SpeechRoute | null {
  const answer = novaCareFollowUpAnswer(userText, history);
  if (!answer) return null;
  if (cachedMugaAudioForText(answer)) {
    return { kind: "cached-faq", answer, transport: "cached-mulberry-faq" };
  }
  return { kind: "contextual", answer, transport: "gemini-live" };
}

export function resolveSpeechRoute(userText: string, ctx: SpeechRouteContext): SpeechRoute {
  const text = userText.trim();
  if (!text) {
    return { kind: "brain", answer: "", transport: "gemini-live" };
  }

  const isNovaCare =
    isNovaCareAgentId(ctx.agentId) || /\bnovacare\b/i.test(ctx.systemPrompt);

  const conversational = isNovaCare
    ? novaCareConversationalReply(text)
    : genericConversationalReply(text);

  if (conversational) {
    return { kind: "conversational", answer: conversational, transport: "gemini-live" };
  }

  if (isNovaCare) {
    if (isClearlyOutOfScope(text.toLowerCase())) {
      return {
        kind: "out-of-scope",
        answer: cachedAudioText("out-of-scope"),
        transport: "cached-mulberry-faq",
      };
    }

    if (!ctx.forceBrain) {
      const followUp = resolveNovaCareFollowUp(text, ctx.history ?? []);
      if (followUp) return followUp;
    }

    if (ctx.forceBrain || needsNovaCareBrain(text.toLowerCase())) {
      return { kind: "brain", answer: "", transport: "gemini-live" };
    }

    const faq = novaCareFaqCacheAnswer(text);
    if (faq && !shouldRouteNovaCareToGemini(text)) {
      return { kind: "cached-faq", answer: faq, transport: "cached-mulberry-faq" };
    }
  }

  if (!isNovaCare && isGenericSmallTalk(text)) {
    const reply = genericConversationalReply(text);
    if (reply) {
      return { kind: "conversational", answer: reply, transport: "gemini-live" };
    }
  }

  return { kind: "brain", answer: "", transport: "gemini-live" };
}

/** Human-readable label for the talk UI transport chip. */
export function speechRouteLabel(route: SpeechRoute): string {
  switch (route.kind) {
    case "cached-faq":
      return "cached-mulberry-faq";
    case "out-of-scope":
      return "cached-mulberry-faq (out-of-scope)";
    case "conversational":
      return "gemini-live (greeting)";
    case "contextual":
      return "gemini-live (context)";
    case "brain":
      return "gemini-live (uncached)";
    default:
      return route.transport;
  }
}