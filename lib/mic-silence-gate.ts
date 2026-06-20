"use client";

/**
 * Client-side mic level monitor.
 * Background hum (TV, AC, traffic) stays below the speech RMS threshold; only the caller's
 * voice crosses it long enough to count as "speaking". Used to override noisy Vapi/Deepgram VAD.
 */

export interface MicSilenceGateOptions {
  /** RMS above this counts as possible speech (~0.018 ≈ −35 dBFS). */
  speechRmsThreshold?: number;
  /** How long levels must stay below threshold before silence is confirmed. */
  silenceMs?: number;
  /** Voice must stay above threshold this long before we treat it as real speech. */
  speechConfirmMs?: number;
}

const DEFAULT_SPEECH_RMS = 0.018;
const DEFAULT_SILENCE_MS = 580;
const DEFAULT_SPEECH_CONFIRM_MS = 140;

function computeRms(samples: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

/** Convert normalized RMS (0–1) to decibels relative to full scale. */
export function rmsToDecibels(rms: number): number {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms);
}

export class MicSilenceGate {
  private readonly speechRmsThreshold: number;
  private readonly silenceMs: number;
  private readonly speechConfirmMs: number;

  private active = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private vadFrame = 0;
  private loudSince = 0;
  private lastLoudAt = 0;
  private lastConfirmedSpeechAt = 0;
  private currentRms = 0;
  private waiters = new Set<{
    requiredMs: number;
    resolve: () => void;
    reject: (err: Error) => void;
  }>();

  constructor(options: MicSilenceGateOptions = {}) {
    this.speechRmsThreshold = options.speechRmsThreshold ?? DEFAULT_SPEECH_RMS;
    this.silenceMs = options.silenceMs ?? DEFAULT_SILENCE_MS;
    this.speechConfirmMs = options.speechConfirmMs ?? DEFAULT_SPEECH_CONFIRM_MS;
  }

  get rms(): number {
    return this.currentRms;
  }

  get decibels(): number {
    return rmsToDecibels(this.currentRms);
  }

  get speechThresholdDb(): number {
    return rmsToDecibels(this.speechRmsThreshold);
  }

  /** True when mic energy has stayed above the speech threshold long enough. */
  isConfirmedSpeech(): boolean {
    return Date.now() - this.lastConfirmedSpeechAt < this.speechConfirmMs * 2;
  }

  /** Recent confirmed voice activity — ignores brief noise blips and steady background hum. */
  hasConfirmedSpeechWithin(ms: number): boolean {
    return this.lastConfirmedSpeechAt > 0 && Date.now() - this.lastConfirmedSpeechAt < ms;
  }

  isSilentFor(ms?: number): boolean {
    const required = ms ?? this.silenceMs;
    return Date.now() - this.lastLoudAt >= required;
  }

  waitForSilence(ms?: number): Promise<void> {
    const required = ms ?? this.silenceMs;
    if (this.isSilentFor(required)) return Promise.resolve();
    if (!this.active) {
      return new Promise((resolve) => setTimeout(resolve, required));
    }

    return new Promise((resolve, reject) => {
      const waiter = { requiredMs: required, resolve, reject };
      this.waiters.add(waiter);
    });
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      this.releaseStream();
      return;
    }

    this.audioContext = new AudioContextCtor();
    if (this.audioContext.state === "suspended") await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    const now = Date.now();
    this.lastLoudAt = now;
    this.loudSince = 0;
    this.lastConfirmedSpeechAt = 0;
    this.active = true;
    this.watchLevels();
  }

  stop(): void {
    this.active = false;
    if (this.vadFrame) cancelAnimationFrame(this.vadFrame);
    this.vadFrame = 0;

    for (const waiter of this.waiters) {
      waiter.reject(new Error("MicSilenceGate stopped"));
    }
    this.waiters.clear();

    if (this.audioContext) {
      void this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.releaseStream();
  }

  private releaseStream(): void {
    if (!this.mediaStream) return;
    for (const track of this.mediaStream.getTracks()) track.stop();
    this.mediaStream = null;
  }

  private watchLevels(): void {
    if (!this.active || !this.analyser) return;

    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    this.currentRms = computeRms(data);
    const now = Date.now();

    if (this.currentRms > this.speechRmsThreshold) {
      if (!this.loudSince) this.loudSince = now;
      this.lastLoudAt = now;
      if (now - this.loudSince >= this.speechConfirmMs) {
        this.lastConfirmedSpeechAt = now;
      }
    } else {
      this.loudSince = 0;
    }

    const quietFor = now - this.lastLoudAt;
    for (const waiter of [...this.waiters]) {
      if (quietFor >= waiter.requiredMs) {
        this.waiters.delete(waiter);
        waiter.resolve();
      }
    }

    this.vadFrame = requestAnimationFrame(() => this.watchLevels());
  }
}

/** Skip Vapi/Deepgram events when the mic never crossed the speech threshold. */
export function micConfirmsUserSpeech(
  gate: MicSilenceGate | null | undefined,
  withinMs = 10_000
): boolean {
  if (!gate) return true;
  return gate.hasConfirmedSpeechWithin(withinMs);
}