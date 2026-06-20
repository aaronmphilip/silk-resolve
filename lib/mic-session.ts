let activeStream: MediaStream | null = null;

export async function acquireMicrophoneStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported in this browser.");
  }

  if (activeStream?.active) return activeStream;

  activeStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  return activeStream;
}

export function releaseMicrophoneStream(): void {
  if (!activeStream) return;
  for (const track of activeStream.getTracks()) track.stop();
  activeStream = null;
}

export function hasActiveMicrophone(): boolean {
  return Boolean(activeStream?.active);
}