import { stripVoiceMarkers } from "@/lib/voice-emotion";

/** Vapi STT/telephony billing — same wording as Rumik but comes from the Vapi SDK, not silk-tts. */
export function isVapiCreditError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("purchase more credit") ||
    /\bbalance\s+is\s+-?\d+/.test(lower) ||
    (lower.includes("insufficient") && lower.includes("credit"))
  );
}

export function vapiCreditErrorMessage(): string {
  return (
    "Vapi credits are low for the deployed API keys. Top up at dashboard.vapi.ai, " +
    "then set VAPI_PUBLIC_KEY and VAPI_PRIVATE_KEY on Vercel and redeploy."
  );
}

/** Rumik SILK TTS billing — only meaningful on silk-tts / local speech playback errors. */
export function isRumikCreditError(message: string): boolean {
  const lower = message.toLowerCase();
  if (isVapiCreditError(message) && !lower.includes("silk") && !lower.includes("rumik")) {
    return false;
  }
  return (
    lower.includes("purchase more credit") ||
    (lower.includes("balance") && lower.includes("credit"))
  );
}

export function rumikCreditErrorMessage(): string {
  return (
    "Rumik SILK credits failed for SILK_API_KEY. Confirm the key on Vercel matches " +
    "playground.rumik.ai where you topped up. Cached FAQ chips still work without live credits."
  );
}

export async function playBrowserSpeechFallback(
  text: string,
  isActive: () => boolean,
  onFirstFrame?: () => void
): Promise<void> {
  if (!isActive()) return;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    throw new Error(rumikCreditErrorMessage());
  }

  const plain = stripVoiceMarkers(text).replace(/\[[^\]]+\]/gi, "").trim();
  if (!plain) return;

  await new Promise<void>((resolve, reject) => {
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = "en-IN";
    utter.rate = 1;
    let first = false;
    utter.onstart = () => {
      if (!first) {
        first = true;
        onFirstFrame?.();
      }
    };
    utter.onend = () => resolve();
    utter.onerror = () => reject(new Error("Browser speech fallback failed."));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  });
}