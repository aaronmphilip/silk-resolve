import { answerNovaCareQuestion, cachedAudioText } from "@/lib/novacare-knowledge";
import { splitSpeakableSentences } from "@/lib/speakable-sentences";

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
  if (/\b(opd|outpatient)\b/.test(lower) && text.length >= 8) {
    return cachedAudioText("opd");
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

/** Warm the first sentence so voice TTS can start while the caller is still talking. */
export function prefetchSilkTtsLeadSentence(
  origin: string,
  voiceQuery: string,
  body: object
): void {
  const record = body as { text?: string };
  const text = typeof record.text === "string" ? record.text : "";
  const first = splitSpeakableSentences(text)[0];
  if (!first || first === text) return;
  prefetchSilkTts(origin, voiceQuery, { ...body, text: first });
}

export function normalizeTranscriptKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when a speculative partial is close enough to the final transcript. */
export function transcriptsAlign(partial: string, final: string): boolean {
  const p = normalizeTranscriptKey(partial);
  const f = normalizeTranscriptKey(final);
  if (!p || !f) return false;
  if (f.startsWith(p) || p.startsWith(f)) return true;

  const partialWords = p.split(" ").filter(Boolean);
  const finalWords = f.split(" ").filter(Boolean);
  if (finalWords.length === 0) return false;

  const partialSet = new Set(partialWords);
  const overlap = finalWords.filter((word) => partialSet.has(word)).length;
  return overlap / finalWords.length >= 0.65;
}

/** GPT Realtime-style: start LLM while the caller is still talking. */
export function shouldStartSpeculativeLlm(partialText: string): boolean {
  const text = partialText.trim();
  if (text.length < 14) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 3;
}