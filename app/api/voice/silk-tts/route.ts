/**
 * POST /api/voice/silk-tts
 *
 * Adapter from Vapi custom-voice requests to Rumik SILK.
 *
 * Vapi sends:
 *   { message: { type: "voice-request", text, sampleRate } }
 *
 * Rumik REST returns:
 *   24 kHz mono WAV
 *
 * Vapi expects:
 *   raw PCM int16 little-endian mono at message.sampleRate
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformVoiceConfig } from "@/lib/platform";
import { extractSilkTone, stripVoiceMarkers, withSilkTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";

const SILK_ENDPOINT = process.env.SILK_TTS_URL?.trim() || "https://silk-api.rumik.ai/v1/tts";
const RUMIK_SAMPLE_RATE = 24000;
const SUPPORTED_TARGET_RATES = new Set([8000, 16000, 22050, 24000, 44100]);

type VoiceRequestBody = {
  message?: {
    type?: string;
    text?: string;
    sampleRate?: number;
  };
  text?: string;
  model?: "muga" | "mulberry";
  description?: string;
  speaker?: string;
  f0_up_key?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repetition_penalty?: number;
  max_new_tokens?: number;
};

interface WavData {
  pcm: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
}

function extractTextAndSampleRate(body: VoiceRequestBody) {
  const message = body.message;
  const text = typeof message?.text === "string" ? message.text : body.text;
  const sampleRate = typeof message?.sampleRate === "number" ? message.sampleRate : RUMIK_SAMPLE_RATE;

  return {
    text: (text ?? "").trim(),
    sampleRate,
  };
}

function ensureMugaTone(text: string): string {
  const { tone, text: clean } = extractSilkTone(text, "neutral");
  return withSilkTone(tone, clean);
}

function parseWav(buffer: Buffer): WavData {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Rumik did not return a WAV file");
  }

  let offset = 12;
  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let data: Buffer | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;

    if (chunkEnd > buffer.length) break;

    if (chunkId === "fmt ") {
      audioFormat = buffer.readUInt16LE(chunkStart);
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    }

    if (chunkId === "data") {
      data = buffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  if (!data) throw new Error("Rumik WAV response did not include a data chunk");
  if (audioFormat !== 1) throw new Error(`Unsupported WAV format: ${audioFormat}`);
  if (channels !== 1) throw new Error(`Unsupported channel count: ${channels}`);
  if (bitsPerSample !== 16) throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);

  return { pcm: data, sampleRate, channels, bitsPerSample };
}

function resamplePcm16Mono(input: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return input;

  const inputSamples = input.length / 2;
  const outputSamples = Math.max(1, Math.round(inputSamples * toRate / fromRate));
  const output = Buffer.allocUnsafe(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcPos = i * (fromRate / toRate);
    const leftIndex = Math.floor(srcPos);
    const rightIndex = Math.min(inputSamples - 1, leftIndex + 1);
    const weight = srcPos - leftIndex;

    const left = input.readInt16LE(leftIndex * 2);
    const right = input.readInt16LE(rightIndex * 2);
    const sample = Math.round(left + (right - left) * weight);
    output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }

  return output;
}

async function callRumik(apiKey: string, body: VoiceRequestBody, text: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18500);

  try {
    const model = body.model || "muga";
    const payload: Record<string, unknown> = {
      model,
      text: model === "muga" ? ensureMugaTone(text) : stripVoiceMarkers(text),
      temperature: body.temperature,
      top_p: body.top_p,
      top_k: body.top_k,
      repetition_penalty: body.repetition_penalty,
      max_new_tokens: body.max_new_tokens,
    };

    if (model === "mulberry") {
      payload.description = body.description || "warm, calm, professional voice";
      if (body.speaker) payload.speaker = body.speaker;
      if (typeof body.f0_up_key === "number") payload.f0_up_key = body.f0_up_key;
    }

    for (const key of Object.keys(payload)) {
      if (payload[key] == null) delete payload[key];
    }

    const silkRes = await fetch(SILK_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!silkRes.ok) {
      const err = await silkRes.text();
      console.error("[silk-tts] rumik error:", silkRes.status, err);
      return { error: `SILK error ${silkRes.status}`, status: 502 as const };
    }

    return { wav: Buffer.from(await silkRes.arrayBuffer()) };
  } catch (err) {
    console.error("[silk-tts] rumik fetch error:", err);
    return { error: err instanceof Error && err.name === "AbortError" ? "SILK timed out" : "SILK unavailable", status: 502 as const };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  const { silk } = await getPlatformVoiceConfig();

  if (!silk.apiKey) {
    return NextResponse.json({ error: "SILK not configured" }, { status: 404 });
  }

  let body: VoiceRequestBody;
  try {
    body = await req.json() as VoiceRequestBody;
  } catch {
    return NextResponse.json({ error: "Malformed request body" }, { status: 400 });
  }

  const { text, sampleRate } = extractTextAndSampleRate(body);
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (!SUPPORTED_TARGET_RATES.has(sampleRate)) {
    return NextResponse.json({ error: `Unsupported sampleRate ${sampleRate}` }, { status: 400 });
  }

  const rumik = await callRumik(silk.apiKey, body, text);
  if ("error" in rumik) {
    return NextResponse.json({ error: rumik.error }, { status: rumik.status });
  }

  try {
    const wav = parseWav(rumik.wav);
    const pcm = resamplePcm16Mono(wav.pcm, wav.sampleRate, sampleRate);

    if (req.nextUrl.searchParams.get("format") === "wav") {
      return new NextResponse(new Uint8Array(rumik.wav), {
        headers: {
          "Content-Type": "audio/wav",
          "Cache-Control": "no-store",
        },
      });
    }

    return new NextResponse(new Uint8Array(pcm), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Audio-Format": "pcm_s16le",
        "X-Audio-Sample-Rate": String(sampleRate),
        "X-Audio-Channels": "1",
      },
    });
  } catch (err) {
    console.error("[silk-tts] audio conversion error:", err);
    return NextResponse.json({ error: "SILK audio conversion failed" }, { status: 502 });
  }
}
