import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

const DEFAULT_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";
const TIMEOUT_MS = 8_000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  const language = String(form?.get("language") ?? "en-IN").trim() || "en-IN";

  if (!(audio instanceof Blob) || audio.size < 64) {
    return Response.json({ error: "Audio payload is missing or too small." }, { status: 400 });
  }

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const base64 = Buffer.from(bytes).toString("base64");
  const mimeType = audio.type || "audio/webm";

  const model = DEFAULT_MODEL.startsWith("gemini-") ? DEFAULT_MODEL : "gemini-2.5-flash-lite";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "Transcribe the caller audio exactly. Return only the spoken words with normal punctuation. No commentary.",
          }],
        },
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: `Language hint: ${language}` },
          ],
        }],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0,
        },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return Response.json({ error: detail.slice(0, 200) || "Transcription failed." }, { status: 502 });
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
  return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
}