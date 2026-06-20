import { answerNovaCareQuestion, cachedAudioText } from "@/lib/novacare-knowledge";

/**
 * GPT Realtime-style speculative intent: guess the FAQ answer from partial
 * transcripts so TTS can start before the user fully stops speaking.
 */
export function speculativeNovaCareAnswer(partialText: string): string {
  const text = partialText.trim();
  if (text.length < 8) return "";

  const direct = answerNovaCareQuestion(text);
  if (direct) return direct;

  const lower = text.toLowerCase();
  if (/\b(plan|plans|price|pricing|premium|cost)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("plans");
  }
  if (/\b(claim|claims|cashless|pre-?auth)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("claims");
  }
  if (/\b(hospital|network|fortis|apollo)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("network-hospitals");
  }
  if (/\b(reimburse|reimbursement|bills|upload)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("reimbursement");
  }
  if (/\b(coverage|cover|covered|insured)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("coverage");
  }
  if (/\b(waiting|pre[- ]?existing|maternity)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("waiting");
  }
  if (/\b(support|phone|email|helpline|emergency|contact)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("support");
  }
  if (/\b(relocat|move|shift|transfer|mumbai|delhi|bangalore|city)\b/.test(lower) && text.length >= 12) {
    return cachedAudioText("relocation");
  }
  if (/\b(renew|renewal|expire)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("renewals");
  }
  if (/\b(family|dependent|spouse|child|add)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("add-dependents");
  }
  if (/\b(exclude|excluded|not covered|cosmetic)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("exclusions");
  }
  if (/\b(who are you|about|novacare|company)\b/.test(lower) && text.length >= 10) {
    return cachedAudioText("about");
  }

  return "";
}

export function prefetchSilkTts(
  origin: string,
  voiceQuery: string,
  body: object
): void {
  if (typeof window === "undefined") return;
  try {
    void fetch(`${origin}/api/voice/silk-tts?${voiceQuery}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      keepalive: true,
    });
  } catch {}
}