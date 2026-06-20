import { needsNovaCareBrain, novaCareFaqCacheAnswer } from "@/lib/novacare-knowledge";
import { splitSpeakableSentences } from "@/lib/speakable-sentences";

/**
 * GPT Realtime-style speculative intent: guess the FAQ answer from partial
 * transcripts so TTS can start before the user fully stops speaking.
 */
/** Speculative cache lookup — exact FAQ intents only (no fuzzy keyword guessing). */
export function speculativeNovaCareAnswer(partialText: string): string {
  const text = partialText.trim();
  if (text.length < 8) return "";
  if (needsNovaCareBrain(text)) return "";
  return novaCareFaqCacheAnswer(text);
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