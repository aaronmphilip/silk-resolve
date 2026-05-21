/**
 * Platform-level settings — stored in platform_settings table.
 * Always accessed via service role (bypasses RLS).
 * API keys never returned to the client — server-side only.
 */
import { createClient } from "@supabase/supabase-js";
import type { AIProvider } from "./ai";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Get all platform settings as a flat key→value map */
export async function getPlatformSettings(): Promise<Record<string, string>> {
  try {
    const { data } = await svc()
      .from("platform_settings")
      .select("key, value");
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
  } catch {
    return {};
  }
}

/** Upsert a single platform setting */
export async function setPlatformSetting(key: string, value: string): Promise<void> {
  await svc()
    .from("platform_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() });
}

/** Upsert multiple settings */
export async function setPlatformSettings(pairs: Record<string, string>): Promise<void> {
  const rows = Object.entries(pairs).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));
  await svc().from("platform_settings").upsert(rows);
}

/**
 * Get the AI config for script generation.
 * Priority: platform_settings DB → env vars → error.
 */
export async function getPlatformAIConfig(): Promise<{ provider: AIProvider; apiKey: string }> {
  const s = await getPlatformSettings();
  const provider = (s.ai_provider as AIProvider) ?? "anthropic";
  const apiKey =
    s.ai_api_key ??
    (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ??
    (provider === "openai"    ? process.env.OPENAI_API_KEY    : null) ??
    (provider === "gemini"    ? process.env.GEMINI_API_KEY    : null) ??
    (provider === "xai"       ? process.env.XAI_API_KEY       : null) ??
    "";
  return { provider, apiKey };
}

/**
 * Get voice provider config.
 * Priority for voice synthesis: SILK (Rumik) → ElevenLabs → Vapi built-in.
 * Keys never leave the server.
 */
export async function getPlatformVoiceConfig() {
  const s = await getPlatformSettings();
  return {
    vapi: {
      apiKey:      s.vapi_api_key      ?? process.env.VAPI_API_KEY      ?? "",
      phoneNumber: s.vapi_phone_number ?? process.env.VAPI_PHONE_NUMBER ?? "",
    },
    // Rumik SILK — add key here when available, system auto-switches
    silk: {
      apiKey:  s.silk_api_key  ?? process.env.SILK_API_KEY  ?? "",
      voiceId: s.silk_voice_id ?? process.env.SILK_VOICE_ID ?? "",  // optional model/voice ID
      baseUrl: s.silk_base_url ?? process.env.SILK_BASE_URL ?? "https://api.rumik.ai/v1",
    },
    elevenlabs: {
      apiKey:  s.elevenlabs_api_key  ?? process.env.ELEVENLABS_API_KEY  ?? "",
      voiceId: s.elevenlabs_voice_id ?? process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL",
    },
  };
}

/** Check if a user is a platform admin (by DB flag OR PLATFORM_ADMIN_EMAILS env) */
export async function isPlatformAdmin(userId: string, email?: string): Promise<boolean> {
  try {
    const { data } = await svc()
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", userId)
      .single();
    if (data?.is_platform_admin) return true;
  } catch {}

  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return email ? adminEmails.includes(email) : false;
}
