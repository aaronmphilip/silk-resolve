/** Split speakable assistant text into sentence chunks for early TTS. */
export function splitSpeakableSentences(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const sentences: string[] = [];
  const re = /[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(clean)) !== null) {
    const sentence = match[0].trim();
    if (sentence) sentences.push(sentence);
  }

  return sentences.length > 0 ? sentences : [clean];
}