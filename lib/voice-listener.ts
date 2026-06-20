"use client";

import { acquireMicrophoneStream } from "@/lib/mic-session";
import { speechRecognitionErrorMessage } from "@/lib/speech-languages";

type SpeechRecognitionResultItem = { transcript: string };
type SpeechRecognitionResultListItem = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultListItem };
};
type SpeechRecognitionErrorLike = { error?: string; message?: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export interface VoiceListenerOptions {
  language: string;
  silenceMs?: number;
  minUtteranceChars?: number;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}

const DEFAULT_SILENCE_MS = 420;
const DEFAULT_MIN_CHARS = 3;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export class VoiceListener {
  private readonly options: Required<Pick<VoiceListenerOptions, "language" | "silenceMs" | "minUtteranceChars">> &
    Pick<VoiceListenerOptions, "onInterim" | "onFinal" | "onError">;

  private active = false;
  private paused = false;
  private recognition: SpeechRecognitionLike | null = null;
  private recognitionGeneration = 0;
  private networkRetries = 0;

  private committed = "";
  private interim = "";
  private lastHeardAt = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private vadFrame = 0;
  private speechDetected = false;

  private recorder: MediaRecorder | null = null;
  private recorderChunks: Blob[] = [];
  private recorderMime = "audio/webm";
  private finalizing = false;

  constructor(options: VoiceListenerOptions) {
    this.options = {
      language: options.language,
      silenceMs: options.silenceMs ?? DEFAULT_SILENCE_MS,
      minUtteranceChars: options.minUtteranceChars ?? DEFAULT_MIN_CHARS,
      onInterim: options.onInterim,
      onFinal: options.onFinal,
      onError: options.onError,
    };
  }

  async start(): Promise<void> {
    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) {
      this.options.onError("Speech recognition is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    await acquireMicrophoneStream();
    await this.ensureAnalyser();
    this.active = true;
    this.paused = false;
    this.networkRetries = 0;
    this.committed = "";
    this.interim = "";
    this.speechDetected = false;
    this.finalizing = false;
    this.beginRecorder();
    this.attachRecognition(Recognition);
  }

  pause(): void {
    this.paused = true;
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.stopRecorder();
    this.recognition?.abort();
    this.recognition = null;
  }

  async resume(delayMs = 280): Promise<void> {
    if (!this.active) return;
    this.paused = false;
    this.committed = "";
    this.interim = "";
    this.speechDetected = false;
    this.clearSilenceTimer();
    this.clearRestartTimer();

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (!this.active || this.paused) return;

    const Recognition = getSpeechRecognitionCtor();
    if (!Recognition) return;

    this.beginRecorder();
    this.attachRecognition(Recognition);
  }

  stop(): void {
    this.active = false;
    this.paused = true;
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.stopRecorder();
    this.recognition?.abort();
    this.recognition = null;
    if (this.vadFrame) cancelAnimationFrame(this.vadFrame);
    this.vadFrame = 0;
    if (this.audioContext) {
      void this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.analyser = null;
    }
  }

  private async ensureAnalyser(): Promise<void> {
    if (this.analyser) return;
    const stream = await acquireMicrophoneStream();
    const AudioContextCtor = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    this.audioContext = new AudioContextCtor();
    if (this.audioContext.state === "suspended") await this.audioContext.resume();

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);
    this.watchLevels();
  }

  private watchLevels(): void {
    if (!this.analyser || !this.active) return;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    if (rms > 0.018) {
      this.speechDetected = true;
      this.lastHeardAt = Date.now();
    }

    this.vadFrame = requestAnimationFrame(() => this.watchLevels());
  }

  private beginRecorder(): void {
    this.stopRecorder();
    this.recorderChunks = [];

    void acquireMicrophoneStream().then((stream) => {
      if (!this.active || this.paused) return;
      const mimeCandidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
      try {
        this.recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        this.recorderMime = this.recorder.mimeType || mimeType || "audio/webm";
        this.recorder.ondataavailable = (event) => {
          if (event.data.size > 0) this.recorderChunks.push(event.data);
        };
        this.recorder.start(250);
      } catch {
        this.recorder = null;
      }
    });
  }

  private stopRecorder(): void {
    if (!this.recorder) return;
    try {
      if (this.recorder.state !== "inactive") this.recorder.stop();
    } catch {}
    this.recorder = null;
  }

  private attachRecognition(RecognitionCtor: SpeechRecognitionCtor): void {
    const generation = ++this.recognitionGeneration;
    this.recognition?.abort();

    const recognition = new RecognitionCtor();
    recognition.lang = this.options.language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    this.recognition = recognition;

    recognition.onresult = (event) => {
      if (!this.active || this.paused || generation !== this.recognitionGeneration) return;

      let interimText = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const part = result[0]?.transcript ?? "";
        if (result.isFinal) finalText += part;
        else interimText += part;
      }

      if (finalText.trim()) {
        this.committed = `${this.committed} ${finalText}`.replace(/\s+/g, " ").trim();
        this.interim = "";
      }

      const live = `${this.committed}${this.committed && interimText ? " " : ""}${interimText}`.trim();
      if (interimText.trim() || finalText.trim()) {
        this.lastHeardAt = Date.now();
        this.speechDetected = true;
      }

      if (interimText.trim()) {
        this.interim = interimText.trim();
        this.options.onInterim(live);
        this.scheduleSilenceFinalize();
      } else if (live) {
        this.options.onInterim(live);
      }

      if (finalText.trim() && live.length >= this.options.minUtteranceChars) {
        this.finalize(live);
      }
    };

    recognition.onerror = (event) => {
      if (!this.active || this.paused || generation !== this.recognitionGeneration) return;
      const code = event.error ?? "";
      if (code === "aborted") return;

      if (code === "no-speech") {
        this.scheduleRecognitionRestart(280);
        return;
      }

      if (code === "network" && this.networkRetries < 4) {
        this.networkRetries += 1;
        this.scheduleRecognitionRestart(500 * this.networkRetries);
        return;
      }

      void this.fallbackTranscribe();
    };

    recognition.onend = () => {
      if (!this.active || this.paused || generation !== this.recognitionGeneration) return;
      this.scheduleRecognitionRestart(220);
    };

    try {
      recognition.start();
    } catch {
      this.scheduleRecognitionRestart(400);
    }
  }

  private scheduleRecognitionRestart(delayMs: number): void {
    if (!this.active || this.paused) return;
    this.clearRestartTimer();
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (!this.active || this.paused) return;
      const Recognition = getSpeechRecognitionCtor();
      if (!Recognition) return;
      this.attachRecognition(Recognition);
    }, delayMs);
  }

  private scheduleSilenceFinalize(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      if (!this.active || this.paused) return;
      const quietFor = Date.now() - this.lastHeardAt;
      if (quietFor < this.options.silenceMs - 40) return;

      const live = `${this.committed}${this.committed && this.interim ? " " : ""}${this.interim}`.trim();
      if (live.length >= this.options.minUtteranceChars) {
        this.finalize(live);
        return;
      }

      if (this.speechDetected) void this.fallbackTranscribe();
    }, this.options.silenceMs);
  }

  private async fallbackTranscribe(): Promise<void> {
    if (!this.active || this.paused) return;

    const live = `${this.committed}${this.committed && this.interim ? " " : ""}${this.interim}`.trim();
    if (live.length >= this.options.minUtteranceChars) {
      this.finalize(live);
      return;
    }

    if (!this.speechDetected || this.recorderChunks.length === 0) {
      this.scheduleRecognitionRestart(320);
      return;
    }

    this.pause();
    const blob = new Blob(this.recorderChunks, { type: this.recorderMime });
    this.recorderChunks = [];

    try {
      const form = new FormData();
      form.append("audio", blob, "utterance.webm");
      form.append("language", this.options.language);

      const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({})) as { text?: string; error?: string };
      const text = data.text?.trim() ?? "";

      if (text.length >= this.options.minUtteranceChars) {
        this.finalize(text);
        return;
      }

      this.options.onError(data.error || speechRecognitionErrorMessage("network"));
      this.active = false;
    } catch (err) {
      this.options.onError(err instanceof Error ? err.message : speechRecognitionErrorMessage("network"));
      this.active = false;
    }
  }

  private finalize(text: string): void {
    if (this.finalizing) return;
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || clean.length < this.options.minUtteranceChars) return;

    this.finalizing = true;
    this.clearSilenceTimer();
    this.clearRestartTimer();
    this.pause();
    this.committed = "";
    this.interim = "";
    this.options.onFinal(clean);
    this.finalizing = false;
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = null;
  }

  private clearRestartTimer(): void {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = null;
  }
}