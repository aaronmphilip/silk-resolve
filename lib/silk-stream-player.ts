/**
 * Browser-side incremental PCM playback for Rumik SILK WebSocket streams.
 * Uses a shared playhead per AudioContext so sequential TTS requests never overlap.
 */

export interface StreamPlaybackResult {
  sampleRate: number;
  transport: string;
  firstFrameMs: number;
  totalMs: number;
  pcmChunks: number;
}

const playheadByContext = new WeakMap<AudioContext, number>();
const activeSources = new Set<AudioBufferSourceNode>();

function trackSource(source: AudioBufferSourceNode) {
  activeSources.add(source);
  source.onended = () => activeSources.delete(source);
}

export function stopAllScheduledSources() {
  for (const source of [...activeSources]) {
    try {
      source.stop(0);
    } catch {}
    activeSources.delete(source);
  }
}

/** Reset the shared timeline when a new reply starts — prevents overlapping voices. */
export function resetAudioPlayhead(ctx: AudioContext | null | undefined) {
  if (!ctx) return;
  playheadByContext.set(ctx, ctx.currentTime);
}

/** Stop all scheduled audio immediately (interrupt / close). */
export function haltAudioPlayback(ctx: AudioContext | null | undefined) {
  stopAllScheduledSources();
  if (!ctx) return;
  playheadByContext.delete(ctx);
  try {
    void ctx.close();
  } catch {
    try {
      void ctx.suspend();
    } catch {}
  }
}

function scheduleOnPlayhead(
  ctx: AudioContext,
  buffer: AudioBuffer
): { source: AudioBufferSourceNode; endAt: number } {
  const startAt = Math.max(ctx.currentTime, playheadByContext.get(ctx) ?? ctx.currentTime);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(startAt);
  const endAt = startAt + buffer.duration;
  playheadByContext.set(ctx, endAt);
  trackSource(source);
  return { source, endAt };
}

function int16ToFloat32(pcm: Int16Array, out: Float32Array) {
  for (let i = 0; i < pcm.length; i++) {
    out[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
  }
}

export async function playStreamingPcmResponse(
  response: Response,
  runId: number,
  isActive: () => boolean,
  existingCtx?: AudioContext | null,
  onFirstFrame?: () => void
): Promise<StreamPlaybackResult> {
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "SILK speech failed.");
  }

  const sampleRate = Number(response.headers.get("x-audio-sample-rate") ?? 24_000);
  const transport = response.headers.get("x-silk-transport") ?? "";
  const startedAt = performance.now();
  let firstFrameMs = 0;
  let pcmChunks = 0;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Audio playback is not supported in this browser.");

  const ctx = existingCtx ?? new AudioContextCtor();
  if (ctx.state === "suspended") await ctx.resume();

  const sources: AudioBufferSourceNode[] = [];
  let endAt = playheadByContext.get(ctx) ?? ctx.currentTime;
  const reader = response.body.getReader();
  let pending = new Uint8Array(0);

  const scheduleChunk = (bytes: Uint8Array) => {
    if (bytes.length < 2 || !isActive()) return;

    const aligned = bytes.byteLength - (bytes.byteLength % 2);
    if (aligned < 2) return;

    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, aligned / 2);
    const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
    int16ToFloat32(pcm, buffer.getChannelData(0));

    const scheduled = scheduleOnPlayhead(ctx, buffer);
    sources.push(scheduled.source);
    endAt = scheduled.endAt;
    pcmChunks += 1;

    if (firstFrameMs === 0) {
      firstFrameMs = performance.now() - startedAt;
      onFirstFrame?.();
    }
  };

  try {
    for (;;) {
      if (!isActive()) break;
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = value ?? new Uint8Array(0);
      const merged = new Uint8Array(pending.length + chunk.length);
      merged.set(pending, 0);
      merged.set(chunk, pending.length);
      pending = merged;

      const usable = pending.length - (pending.length % 2);
      if (usable >= 2) {
        scheduleChunk(pending.subarray(0, usable));
        pending = pending.subarray(usable);
      }
    }

    if (pending.length >= 2 && isActive()) {
      scheduleChunk(pending.subarray(0, pending.length - (pending.length % 2)));
    }

    if (sources.length > 0 && isActive()) {
      await new Promise<void>((resolve) => {
        const last = sources[sources.length - 1];
        last.onended = () => resolve();
        setTimeout(resolve, Math.max(0, (endAt - ctx.currentTime) * 1000) + 80);
      });
    }
  } finally {
    reader.releaseLock();
  }

  return {
    sampleRate,
    transport,
    firstFrameMs,
    totalMs: performance.now() - startedAt,
    pcmChunks,
  };
}

export async function playBufferedPcm(
  arrayBuffer: ArrayBuffer,
  sampleRate: number,
  runId: number,
  isActive: () => boolean,
  existingCtx?: AudioContext | null,
  onFirstFrame?: () => void
): Promise<void> {
  if (!isActive()) return;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Audio playback is not supported in this browser.");

  const ctx = existingCtx ?? new AudioContextCtor();
  if (ctx.state === "suspended") await ctx.resume();

  const pcm = new Int16Array(arrayBuffer);
  const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
  int16ToFloat32(pcm, buffer.getChannelData(0));

  await new Promise<void>((resolve) => {
    if (!isActive()) return resolve();
    const { source } = scheduleOnPlayhead(ctx, buffer);
    source.onended = () => resolve();
    onFirstFrame?.();
  });
}