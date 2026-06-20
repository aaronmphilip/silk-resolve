import { stripVoiceMarkers } from "@/lib/voice-emotion";

/** Rumik returns this when SILK_API_KEY account balance is negative. */
export function isRumikCreditError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("purchase more credit") ||
    (lower.includes("balance") && lower.includes("credit"))
  );
}

export function rumikCreditErrorMessage(): string {
  return "Rumik SILK voice credits are exhausted. Top up at playground.rumik.ai — cached FAQ chips still work.";
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