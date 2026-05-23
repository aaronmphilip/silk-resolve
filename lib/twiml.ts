/**
 * TwiML builder — generates Twilio Markup Language XML responses.
 * We build this as strings to avoid the heavy Twilio SDK dependency.
 * Twilio voices: Polly.Aditi (Indian EN female), Polly.Kajal (Hindi female neural)
 */

export const VOICE = "Polly.Aditi"; // Indian English, neural, SSML support
export const LANGUAGE = "en-IN";

/** Wrap in XML root */
export function twiml(inner: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
  return new Response(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

/** Escape XML special chars in text */
function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert SILK prosody tags to Amazon Polly SSML.
 * <apologetic_whisper>text</apologetic_whisper>  → slow, soft
 * <warm>text</warm>                              → warmer pitch
 * <warm_closing>text</warm_closing>              → slow, warm farewell
 */
export function silkToSSML(text: string): string {
  // Use [\s\S]*? instead of .*? with s-flag for ES2017 compat
  return text
    .replace(/<apologetic_whisper>([\s\S]*?)<\/apologetic_whisper>/g,
      '<prosody rate="slow" pitch="-2st" volume="soft">$1</prosody>')
    .replace(/<warm>([\s\S]*?)<\/warm>/g,
      '<prosody pitch="+1st" volume="medium">$1</prosody>')
    .replace(/<warm_closing>([\s\S]*?)<\/warm_closing>/g,
      '<prosody rate="slow" pitch="+1st">$1</prosody>')
    .replace(/<[a-z_]+>([\s\S]*?)<\/[a-z_]+>/g, "$1"); // strip unknown tags
}

/** Strip all SILK / XML tags, return plain text */
export function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, "").trim();
}

/** <Say> element — uses SSML if text contains < tags */
export function say(text: string): string {
  const hasSilk = /<[a-z_]+>/.test(text);
  if (hasSilk) {
    const ssml = silkToSSML(text);
    return `<Say voice="${VOICE}" language="${LANGUAGE}">${ssml}</Say>`;
  }
  return `<Say voice="${VOICE}" language="${LANGUAGE}">${esc(text)}</Say>`;
}

/** <Gather> speech input — speak a prompt then collect response */
export function gather(opts: {
  action: string;
  prompt: string;
  timeout?: number;
  speechTimeout?: string;
}): string {
  const { action, prompt, timeout = 8, speechTimeout = "auto" } = opts;
  return `<Gather input="speech" action="${esc(action)}" method="POST" speechTimeout="${speechTimeout}" timeout="${timeout}" language="${LANGUAGE}" enhanced="true">${say(prompt)}</Gather>`;
}

/** Hang up */
export const hangup = "<Hangup/>";

/** Pause */
export function pause(seconds = 1): string {
  return `<Pause length="${seconds}"/>`;
}

/** Play an audio file URL */
export function play(url: string): string {
  return `<Play>${esc(url)}</Play>`;
}

/**
 * Full conversation turn: speak AI response then gather next speech.
 * Falls back to hangup if this is the final turn.
 */
export function conversationTurn(opts: {
  agentText: string;
  respondUrl: string;
  isFinal?: boolean;
}): string {
  if (opts.isFinal) {
    return say(opts.agentText) + pause(1) + hangup;
  }
  return gather({
    action: opts.respondUrl,
    prompt: opts.agentText,
  });
}
