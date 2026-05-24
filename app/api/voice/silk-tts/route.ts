/**
 * POST /api/voice/silk-tts
 *
 * Custom voice server for Rumik SILK — muga model.
 * Vapi calls this when SILK_API_KEY is set in env vars.
 *
 * muga tone is controlled by a [tone] prefix on the text:
 *   neutral (default) | happy | sad | excited | angry | whisper
 *
 * The tone prefix is added by vapi-llm based on PEEK tension level:
 *   0–2  → [happy]    (calm, positive)
 *   3–4  → [neutral]  (professional)
 *   5–6  → [sad]      (empathetic)
 *   7–10 → [whisper]  (de-escalating)
 *
 * Returns 24 kHz mono WAV.
 * On error → 502 so Vapi falls back to its built-in voice automatically.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformVoiceConfig } from "@/lib/platform";

export const runtime = "nodejs";

const SILK_ENDPOINT = "https://silk-api.rumik.ai/v1/tts";

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
    const silkRes = await fetch(SILK_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${silk.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "muga",
        text,           // [tone] prefix already embedded by vapi-llm
      }),
    });

    if (!silkRes.ok) {
      const err = await silkRes.text();
      console.error("[silk-tts] error:", silkRes.status, err);
      return NextResponse.json({ error: `SILK error ${silkRes.status}` }, { status: 502 });
    }

    // muga returns 24 kHz mono WAV
    return new NextResponse(silkRes.body, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });

  } catch (err) {
    console.error("[silk-tts] fetch error:", err);
    return NextResponse.json({ error: "SILK unavailable" }, { status: 502 });
  }
}
