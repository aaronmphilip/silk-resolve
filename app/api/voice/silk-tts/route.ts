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
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import WebSocket from "ws";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { MUGA_CACHED_AUDIO, NOVACARE_FAQ_AUDIO, cachedMugaAudioForText } from "@/lib/novacare-knowledge";
import { MULBERRY_DEFAULTS, type SilkModel } from "@/lib/silk-voice";
import { getPlatformVoiceConfig } from "@/lib/platform";
import { splitSpeakableSentences } from "@/lib/speakable-sentences";
import { buildMulberryDescription, classifyCallIntent, estimateTension, extractSilkTone, extractVoiceMeta, stripAll, stripVoiceMarkers, withSilkTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";
export const maxDuration = 45;

const SILK_ENDPOINT = process.env.SILK_TTS_URL?.trim() || "https://silk-api.rumik.ai/v1/tts";
const SILK_WS_CONNECT_ENDPOINT = process.env.SILK_TTS_WS_CONNECT_URL?.trim() ||
  SILK_ENDPOINT.replace(/\/v1\/tts\/?$/, "/v1/tts/ws-connect");
const RUMIK_SAMPLE_RATE = 24000;
const SUPPORTED_TARGET_RATES = new Set([8000, 16000, 22050, 24000, 44100]);
// Client keepalive pings every 20s; hold sockets open long enough to survive gaps.
const REUSABLE_WS_IDLE_MS = 30 * 60_000;
const WARM_TEXT = "[neutral] Voice stream ready.";

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

interface ReusableRumikSocket {
  model: SilkModel;
  ws: WebSocket;
  busy: boolean;
  createdAt: number;
  lastUsedAt: number;
  closeTimer?: ReturnType<typeof setTimeout>;
}

const reusableRumikSockets = new Map<SilkModel, ReusableRumikSocket>();
const reusableRumikConnecting = new Map<SilkModel, Promise<ReusableRumikSocket>>();
const cachedAudioFiles = new Map<string, Buffer>();
const cachedAudioVariants = new Map<string, Buffer>();
const mulberryFaqPcmVariants = new Map<string, Buffer>();
const mulberryDiskAudioFiles = new Map<string, Buffer>();
let mulberryFaqWarmPromise: Promise<{ warmed: number; failed: number }> | null = null;

function mulberryFaqDiskFile(id: string): string {
  return `mulberry-${id}-24k.pcm`;
}

function loadMulberryFaqFromDisk(id: string, targetRate: number): Buffer | null {
  const variantKey = mulberryFaqVariantKey(id, targetRate);
  const existing = mulberryFaqPcmVariants.get(variantKey);
  if (existing) return existing;

  try {
    const fileName = mulberryFaqDiskFile(id);
    let audio = mulberryDiskAudioFiles.get(id);
    if (!audio) {
      const filePath = path.join(process.cwd(), "public", "audio", fileName);
      if (!existsSync(filePath)) return null;
      audio = readFileSync(filePath);
      mulberryDiskAudioFiles.set(id, audio);
    }
    const pcm = resamplePcm16Mono(audio, RUMIK_SAMPLE_RATE, targetRate);
    mulberryFaqPcmVariants.set(variantKey, pcm);
    return pcm;
  } catch (err) {
    console.error(`[silk-tts] mulberry disk audio unavailable for ${id}:`, err);
    return null;
  }
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

function cachedVariantKey(id: string, targetRate: number): string {
  return `${id}:${targetRate}`;
}

function mulberryFaqVariantKey(id: string, targetRate: number): string {
  return `mulberry:${id}:${targetRate}`;
}

function getCachedMulberryFaqAudio(text: string, targetRate: number): { id: string; pcm: Buffer } | null {
  const cached = cachedMugaAudioForText(text);
  if (!cached || cached.id.startsWith("lead-")) return null;

  const variantKey = mulberryFaqVariantKey(cached.id, targetRate);
  const pcm = mulberryFaqPcmVariants.get(variantKey) ?? loadMulberryFaqFromDisk(cached.id, targetRate);
  if (!pcm) return null;
  return { id: cached.id, pcm };
}

function mulberryFaqWarmBody(): VoiceRequestBody {
  return {
    model: "mulberry",
    description: MULBERRY_DEFAULTS.description,
    speaker: MULBERRY_DEFAULTS.speaker,
    f0_up_key: MULBERRY_DEFAULTS.f0_up_key,
    temperature: 0.6,
    top_p: 0.95,
    repetition_penalty: 1.2,
  };
}

async function warmSingleMulberryFaqItem(
  item: (typeof NOVACARE_FAQ_AUDIO)[number],
  apiKey: string,
  targetRates = [8000, 16000, 24000]
): Promise<boolean> {
  const missingRates = targetRates.filter(
    (rate) => !mulberryFaqPcmVariants.has(mulberryFaqVariantKey(item.id, rate))
  );
  if (missingRates.length === 0) return true;

  const rumik = await callRumik(apiKey, mulberryFaqWarmBody(), item.text);
  if ("error" in rumik) return false;

  try {
    const wav = parseWav(rumik.wav);
    for (const targetRate of missingRates) {
      const pcm = resamplePcm16Mono(wav.pcm, wav.sampleRate, targetRate);
      mulberryFaqPcmVariants.set(mulberryFaqVariantKey(item.id, targetRate), pcm);
    }
    return true;
  } catch {
    return false;
  }
}

async function ensureMulberryFaqCached(
  text: string,
  targetRate: number,
  apiKey: string
): Promise<{ id: string; pcm: Buffer } | null> {
  const existing = getCachedMulberryFaqAudio(text, targetRate);
  if (existing) return existing;

  const cached = cachedMugaAudioForText(text);
  if (!cached || cached.id.startsWith("lead-")) return null;

  const item = NOVACARE_FAQ_AUDIO.find((entry) => entry.id === cached.id);
  if (!item) return null;

  const warmed = await warmSingleMulberryFaqItem(item, apiKey, [targetRate]);
  if (!warmed) return null;
  return getCachedMulberryFaqAudio(text, targetRate);
}

async function warmMulberryFaqCache(apiKey: string, targetRates = [8000, 16000, 24000]) {
  if (mulberryFaqWarmPromise) return mulberryFaqWarmPromise;

  mulberryFaqWarmPromise = (async () => {
    let warmed = 0;
    let failed = 0;

    for (const item of NOVACARE_FAQ_AUDIO) {
      const ok = await warmSingleMulberryFaqItem(item, apiKey, targetRates);
      if (ok) warmed++;
      else failed++;
    }

    return { warmed, failed };
  })().catch((err) => {
    mulberryFaqWarmPromise = null;
    throw err;
  });

  return mulberryFaqWarmPromise;
}

function getCachedMugaAudio(text: string, targetRate: number): { id: string; pcm: Buffer } | null {
  const cached = cachedMugaAudioForText(text);
  if (!cached) return null;

  try {
    const variantKey = cachedVariantKey(cached.id, targetRate);
    const existingVariant = cachedAudioVariants.get(variantKey);
    if (existingVariant) return { id: cached.id, pcm: existingVariant };

    let audio = cachedAudioFiles.get(cached.id);
    if (!audio) {
      audio = readFileSync(path.join(process.cwd(), "public", "audio", cached.audioFile));
      cachedAudioFiles.set(cached.id, audio);
    }
    const pcm = resamplePcm16Mono(audio, RUMIK_SAMPLE_RATE, targetRate);
    cachedAudioVariants.set(variantKey, pcm);
    return { id: cached.id, pcm };
  } catch (err) {
    console.error(`[silk-tts] cached muga audio unavailable for ${cached.id}:`, err);
    return null;
  }
}

function preloadCachedMugaAudio(targetRates = [RUMIK_SAMPLE_RATE]) {
  let loaded = 0;
  let variantsLoaded = 0;
  for (const cached of MUGA_CACHED_AUDIO) {
    try {
      let audio = cachedAudioFiles.get(cached.id);
      if (!audio) {
        audio = readFileSync(path.join(process.cwd(), "public", "audio", cached.audioFile));
        cachedAudioFiles.set(cached.id, audio);
        loaded++;
      }

      for (const targetRate of targetRates) {
        const key = cachedVariantKey(cached.id, targetRate);
        if (cachedAudioVariants.has(key)) continue;
        cachedAudioVariants.set(key, resamplePcm16Mono(audio, RUMIK_SAMPLE_RATE, targetRate));
        variantsLoaded++;
      }
    } catch (err) {
      console.error(`[silk-tts] cached muga preload failed for ${cached.id}:`, err);
    }
  }
  return { cachedAudioItems: cachedAudioFiles.size, cachedAudioVariants: cachedAudioVariants.size, loaded, variantsLoaded };
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

function resolveSilkModel(req: NextRequest, body: VoiceRequestBody): SilkModel {
  const fromQuery = req.nextUrl.searchParams.get("model");
  if (fromQuery === "mulberry" || fromQuery === "muga") return fromQuery;
  if (body.model === "mulberry" || body.model === "muga") return body.model;
  return "muga";
}

function sanitizeMulberryDescription(description: string): string {
  return description
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function resolveMulberryDescription(body: VoiceRequestBody, text: string): string {
  const { description } = extractVoiceMeta(text);
  if (description) return sanitizeMulberryDescription(description);
  if (typeof body.description === "string" && body.description.trim()) {
    return sanitizeMulberryDescription(body.description);
  }
  return sanitizeMulberryDescription(buildMulberryDescription(estimateTension(""), classifyCallIntent("")));
}

function buildRumikPayload(body: VoiceRequestBody, text: string, modelOverride?: SilkModel): Record<string, unknown> {
  const model = modelOverride ?? body.model ?? "muga";
  const { text: voiceText } = extractVoiceMeta(text);
  const speakable = model === "muga" ? ensureMugaTone(voiceText) : stripVoiceMarkers(voiceText);
  const payload: Record<string, unknown> = {
    model,
    text: speakable,
    temperature: body.temperature ?? (model === "muga" ? 0.55 : undefined),
    top_p: body.top_p ?? (model === "muga" ? 0.92 : undefined),
    top_k: body.top_k,
    repetition_penalty: body.repetition_penalty ?? (model === "muga" ? 1.15 : undefined),
    max_new_tokens: body.max_new_tokens,
  };

  if (model === "mulberry") {
    payload.description = resolveMulberryDescription(body, text);
    payload.speaker = body.speaker || MULBERRY_DEFAULTS.speaker;
    payload.f0_up_key = typeof body.f0_up_key === "number" ? body.f0_up_key : MULBERRY_DEFAULTS.f0_up_key;
  }

  for (const key of Object.keys(payload)) {
    if (payload[key] == null) delete payload[key];
  }

  return payload;
}

function isOpenReusableSocket(socket: ReusableRumikSocket | null): socket is ReusableRumikSocket {
  return Boolean(socket && socket.ws.readyState === WebSocket.OPEN);
}

function clearReusableSocket(model: SilkModel, socket?: ReusableRumikSocket | null) {
  const target = socket ?? reusableRumikSockets.get(model) ?? null;
  if (target?.closeTimer) clearTimeout(target.closeTimer);
  if (target?.ws.readyState === WebSocket.OPEN || target?.ws.readyState === WebSocket.CONNECTING) {
    target.ws.close();
  }
  if (!socket || reusableRumikSockets.get(model) === socket) {
    reusableRumikSockets.delete(model);
  }
}

function scheduleReusableSocketClose(socket: ReusableRumikSocket) {
  if (socket.closeTimer) clearTimeout(socket.closeTimer);
  socket.closeTimer = setTimeout(() => {
    if (!socket.busy && Date.now() - socket.lastUsedAt >= REUSABLE_WS_IDLE_MS) {
      clearReusableSocket(socket.model, socket);
    }
  }, REUSABLE_WS_IDLE_MS);
}

function warmConnectPayload(model: SilkModel, seedText: string): Record<string, unknown> {
  if (model === "mulberry") {
    return {
      model,
      text: stripVoiceMarkers(seedText || WARM_TEXT),
      description: MULBERRY_DEFAULTS.description,
      speaker: MULBERRY_DEFAULTS.speaker,
      f0_up_key: MULBERRY_DEFAULTS.f0_up_key,
    };
  }
  return { model, text: ensureMugaTone(seedText || WARM_TEXT) };
}

async function createReusableRumikSocket(apiKey: string, model: SilkModel, seedText: string): Promise<ReusableRumikSocket> {
  const payload = warmConnectPayload(model, seedText);
  const setupStart = Date.now();

  const connectRes = await fetch(SILK_WS_CONNECT_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });

  if (!connectRes.ok) {
    const err = await connectRes.text().catch(() => "");
    throw new Error(`Rumik ws-connect ${connectRes.status}: ${err.slice(0, 120)}`);
  }

  const session = await connectRes.json() as { ws_url?: string; token?: string };
  if (!session.ws_url || !session.token) {
    throw new Error("Rumik ws-connect missing ws_url/token");
  }

  const ws = new WebSocket(`${session.ws_url}?token=${encodeURIComponent(session.token)}`);
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Rumik websocket open timed out")), 8_000);
    ws.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    ws.once("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  const socket: ReusableRumikSocket = {
    model,
    ws,
    busy: false,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  };

  ws.on("close", () => {
    if (reusableRumikSockets.get(model) === socket) reusableRumikSockets.delete(model);
  });
  ws.on("error", (err) => {
    console.error(`[silk-tts] reusable rumik websocket error (${model}):`, err);
    clearReusableSocket(model, socket);
  });

  console.log(`[silk-tts] reusable rumik websocket ready (${model}) in ${Date.now() - setupStart}ms`);
  scheduleReusableSocketClose(socket);
  return socket;
}

async function getReusableRumikSocket(apiKey: string, model: SilkModel, seedText: string): Promise<ReusableRumikSocket> {
  const existing = reusableRumikSockets.get(model);
  if (isOpenReusableSocket(existing ?? null)) {
    return existing!;
  }

  reusableRumikSockets.delete(model);
  let pending = reusableRumikConnecting.get(model);
  if (!pending) {
    pending = createReusableRumikSocket(apiKey, model, seedText)
      .then((socket) => {
        reusableRumikSockets.set(model, socket);
        return socket;
      })
      .finally(() => {
        reusableRumikConnecting.delete(model);
      });
    reusableRumikConnecting.set(model, pending);
  }

  return pending;
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

async function pipeReadableStreamToController(
  body: ReadableStream<Uint8Array> | null,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<void> {
  if (!body) return;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) controller.enqueue(value);
    }
  } finally {
    reader.releaseLock();
  }
}

async function synthesizeSentenceResponse(
  apiKey: string,
  body: VoiceRequestBody,
  sentence: string,
  sampleRate: number,
  model: SilkModel,
  tone: ReturnType<typeof extractSilkTone>["tone"] = "neutral"
): Promise<NextResponse | { error: string; status: 502 }> {
  const speakable =
    model === "muga"
      ? withSilkTone(tone, stripAll(sentence))
      : stripVoiceMarkers(sentence);

  const cached =
    model === "muga"
      ? getCachedMugaAudio(speakable, sampleRate)
      : getCachedMulberryFaqAudio(stripVoiceMarkers(sentence), sampleRate);

  if (cached) {
    return new NextResponse(new Uint8Array(cached.pcm), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Audio-Format": "pcm_s16le",
        "X-Audio-Sample-Rate": String(sampleRate),
        "X-Audio-Channels": "1",
        "X-Silk-Transport": model === "mulberry" ? "cached-mulberry-faq" : "cached-muga-audio",
        "X-Silk-Cache-Key": cached.id,
        "Content-Length": String(cached.pcm.byteLength),
      },
    });
  }

  const reusable = await streamRumikReusable(apiKey, body, speakable, sampleRate, model);
  if (!("skipped" in reusable) && !("error" in reusable)) return reusable;

  const streamed = await streamRumik(apiKey, body, speakable, sampleRate, model);
  if (!("error" in streamed)) return streamed;
  return streamed;
}

async function streamChainedSentences(
  apiKey: string,
  body: VoiceRequestBody,
  sentences: string[],
  sampleRate: number,
  model: SilkModel,
  tone: ReturnType<typeof extractSilkTone>["tone"] = "neutral"
): Promise<NextResponse | { error: string; status: 502 }> {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const sentence of sentences) {
          const response = await synthesizeSentenceResponse(
            apiKey,
            body,
            sentence,
            sampleRate,
            model,
            tone
          );
          if ("error" in response) {
            controller.error(new Error(response.error));
            return;
          }
          await pipeReadableStreamToController(response.body, controller);
        }
        controller.close();
      } catch (err) {
        controller.error(err instanceof Error ? err : new Error("SILK chained stream failed"));
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Audio-Format": "pcm_s16le",
      "X-Audio-Sample-Rate": String(sampleRate),
      "X-Audio-Channels": "1",
      "X-Silk-Transport": "websocket-chained",
    },
  });
}

async function streamRumik(
  apiKey: string,
  body: VoiceRequestBody,
  text: string,
  targetRate: number,
  model: SilkModel
): Promise<NextResponse | { error: string; status: 502 }> {
  const payload = buildRumikPayload(body, text, model);
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
      body: JSON.stringify(
        model === "mulberry"
          ? {
              model: payload.model,
              text: payload.text,
              description: payload.description,
              speaker: payload.speaker,
              f0_up_key: payload.f0_up_key,
            }
          : { model: payload.model, text: payload.text }
      ),
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

async function streamRumikReusable(
  apiKey: string,
  body: VoiceRequestBody,
  text: string,
  targetRate: number,
  model: SilkModel
): Promise<NextResponse | { skipped: true } | { error: string; status: 502 }> {
  let socket: ReusableRumikSocket;
  try {
    socket = await getReusableRumikSocket(apiKey, model, text);
  } catch (err) {
    console.error(`[silk-tts] reusable websocket setup failed (${model}):`, err);
    return { error: "SILK stream setup failed", status: 502 };
  }

  if (!isOpenReusableSocket(socket) || socket.busy) {
    return { skipped: true };
  }

  socket.busy = true;
  socket.lastUsedAt = Date.now();
  if (socket.closeTimer) clearTimeout(socket.closeTimer);

  const payload = buildRumikPayload(body, text, model);
  const setupStart = Date.now();
  const resampler = makeStreamResampler(RUMIK_SAMPLE_RATE, targetRate);
  const ws = socket.ws;

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      let done = false;
      let firstFrameLogged = false;

      const cleanup = () => {
        ws.off("message", onMessage);
        ws.off("error", onError);
        ws.off("close", onClose);
        socket.busy = false;
        socket.lastUsedAt = Date.now();
        if (isOpenReusableSocket(socket)) {
          scheduleReusableSocketClose(socket);
        }
      };

      const streamTimeout = setTimeout(() => {
        if (!done) {
          done = true;
          cleanup();
          clearReusableSocket(model, socket);
          streamController.error(new Error("SILK stream timed out"));
        }
      }, 42_000);

      const closeCleanly = () => {
        if (done) return;
        done = true;
        clearTimeout(streamTimeout);
        cleanup();
        streamController.close();
      };

      const fail = (err: Error) => {
        if (done) return;
        done = true;
        clearTimeout(streamTimeout);
        cleanup();
        clearReusableSocket(model, socket);
        streamController.error(err);
      };

      function onMessage(data: WebSocket.RawData, isBinary: boolean) {
        if (done) return;

        if (isBinary) {
          if (!firstFrameLogged) {
            firstFrameLogged = true;
            console.log(`[silk-tts] reusable rumik first audio frame in ${Date.now() - setupStart}ms`);
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

        try {
          const event = JSON.parse(data.toString("utf8")) as { type?: string; error?: string | boolean };
          if (event.error) {
            const detail = typeof event.error === "string" ? event.error : "SILK stream failed";
            console.error(`[silk-tts] reusable rumik stream error (${model}):`, detail);
            fail(new Error(detail));
            return;
          }
          if (event.type === "done") closeCleanly();
        } catch {
          closeCleanly();
        }
      }

      function onError(err: Error) {
        console.error("[silk-tts] reusable rumik websocket error:", err);
        fail(err);
      }

      function onClose() {
        if (!done) fail(new Error("SILK stream closed"));
      }

      ws.on("message", onMessage);
      ws.on("error", onError);
      ws.on("close", onClose);
      ws.send(JSON.stringify(payload));
    },
    cancel() {
      socket.busy = false;
      socket.lastUsedAt = Date.now();
      scheduleReusableSocketClose(socket);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Audio-Format": "pcm_s16le",
      "X-Audio-Sample-Rate": String(targetRate),
      "X-Audio-Channels": "1",
      "X-Silk-Transport": "websocket-reuse",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
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

  const { text: rawText, sampleRate } = extractTextAndSampleRate(body);
  if (!rawText) return NextResponse.json({ error: "text required" }, { status: 400 });
  if (!SUPPORTED_TARGET_RATES.has(sampleRate)) {
    return NextResponse.json({ error: `Unsupported sampleRate ${sampleRate}` }, { status: 400 });
  }

  const model = resolveSilkModel(req, body);
  const { description: voiceDescription, text } = extractVoiceMeta(rawText);
  if (voiceDescription && model === "mulberry") {
    body = { ...body, description: voiceDescription };
  }

  // WebSocket streaming is the realtime path: Rumik MUGA audio is piped to Vapi
  // as it is generated (resampled on the fly to whatever rate Vapi asked for),
  // so speech starts on the first frame instead of waiting for the whole WAV.
  // Any setup failure falls through to the buffered REST path below.
  const wantsStream = req.nextUrl.searchParams.get("transport") === "ws";
  if (wantsStream && req.nextUrl.searchParams.get("format") !== "wav") {
    const cached =
      model === "muga"
        ? getCachedMugaAudio(text, sampleRate)
        : model === "mulberry"
          ? getCachedMulberryFaqAudio(text, sampleRate)
          : null;
    if (cached) {
      return new NextResponse(new Uint8Array(cached.pcm), {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
          "X-Audio-Format": "pcm_s16le",
          "X-Audio-Sample-Rate": String(sampleRate),
          "X-Audio-Channels": "1",
          "X-Silk-Transport": model === "mulberry" ? "cached-mulberry-faq" : "cached-muga-audio",
          "X-Silk-Cache-Key": cached.id,
          "Content-Length": String(cached.pcm.byteLength),
        },
      });
    }

    if (model === "mulberry") {
      const lazyCached = await ensureMulberryFaqCached(text, sampleRate, silk.apiKey);
      if (lazyCached) {
        return new NextResponse(new Uint8Array(lazyCached.pcm), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-store",
            "X-Audio-Format": "pcm_s16le",
            "X-Audio-Sample-Rate": String(sampleRate),
            "X-Audio-Channels": "1",
            "X-Silk-Transport": "cached-mulberry-faq",
            "X-Silk-Cache-Key": lazyCached.id,
            "Content-Length": String(lazyCached.pcm.byteLength),
          },
        });
      }
    }

    const { tone, text: plainText } = extractSilkTone(text, "neutral");
    const sentences = splitSpeakableSentences(stripVoiceMarkers(plainText));
    if (sentences.length > 1) {
      const chained = await streamChainedSentences(
        silk.apiKey,
        body,
        sentences,
        sampleRate,
        model,
        tone
      );
      if (!("error" in chained)) return chained;
      console.warn(`[silk-tts] chained stream failed (${model}), falling back to single stream`);
    }

    const reusable = await streamRumikReusable(silk.apiKey, body, text, sampleRate, model);
    if (!("skipped" in reusable) && !("error" in reusable)) return reusable;
    if ("error" in reusable) {
      console.warn(`[silk-tts] reusable stream failed (${model}), falling back to fresh stream:`, reusable.error);
    }

    const streamed = await streamRumik(silk.apiKey, body, text, sampleRate, model);
    if (!("error" in streamed)) return streamed;
    console.warn("[silk-tts] websocket stream failed before audio, falling back to REST:", streamed.error);
    clearReusableSocket(model);
  }

  const rumikBody = { ...body, model };
  const rumik = await callRumik(silk.apiKey, rumikBody, text);
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
  } catch (err) {
    console.error("[silk-tts] unhandled POST error:", err);
    return NextResponse.json({ error: "SILK speech failed" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const { silk } = await getPlatformVoiceConfig();
  if (!silk.apiKey) {
    return NextResponse.json({ error: "SILK not configured" }, { status: 404 });
  }

  const startedAt = Date.now();
  const warmModel = req.nextUrl.searchParams.get("model") === "mulberry" ? "mulberry" : "muga";
  const warmModels: SilkModel[] =
    req.nextUrl.searchParams.get("all") === "1" ? ["muga", "mulberry"] : [warmModel];

  const warmFaq = req.nextUrl.searchParams.get("warmFaq") === "1" ||
    warmModels.includes("mulberry");
  const warmFaqId = req.nextUrl.searchParams.get("faqId")?.trim() || "";

  try {
    const cacheWarm = preloadCachedMugaAudio([8000, 16000, 24000]);
    const targetRates = [8000, 16000, 24000];
    let mulberryFaqWarm: { warmed?: number; failed?: number; id?: string; ok?: boolean; background?: boolean } | null =
      null;

    if (warmFaq && warmFaqId) {
      const item = NOVACARE_FAQ_AUDIO.find((entry) => entry.id === warmFaqId);
      if (item) {
        const ok = await warmSingleMulberryFaqItem(item, silk.apiKey, targetRates);
        mulberryFaqWarm = { id: warmFaqId, ok };
      } else {
        mulberryFaqWarm = { id: warmFaqId, ok: false };
      }
    } else if (warmFaq) {
      after(async () => {
        try {
          await warmMulberryFaqCache(silk.apiKey, targetRates);
        } catch (err) {
          console.error("[silk-tts] background mulberry FAQ warm failed:", err);
        }
      });
      mulberryFaqWarm = { background: true };
    }

    const sockets = await Promise.all(
      warmModels.map(async (model) => {
        const socket = await getReusableRumikSocket(silk.apiKey, model, WARM_TEXT);
        socket.lastUsedAt = Date.now();
        return socket;
      })
    );
    const reusable: Record<string, { open: boolean; busy: boolean }> = {};
    for (let i = 0; i < warmModels.length; i++) {
      reusable[warmModels[i]] = {
        open: isOpenReusableSocket(sockets[i]),
        busy: sockets[i].busy,
      };
    }
    return NextResponse.json(
      {
        ok: true,
        reusable,
        mulberryFaqWarm,
        mulberryFaqCached: mulberryFaqPcmVariants.size,
        ...cacheWarm,
        warmedMs: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[silk-tts] reusable warm failed:", err);
    return NextResponse.json({ error: "SILK warm failed" }, { status: 502 });
  }
}
