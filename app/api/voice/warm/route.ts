/**
 * GET /api/voice/warm
 *
 * Free cold-start killer. An external 5-minute cron (GitHub Actions or
 * cron-job.org) hits this one URL; it fans out and boots the two lambdas Vapi
 * calls mid-conversation so the FIRST turn of a session doesn't pay a cold start.
 *
 * vapi-llm and silk-tts are POST-only, so a GET returns 405 WITHOUT touching
 * Gemini or Rumik — the lambda still cold-starts, which is the whole point and
 * keeps this 100% free (no LLM tokens, no Rumik TTS usage).
 */
import { NextRequest, NextResponse } from "next/server";
import { getPlatformAIConfig, getPlatformVoiceConfig } from "@/lib/platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originOf(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim();
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  return host ? `${proto}://${host}` : "";
}

async function ping(url: string, signal: AbortSignal) {
  const at = Date.now();
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store", signal });
    return { url, status: res.status, ms: Date.now() - at };
  } catch (err) {
    return { url, status: 0, ms: Date.now() - at, error: err instanceof Error ? err.message : "failed" };
  }
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const origin = originOf(req);

  // Warm the shared platform-config + Supabase path inside THIS lambda.
  const configWarm = Promise.allSettled([getPlatformVoiceConfig(), getPlatformAIConfig()]);

  // Boot the lambdas Vapi reaches mid-call. Awaited (not fire-and-forget) so the
  // serverless runtime doesn't freeze before the pings complete.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const pings = origin
    ? await Promise.all([
        ping(`${origin}/api/voice/vapi-llm`, controller.signal),
        ping(`${origin}/api/voice/silk-tts`, controller.signal),
      ])
    : [];
  clearTimeout(timeout);
  await configWarm;

  return NextResponse.json(
    { ok: true, region: process.env.VERCEL_REGION ?? "unknown", warmedMs: Date.now() - startedAt, pings },
    { headers: { "Cache-Control": "no-store" } }
  );
}
