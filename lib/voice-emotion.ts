/**
 * SILK Voice Emotion Engine
 *
 * Rumik MUGA model uses:
 *   - [tone] prefix   → sets the emotional register of the whole utterance
 *   - <marker> tags   → inline human prosody signals (laugh, sigh, hmm, pause, breathe)
 *
 * Tension band → tone + prosody strategy:
 *   0–2   calm/positive   → [happy]   + laugh, enthusiasm
 *   2–4   mild concern    → [happy/neutral] + warmth, reassurance
 *   4–5   moderate        → [neutral] + thinking markers, measured pace
 *   5–7   elevated        → [sad]     + empathy-first, sigh, slower
 *   7–8   high            → [whisper] + pause, gravitas, no filler
 *   8–10  crisis          → [whisper] + shortest path to escalation
 *
 * Intent → prosody modifier (layered on top of tension band):
 *   grateful   → <laugh>        confused   → <hmm>
 *   frustrated → (suppress all) angry      → <pause> only
 *   satisfied  → warmth markers
 */

// ── Core tone type ────────────────────────────────────────────────────────────
export const SILK_TONES = ["neutral", "happy", "sad", "excited", "angry", "whisper"] as const;
export type SilkTone = typeof SILK_TONES[number];

// ── Human prosody markers ─────────────────────────────────────────────────────
// These are injected into text to make MUGA sound human.
// Rumik MUGA recognises them as voice-style cues.
export const PROSODY_MARKERS = {
  laugh:   "<laugh>",
  sigh:    "<sigh>",
  hmm:     "<hmm>",
  pause:   "<pause>",
  breathe: "<breathe>",
} as const;

export type ProsodyMarker = keyof typeof PROSODY_MARKERS;

// Call intent classification
export type CallIntent =
  | "complaint"
  | "query"
  | "frustrated"
  | "satisfied"
  | "angry"
  | "confused"
  | "grateful"
  | "neutral";

// ── Regex patterns ─────────────────────────────────────────────────────────────
const SILK_TONE_PATTERN    = /^\s*\[(neutral|happy|sad|excited|angry|whisper)\]\s*/i;
const VOICE_META_PATTERN   = /^\s*\[\[voice:[^\]]+\]\]\s*/i;
const PROSODY_TAG_PATTERN  = /<(laugh|sigh|hmm|pause|breathe)>/gi;

// ── Tone normalisation ────────────────────────────────────────────────────────
const DEFAULT_TONE: SilkTone = "neutral";

export function normalizeSilkTone(tone: unknown): SilkTone {
  if (typeof tone !== "string") return DEFAULT_TONE;
  const n = tone.trim().toLowerCase();
  return SILK_TONES.includes(n as SilkTone) ? (n as SilkTone) : DEFAULT_TONE;
}

// ── Strip helpers ─────────────────────────────────────────────────────────────
/** Remove all [tone] and [[voice:...]] prefixes — safe to call multiple times. */
export function stripVoiceMarkers(text: string): string {
  let clean = text;
  for (let i = 0; i < 4; i++) {
    const next = clean.replace(VOICE_META_PATTERN, "").replace(SILK_TONE_PATTERN, "");
    if (next === clean) break;
    clean = next;
  }
  return clean.replace(/\s+/g, " ").trim();
}

/** Remove prosody <marker> tags — used when SILK is not configured. */
export function stripProsodyMarkers(text: string): string {
  return text.replace(PROSODY_TAG_PATTERN, "").replace(/\s+/g, " ").trim();
}

/** Strip all voice markers (tone prefix + prosody tags). */
export function stripAll(text: string): string {
  return stripProsodyMarkers(stripVoiceMarkers(text));
}

// ── Tone extraction ───────────────────────────────────────────────────────────
export function extractSilkTone(
  text: string,
  fallback: SilkTone = DEFAULT_TONE
): { tone: SilkTone; text: string } {
  const metaStripped = text.replace(VOICE_META_PATTERN, "");
  const match = metaStripped.match(SILK_TONE_PATTERN);
  const tone = match ? normalizeSilkTone(match[1]) : fallback;
  return { tone, text: stripVoiceMarkers(metaStripped) };
}

/** Wrap text with a [tone] prefix (strips any existing tone first). */
export function withSilkTone(tone: SilkTone, text: string): string {
  const clean = stripVoiceMarkers(text);
  return clean ? `[${normalizeSilkTone(tone)}] ${clean}` : `[${normalizeSilkTone(tone)}]`;
}

// ── Tension → tone mapping ────────────────────────────────────────────────────
/**
 * Map a 0–10 tension score to the best SILK tone.
 * Fine-grained — 10 distinct bands.
 */
export function tensionToTone(tension: number): SilkTone {
  if (tension <= 1.5) return "happy";
  if (tension <= 3.0) return "happy";
  if (tension <= 4.5) return "neutral";
  if (tension <= 6.0) return "neutral";
  if (tension <= 7.0) return "sad";
  if (tension <= 8.0) return "whisper";
  return "whisper";
}

// ── Prosody strategy ──────────────────────────────────────────────────────────
interface ProsodyStrategy {
  /** Prefix to inject before the first sentence (or empty string). */
  prefix: string;
  /** Whether to inject a mid-sentence pause marker (for longer responses). */
  midPause: boolean;
}

/**
 * Decide prosody based on tension + intent.
 * Returns zero-or-one prefix marker and whether to sprinkle a mid-pause.
 */
export function buildProsodyStrategy(
  tension: number,
  intent: CallIntent
): ProsodyStrategy {
  // High tension / angry / frustrated — silence is golden
  if (tension >= 8 || intent === "angry") {
    return { prefix: PROSODY_MARKERS.pause, midPause: false };
  }
  if (tension >= 6.5 || intent === "frustrated") {
    return { prefix: PROSODY_MARKERS.sigh, midPause: false };
  }

  // Thinking / confused — hmm marker
  if (intent === "confused" || intent === "query") {
    return { prefix: tension > 4 ? "" : PROSODY_MARKERS.hmm, midPause: false };
  }

  // Positive resolution
  if (intent === "grateful" || intent === "satisfied") {
    return { prefix: tension < 3 ? PROSODY_MARKERS.laugh : "", midPause: false };
  }

  // Moderate tension — measured breath before speaking
  if (tension >= 4.5) {
    return { prefix: PROSODY_MARKERS.breathe, midPause: true };
  }

  // Calm / neutral — no extra marker
  return { prefix: "", midPause: false };
}

// ── Master composer ───────────────────────────────────────────────────────────
/**
 * Compose a final SILK-ready utterance:
 *   [tone] <prosody_prefix> <text with optional mid-pause>
 *
 * @param rawText  - The agent's spoken response (may already have markers stripped)
 * @param tension  - Current PEEK tension (0–10)
 * @param intent   - Classified intent of the caller
 * @param useSilk  - Whether Rumik SILK is configured (if false, strip all markers)
 */
export function composeSilkUtterance(
  rawText: string,
  tension: number,
  intent: CallIntent,
  useSilk: boolean
): string {
  const clean = stripAll(rawText).trim();
  if (!clean) return "";

  if (!useSilk) return clean;

  const tone = tensionToTone(tension);
  const { prefix, midPause } = buildProsodyStrategy(tension, intent);

  // Inject mid-pause: split after first sentence-ending punctuation
  let body = clean;
  if (midPause) {
    body = clean.replace(/([.!?])\s+/, `$1 ${PROSODY_MARKERS.pause} `);
  }

  const withPrefix = prefix ? `${prefix} ${body}` : body;
  return `[${tone}] ${withPrefix}`;
}

// ── System prompt snippet for the LLM ────────────────────────────────────────
/**
 * Returns the VOICE EMOTION section to append to every PEEK system prompt.
 * Instructs the LLM to embed prosody markers in agentText.
 */
export function silkSystemPromptBlock(): string {
  return `VOICE EMOTION (SILK MUGA ENGINE):
You are speaking aloud. Your text is processed by Rumik MUGA which reads prosody tags.

Inline prosody markers — embed these inside agentText where appropriate:
  <laugh>   → warmth, small laugh (only at tension < 3 and intent = grateful/satisfied)
  <sigh>    → empathy, letting the tension go (tension 5–7)
  <hmm>     → brief thinking pause before answering a query
  <pause>   → dramatic pause — use sparingly at tension > 7 or before key info
  <breathe> → settling moment before a longer explanation (tension 4–6)

Rules:
- At most ONE prosody marker per response
- Never use <laugh> when tension > 4
- Always use <pause> or nothing when tension > 7 (not sigh, not laugh)
- Do NOT include [tone] prefix — the system adds it automatically based on tensionLevel
- Markers go INSIDE the agentText field, naturally within the sentence`;
}
