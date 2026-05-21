/**
 * POST /api/voice/silk-tts
 *
 * Custom voice proxy for Rumik SILK model.
 * Vapi calls this endpoint when silk.apiKey is configured.
 *
 * Vapi sends: { message: string, ...callContext }
 * We proxy to Rumik's SILK API and stream audio back.
 *
 * ⚠️  The exact Rumik API shape is filled in once you get the API key.
 *     The structure below matches the most common TTS REST API pattern.
 *     Update SILK_REQUEST_BODY and the endpoint URL when Rumik shares docs.
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
  const text = body.message ?? body.text ?? "";

  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    // ── Rumik SILK API call ──────────────────────────────────────────────────
    // UPDATE THIS when you get the SILK API docs:
    //   1. Change the endpoint URL if different
    //   2. Update the request body shape to match their spec
    //   3. Update the auth header if different from "Authorization: Bearer"
    // ────────────────────────────────────────────────────────────────────────

    const silkRes = await fetch(`${silk.baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${silk.apiKey}`,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        model:  silk.voiceId || "silk-1",   // SILK model name — update when known
        input:  text,
        voice:  "default",                   // update with actual voice ID
        format: "mp3",
      }),
    });

    if (!silkRes.ok) {
      const err = await silkRes.text();
      console.error("[silk-tts] API error:", silkRes.status, err);

      // Fallback — return error so Vapi can use its built-in voice
      return NextResponse.json(
        { error: `SILK API error ${silkRes.status}` },
        { status: 502 }
      );
    }

    // Stream audio directly back to Vapi
    return new NextResponse(silkRes.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });

  } catch (err) {
    console.error("[silk-tts] fetch error:", err);
    return NextResponse.json({ error: "SILK TTS unavailable" }, { status: 502 });
  }
}
