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
import WebSocket from "ws";
import { getPlatformVoiceConfig } from "@/lib/platform";
import { extractSilkTone, stripAll, stripVoiceMarkers, withSilkTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";
export const maxDuration = 45;

const SILK_ENDPOINT = process.env.SILK_TTS_URL?.trim() || "https://silk-api.rumik.ai/v1/tts";
const SILK_WS_CONNECT_ENDPOINT = process.env.SILK_TTS_WS_CONNECT_URL?.trim() ||
  SILK_ENDPOINT.replace(/\/v1\/tts\/?$/, "/v1/tts/ws-connect");
const RUMIK_SAMPLE_RATE = 24000;
const SUPPORTED_TARGET_RATES = new Set([8000, 16000, 22050, 24000, 44100]);

type VoiceRequestBody = {
  type?: string;
  sampleRate?: number;
  timestamp?: number;
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
  const sampleRate =
    typeof message?.sampleRate === "number" ? message.sampleRate :
    typeof body.sampleRate === "number" ? body.sampleRate :
    RUMIK_SAMPLE_RATE;

  return {
    text: (text ?? "").trim(),
    sampleRate,
  };
}

function ensureMugaTone(text: string): string {
  const { tone, text: clean } = extractSilkTone(text, "neutral");
  return withSilkTone(tone, stripAll(clean));
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

/**
 * Streaming linear resampler for PCM16 mono.
 *
 * The REST resampler above works on a whole buffer at once. For the WebSocket
 * path we get audio in arbitrary-sized frames, so we keep phase across calls
 * (prev sample, fractional output position, odd-byte carry) — that means no
 * clicks or pitch drift at frame boundaries. Identity (zero-copy) when rates
 * already match, which is the common 24 kHz web-call case.
 */
function makeStreamResampler(fromRate: number, toRate: number) {
  if (fromRate === toRate) {
    return { push: (chunk: Buffer) => chunk };
  }

  const step = fromRate / toRate; // input samples consumed per output sample
  let carry: number | null = null; // leftover odd byte split across frames
  let prev = 0;
  let havePrev = false;
  let nextT = 0; // next output position, in input-sample units
  let i = 0;     // global index of the next incoming input sample

  return {
    push(chunk: Buffer): Buffer {
      let input = chunk;
      if (carry !== null) {
        input = Buffer.concat([Buffer.from([carry]), chunk]);
        carry = null;
      }
      if (input.length % 2 === 1) {
        carry = input[input.length - 1];
        input = input.subarray(0, input.length - 1);
      }

      const n = input.length >> 1;
      if (n === 0) return Buffer.alloc(0);

      const out: number[] = [];
      for (let s = 0; s < n; s++) {
        const cur = input.readInt16LE(s << 1);
        if (!havePrev) { prev = cur; havePrev = true; i = 1; continue; }
        while (nextT < i) {
          const frac = nextT - (i - 1);
          out.push(prev + (cur - prev) * frac);
          nextT += step;
        }
        prev = cur;
        i++;
      }

      const buf = Buffer.allocUnsafe(out.length << 1);
      for (let k = 0; k < out.length; k++) {
        const v = Math.round(out[k]);
        buf.writeInt16LE(v < -32768 ? -32768 : v > 32767 ? 32767 : v, k << 1);
      }
      return buf;
    },
  };
}

function buildRumikPayload(body: VoiceRequestBody, text: string): Record<string, unknown> {
  const model = body.model || "muga";
  const payload: Record<string, unknown> = {
    model,
    text: model === "muga" ? ensureMugaTone(text) : stripVoiceMarkers(text),
    temperature: body.temperature ?? (model === "muga" ? 0.55 : undefined),
    top_p: body.top_p ?? (model === "muga" ? 0.92 : undefined),
    top_k: body.top_k,
    repetition_penalty: body.repetition_penalty ?? (model === "muga" ? 1.15 : undefined),
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

  return payload;
}

async function callRumik(apiKey: string, body: VoiceRequestBody, text: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 42_000);

  try {
    const payload = buildRumikPayload(body, text);

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

async function streamRumik(
  apiKey: string,
  body: VoiceRequestBody,
  text: string,
  targetRate: number
): Promise<NextResponse | { error: string; status: 502 }> {
  const payload = buildRumikPayload(body, text);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8_000);
  const setupStart = Date.now();

  try {
    const connectRes = await fetch(SILK_WS_CONNECT_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: payload.model, text: payload.text }),
      signal: controller.signal,
    });

    if (!connectRes.ok) {
      const err = await connectRes.text().catch(() => "");
      console.error("[silk-tts] rumik ws-connect error:", connectRes.status, err);
      return { error: "SILK stream setup failed", status: 502 };
    }

    const session = await connectRes.json() as { ws_url?: string; token?: string };
    if (!session.ws_url || !session.token) {
      console.error("[silk-tts] rumik ws-connect missing ws_url/token");
      return { error: "SILK stream setup failed", status: 502 };
    }

    console.log(`[silk-tts] rumik ws-connect ready in ${Date.now() - setupStart}ms`);
    const wsUrl = `${session.ws_url}?token=${encodeURIComponent(session.token)}`;
    const stream = new ReadableStream<Uint8Array>({
      start(streamController) {
        let done = false;
        let firstFrameLogged = false;
        const resampler = makeStreamResampler(RUMIK_SAMPLE_RATE, targetRate);
        const ws = new WebSocket(wsUrl);
        const streamTimeout = setTimeout(() => {
          if (!done) {
            done = true;
            ws.close();
            streamController.error(new Error("SILK stream timed out"));
          }
        }, 42_000);

        const closeCleanly = () => {
          if (done) return;
          done = true;
          clearTimeout(streamTimeout);
          streamController.close();
          ws.close();
        };

        ws.on("open", () => {
          ws.send(JSON.stringify(payload));
        });

        ws.on("message", (data, isBinary) => {
          if (done) return;

          if (isBinary) {
            if (!firstFrameLogged) {
              firstFrameLogged = true;
              console.log(`[silk-tts] rumik first audio frame in ${Date.now() - setupStart}ms`);
            }
            const chunk = Buffer.isBuffer(data)
              ? data
              : Array.isArray(data)
                ? Buffer.concat(data)
                : Buffer.from(data as ArrayBuffer);
            if (chunk.length > 0) {
              const out = resampler.push(chunk);
              if (out.length > 0) streamController.enqueue(new Uint8Array(out));
            }
            return;
          }

          const textFrame = data.toString("utf8");
          try {
            const event = JSON.parse(textFrame) as { type?: string; error?: string };
            if (event.error) {
              done = true;
              clearTimeout(streamTimeout);
              ws.close();
              streamController.error(new Error(event.error));
              return;
            }
            if (event.type === "done") closeCleanly();
          } catch {
            closeCleanly();
          }
        });

        ws.on("error", (err) => {
          if (done) return;
          done = true;
          clearTimeout(streamTimeout);
          console.error("[silk-tts] rumik websocket error:", err);
          streamController.error(err);
        });

        ws.on("close", () => {
          if (!done) closeCleanly();
        });
      },
      cancel() {},
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Audio-Format": "pcm_s16le",
        "X-Audio-Sample-Rate": String(targetRate),
        "X-Audio-Channels": "1",
        "X-Silk-Transport": "websocket",
      },
    });
  } catch (err) {
    console.error("[silk-tts] rumik stream setup error:", err);
    return { error: "SILK stream unavailable", status: 502 };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: NextRequest) {
  const { silk } = await getPlatformVoiceConfig();

  if (!silk.apiKey) {
    return NextResponse.json({ error: "SILK not configured" }, { status: 404 });
  }

  // TEMPORARY: ?debug=rumik breaks Rumik latency into its finest parts —
  // connect (HTTP), socket-open (WS handshake), and synth (open->first audio) —
  // so we can see exactly where the seconds go. ?text=... overrides the phrase.
  if (req.nextUrl.searchParams.get("debug") === "rumik") {
    const probeText = req.nextUrl.searchParams.get("text")?.trim() || "I can help you with that today.";
    const payload = buildRumikPayload({}, probeText);
    const t0 = Date.now();
    try {
      const connectRes = await fetch(SILK_WS_CONNECT_ENDPOINT, {
        method: "POST",
        headers: { "Authorization": `Bearer ${silk.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: payload.model, text: payload.text }),
      });
      const connectMs = Date.now() - t0;
      if (!connectRes.ok) {
        const e = await connectRes.text().catch(() => "");
        return NextResponse.json({ debug: "rumik", connectMs, connectStatus: connectRes.status, error: e.slice(0, 200) });
      }
      const session = await connectRes.json() as { ws_url?: string; token?: string };
      if (!session.ws_url || !session.token) {
        return NextResponse.json({ debug: "rumik", connectMs, error: "missing ws_url/token" });
      }
      const wsUrl = `${session.ws_url}?token=${encodeURIComponent(session.token)}`;
      const r = await new Promise<{ openMs: number; sentMs: number; firstFrameMs: number; frames: number; reason: string }>((resolve) => {
        let openMs = 0, sentMs = 0, firstFrameMs = 0, frames = 0, settled = false;
        const ws = new WebSocket(wsUrl);
        const to = setTimeout(() => finish("timeout"), 20_000);
        function finish(reason: string) {
          if (settled) return;
          settled = true;
          clearTimeout(to);
          try { ws.close(); } catch {}
          resolve({ openMs, sentMs, firstFrameMs, frames, reason });
        }
        ws.on("open", () => { openMs = Date.now() - t0; ws.send(JSON.stringify(payload)); sentMs = Date.now() - t0; });
        ws.on("message", (data, isBinary) => {
          if (isBinary) {
            if (!firstFrameMs) firstFrameMs = Date.now() - t0;
            frames++;
            if (frames >= 2) finish("frames");
          } else {
            try {
              const ev = JSON.parse(data.toString("utf8")) as { type?: string; error?: string };
              if (ev.error) finish("err:" + ev.error);
              else if (ev.type === "done") finish("done");
            } catch {}
          }
        });
        ws.on("error", (err) => finish("wserr:" + (err instanceof Error ? err.message : String(err))));
        ws.on("close", () => finish("closed"));
      });
      return NextResponse.json({
        debug: "rumik", model: payload.model, chars: payload.text ? String(payload.text).length : 0,
        connectMs,
        socketOpenMs: r.openMs - connectMs,
        synthMs: r.firstFrameMs ? r.firstFrameMs - r.openMs : -1,
        firstFrameMs: r.firstFrameMs,
        reason: r.reason,
        wsHost: session.ws_url,
      });
    } catch (err) {
      return NextResponse.json({ debug: "rumik", error: err instanceof Error ? err.message : String(err) });
    }
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

  // WebSocket streaming is the realtime path: Rumik MUGA audio is piped to Vapi
  // as it is generated (resampled on the fly to whatever rate Vapi asked for),
  // so speech starts on the first frame instead of waiting for the whole WAV.
  // Any setup failure falls through to the buffered REST path below.
  const wantsStream = req.nextUrl.searchParams.get("transport") === "ws";
  if (wantsStream && req.nextUrl.searchParams.get("format") !== "wav") {
    const streamed = await streamRumik(silk.apiKey, body, text, sampleRate);
    if (!("error" in streamed)) return streamed;
    console.warn("[silk-tts] websocket stream failed before audio, falling back to REST:", streamed.error);
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
