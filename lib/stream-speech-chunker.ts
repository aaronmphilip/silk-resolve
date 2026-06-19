/**
 * Buffers LLM token deltas and emits speakable phrases at natural boundaries
 * so TTS starts on the first sentence instead of every token or the full reply.
 */

export interface StreamSpeechChunkerOptions {
  minChars?: number;
  maxChars?: number;
}

export class StreamSpeechChunker {
  private buffer = "";
  private readonly minChars: number;
  private readonly maxChars: number;
  private readonly onChunk: (chunk: string) => void;

  constructor(onChunk: (chunk: string) => void, options: StreamSpeechChunkerOptions = {}) {
    this.onChunk = onChunk;
    this.minChars = options.minChars ?? 24;
    this.maxChars = options.maxChars ?? 120;
  }

  push(delta: string) {
    if (!delta) return;
    this.buffer += delta;
    this.drain(false);
  }

  finish() {
    this.drain(true);
    const tail = this.buffer.trim();
    if (tail) this.onChunk(tail);
    this.buffer = "";
  }

  private drain(force: boolean) {
    for (;;) {
      const chunk = this.takeChunk(force);
      if (!chunk) break;
      this.onChunk(chunk);
      force = false;
    }
  }

  private takeChunk(force: boolean): string | null {
    const text = this.buffer;
    if (!text.trim()) return null;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (!".!?".includes(ch)) continue;
      const rest = text.slice(i + 1);
      if (rest.length > 0 && !/^\s/.test(rest)) continue;
      const chunk = text.slice(0, i + 1).trim();
      if (chunk.length < 8) continue;
      this.buffer = rest.replace(/^\s+/, "");
      return chunk;
    }

    if (text.length >= this.minChars) {
      for (let i = text.length - 1; i >= this.minChars - 1; i--) {
        if (!",;:".includes(text[i])) continue;
        const rest = text.slice(i + 1);
        if (rest.length > 0 && !/^\s/.test(rest)) continue;
        const chunk = text.slice(0, i + 1).trim();
        this.buffer = rest.replace(/^\s+/, "");
        return chunk;
      }
    }

    if (text.length >= this.maxChars || (force && text.length >= 8)) {
      const splitAt = text.lastIndexOf(" ");
      if (splitAt >= 8) {
        const chunk = text.slice(0, splitAt).trim();
        this.buffer = text.slice(splitAt + 1);
        return chunk;
      }
      if (force) {
        this.buffer = "";
        return text.trim();
      }
    }

    return null;
  }
}