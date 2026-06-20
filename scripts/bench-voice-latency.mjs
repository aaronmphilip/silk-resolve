const BASE = process.env.BASE_URL?.trim() || "https://silk-resolve.vercel.app";

const PLANS_TEXT =
  "For NovaCare, Basic is four hundred ninety nine rupees per month for one adult. Standard is eight hundred ninety nine rupees for two adults and two children. Premium is one thousand four hundred ninety nine rupees for a full family. For most families, Standard is the practical starting point.";

const OPD_TEXT =
  "Yes, NovaCare Standard and Premium include O P D cover. Standard gives up to ten thousand rupees per year, and Premium gives up to twenty five thousand rupees per year for doctor visits, diagnostics, and pharmacy.";

const UNCACHED_Q = "Compare cashless vs reimbursement if pre-auth is delayed";

async function timeLlm(question, voice) {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/voice/vapi-llm?voice=${voice}&fast=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stream: false,
      messages: [
        { role: "system", content: "NovaCare support" },
        { role: "user", content: question },
      ],
    }),
  });
  const ms = Date.now() - started;
  if (!res.ok) throw new Error(`llm ${voice} ${res.status}`);
  return ms;
}

async function timeTts(text, model, tone = "neutral") {
  const payloadText = model === "muga" ? `[${tone}] ${text}` : `[[voice:desc=warm, calm, professional female narrator for health insurance support]] ${text}`;
  const started = Date.now();
  const res = await fetch(`${BASE}/api/voice/silk-tts?transport=ws&model=${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { type: "voice-request", text: payloadText, sampleRate: 24000 },
    }),
  });
  const ms = Date.now() - started;
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`tts ${model} ${res.status}: ${err.slice(0, 120)}`);
  }
  const transport = res.headers.get("x-silk-transport") || "unknown";
  const bytes = Number(res.headers.get("content-length") || 0);
  let firstByteMs = null;
  let pcmChunks = 0;
  if (res.body) {
    const reader = res.body.getReader();
    const ttfbStart = Date.now();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (firstByteMs === null) firstByteMs = Date.now() - ttfbStart;
      if (value?.byteLength >= 2) pcmChunks += 1;
    }
  }
  return { ms, transport, bytes, firstByteMs, pcmChunks, under1s: firstByteMs !== null && firstByteMs < 1000 };
}

function estimateSpeechToSpeech(eotMs, llmMs, ttsMs) {
  return eotMs + llmMs + ttsMs + 80;
}

async function safe(label, fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), label };
  }
}

async function main() {
  const EOT_MS = 500;
  const results = [];

  for (const voice of ["silk", "silk-mulberry"]) {
    const model = voice === "silk-mulberry" ? "mulberry" : "muga";
    const llmPlans = await safe("llm-plans", () => timeLlm("What plans do you offer?", voice));
    const llmOpd = await safe("llm-opd", () => timeLlm("Does NovaCare cover OPD?", voice));
    const llmUncached = await safe("llm-uncached", () => timeLlm(UNCACHED_Q, voice));
    const ttsPlansCached = await safe("tts-plans", () => timeTts(PLANS_TEXT, model));
    const ttsOpdCached = await safe("tts-opd", () => timeTts(OPD_TEXT, model));
    const ttsUncached = await safe(
      "tts-uncached",
      () => timeTts("Cashless is faster at network hospitals, while reimbursement works after you pay and submit documents.", model, "sad")
    );

    const entry = { model: model.toUpperCase(), llm: {}, tts: {}, speechToSpeech: {} };
    if (llmPlans.ok) entry.llm.plans = llmPlans.value;
    else entry.llm.plansError = llmPlans.error;
    if (llmOpd.ok) entry.llm.opd = llmOpd.value;
    else entry.llm.opdError = llmOpd.error;
    if (llmUncached.ok) entry.llm.uncached = llmUncached.value;
    else entry.llm.uncachedError = llmUncached.error;
    if (ttsPlansCached.ok) entry.tts.plansCached = ttsPlansCached.value;
    else entry.tts.plansError = ttsPlansCached.error;
    if (ttsOpdCached.ok) entry.tts.opdCached = ttsOpdCached.value;
    else entry.tts.opdError = ttsOpdCached.error;
    if (ttsUncached.ok) entry.tts.uncached = ttsUncached.value;
    else entry.tts.uncachedError = ttsUncached.error;

    if (llmPlans.ok && ttsPlansCached.ok) {
      entry.speechToSpeech.cachedPlans = estimateSpeechToSpeech(EOT_MS, llmPlans.value, ttsPlansCached.value.ms);
    }
    if (llmOpd.ok && ttsOpdCached.ok) {
      entry.speechToSpeech.cachedOpd = estimateSpeechToSpeech(EOT_MS, llmOpd.value, ttsOpdCached.value.ms);
    }
    if (llmUncached.ok && ttsUncached.ok) {
      entry.speechToSpeech.uncached = estimateSpeechToSpeech(EOT_MS, llmUncached.value, ttsUncached.value.ms);
    }

    results.push(entry);
  }

  console.log(JSON.stringify({
    base: BASE,
    eotFloorMs: EOT_MS,
    note: "firstByteMs = time-to-first-PCM (streaming). speechToSpeech adds 500ms EOT floor for voice calls.",
    results,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});