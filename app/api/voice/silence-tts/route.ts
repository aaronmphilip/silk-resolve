/**
 * POST /api/voice/silence-tts
 *
 * Vapi custom-voice stub for browser-side SILK playback.
 * Returns a short stretch of valid zero PCM so Vapi never plays corrupt/static
 * audio while the browser speaks through Rumik MUGA / Mulberry directly.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPPORTED_RATES = new Set([8000, 16000, 22050, 24000, 44100]);

function extractSampleRate(body: Record<string, unknown>): number {
  const message = body.message as { sampleRate?: number } | undefined;
  if (typeof message?.sampleRate === "number") return message.sampleRate;
  if (typeof body.sampleRate === "number") return body.sampleRate;
  return 24000;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const sampleRate = extractSampleRate(body);
  if (!SUPPORTED_RATES.has(sampleRate)) {
    return NextResponse.json({ error: `Unsupported sampleRate ${sampleRate}` }, { status: 400 });
  }

  // ~60ms of silence — enough for Vapi to complete the voice-request turn.
  const samples = Math.max(1, Math.floor(sampleRate * 0.06));
  const pcm = Buffer.alloc(samples * 2);

  return new NextResponse(new Uint8Array(pcm), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Audio-Format": "pcm_s16le",
      "X-Audio-Sample-Rate": String(sampleRate),
      "X-Audio-Channels": "1",
      "X-Silk-Transport": "silence-stub",
      "Content-Length": String(pcm.byteLength),
    },
  });
}