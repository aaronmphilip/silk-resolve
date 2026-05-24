/**
 * POST /api/voice/silk-tts
 *
 * Custom voice server for Rumik SILK model.
 * Vapi calls this when SILK_API_KEY is set in env vars.
 * If SILK returns an error, Vapi automatically falls back to its built-in voice.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformVoiceConfig } from "@/lib/platform";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { silk } = await getPlatformVoiceConfig();

  if (!silk.apiKey) {
    return NextResponse.json({ error: "SILK not configured" }, { status: 404 });
  }

  const body = await req.json() as { message?: string; text?: string };
  const text = (body.message ?? body.text ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    const silkRes = await fetch(`${silk.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${silk.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        model:  silk.voiceId || "silk-1",
        input:  text,
        format: "mp3",
      }),
    });

    if (!silkRes.ok) {
      const err = await silkRes.text();
      console.error("[silk-tts] error:", silkRes.status, err);
      return NextResponse.json({ error: `SILK error ${silkRes.status}` }, { status: 502 });
    }

    return new NextResponse(silkRes.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });

  } catch (err) {
    console.error("[silk-tts] fetch error:", err);
    return NextResponse.json({ error: "SILK unavailable" }, { status: 502 });
  }
}
