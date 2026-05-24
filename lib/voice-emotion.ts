export const SILK_TONES = ["neutral", "happy", "sad", "excited", "angry", "whisper"] as const;

export type SilkTone = typeof SILK_TONES[number];

const DEFAULT_TONE: SilkTone = "neutral";
const SILK_TONE_PATTERN = /^\s*\[(neutral|happy|sad|excited|angry|whisper)\]\s*/i;
const VOICE_META_PATTERN = /^\s*\[\[voice:[^\]]+\]\]\s*/i;

export function normalizeSilkTone(tone: unknown): SilkTone {
  if (typeof tone !== "string") return DEFAULT_TONE;
  const normalized = tone.trim().toLowerCase();
  return SILK_TONES.includes(normalized as SilkTone) ? normalized as SilkTone : DEFAULT_TONE;
}

export function stripVoiceMarkers(text: string): string {
  let clean = text;

  for (let i = 0; i < 4; i++) {
    const next = clean
      .replace(VOICE_META_PATTERN, "")
      .replace(SILK_TONE_PATTERN, "");
    if (next === clean) break;
    clean = next;
  }

  return clean.replace(/\s+/g, " ").trim();
}

export function extractSilkTone(text: string, fallback: SilkTone = DEFAULT_TONE): { tone: SilkTone; text: string } {
  const metaStripped = text.replace(VOICE_META_PATTERN, "");
  const match = metaStripped.match(SILK_TONE_PATTERN);
  const tone = match ? normalizeSilkTone(match[1]) : fallback;

  return {
    tone,
    text: stripVoiceMarkers(metaStripped),
  };
}

export function withSilkTone(tone: SilkTone, text: string): string {
  const clean = stripVoiceMarkers(text);
  return clean ? `[${normalizeSilkTone(tone)}] ${clean}` : `[${normalizeSilkTone(tone)}]`;
}
