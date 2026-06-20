export interface SpeechLanguageOption {
  code: string;
  label: string;
}

/** BCP-47 tags supported by Chrome / Edge Web Speech API. */
export const SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-IN", label: "English (India)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "mr-IN", label: "Marathi" },
  { code: "bn-IN", label: "Bengali" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "pa-IN", label: "Punjabi" },
];

export const DEFAULT_SPEECH_LANGUAGE = "en-IN";

const STORAGE_KEY = "silk-resolve-speech-lang";

export function loadSpeechLanguage(): string {
  if (typeof window === "undefined") return DEFAULT_SPEECH_LANGUAGE;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SPEECH_LANGUAGES.some((item) => item.code === saved)) return saved;
  } catch {}
  return DEFAULT_SPEECH_LANGUAGE;
}

export function saveSpeechLanguage(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {}
}

export function speechRecognitionErrorMessage(code: string): string {
  switch (code) {
    case "network":
      return "Speech recognition could not reach the browser service. Check your internet connection, allow microphone access, and tap Start call again.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow mic permission for this site in your browser settings, then tap Start call again.";
    case "audio-capture":
      return "No microphone was detected. Connect a mic or switch to a device with one, then retry.";
    case "no-speech":
      return "I did not hear anything. Try speaking a little louder and closer to the mic.";
    case "aborted":
      return "";
    default:
      return code ? `Speech recognition failed (${code}). Tap Start call to try again.` : "Speech recognition failed. Tap Start call to try again.";
  }
}

export async function ensureMicrophoneAccess(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) track.stop();
}