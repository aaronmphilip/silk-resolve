/**
 * POST /api/voice/tts
 * Proxies text through ElevenLabs for neural voice synthesis.
 * Returns audio/mpeg stream. Used by advanced voice pipelines only.
 * Falls back gracefully — if no ElevenLabs key, returns 404 and TwiML uses Polly.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformVoiceConfig } from "@/lib/platform";
import { stripTags } from "@/lib/twiml";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text?: string };
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const { elevenlabs } = await getPlatformVoiceConfig();
  if (!elevenlabs.apiKey) {
    return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 404 });
  }

  // Strip SILK/SSML tags — ElevenLabs handles prosody differently
  const plain = stripTags(text);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabs.voiceId}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenlabs.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: plain,
          model_id: "eleven_turbo_v2",       // lowest latency model
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[voice/tts] ElevenLabs error:", err);
      return NextResponse.json({ error: "TTS failed" }, { status: 502 });
    }

    // Stream audio back
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[voice/tts] fetch error:", err);
    return NextResponse.json({ error: "TTS unavailable" }, { status: 502 });
  }
}
