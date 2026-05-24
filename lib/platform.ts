/**
 * Platform-level config — all sourced from environment variables.
 * No DB-based settings storage. Simpler, faster, more secure.
 * API keys NEVER leave the server.
 */
import { createClient } from "@supabase/supabase-js";
import type { AIProvider } from "./ai-providers";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Get the AI config for script generation.
 * Reads AI_PROVIDER env var, then the matching key env var.
 * Defaults to xAI / grok-4 if not set.
 */
export async function getPlatformAIConfig(): Promise<{ provider: AIProvider; apiKey: string }> {
  const provider = (process.env.AI_PROVIDER ?? "xai") as AIProvider;
  const apiKey =
    (provider === "xai"       ? process.env.XAI_API_KEY       : null) ??
    (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ??
    (provider === "openai"    ? process.env.OPENAI_API_KEY    : null) ??
    (provider === "gemini"    ? process.env.GEMINI_API_KEY    : null) ??
    // Fallbacks in order of likelihood
    process.env.XAI_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    "";
  return { provider, apiKey };
}

/**
 * Get voice provider config.
 * All keys read directly from env vars.
 */
export async function getPlatformVoiceConfig() {
  return {
    vapi: {
      publicKey:   process.env.VAPI_PUBLIC_KEY   ?? "",
      privateKey:  process.env.VAPI_PRIVATE_KEY  ?? "",
      phoneNumber: process.env.VAPI_PHONE_NUMBER ?? "",
    },
    silk: {
      apiKey:  process.env.SILK_API_KEY  ?? "",
      voiceId: process.env.SILK_VOICE_ID ?? "",
      baseUrl: process.env.SILK_BASE_URL ?? "https://api.rumik.ai/v1",
    },
    elevenlabs: {
      apiKey:  process.env.ELEVENLABS_API_KEY  ?? "",
      voiceId: process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL",
    },
  };
}

/**
 * Quick synchronous check — which voice providers are configured.
 * Used in server components (AgentEditor page) to pass flags to the client.
 */
export function getVoiceProviderStatus() {
  return {
    silkConfigured:       !!process.env.SILK_API_KEY,
    elevenlabsConfigured: !!process.env.ELEVENLABS_API_KEY,
    vapiConfigured:       !!process.env.VAPI_PRIVATE_KEY,
  };
}

/** Check if a user is a platform admin (by DB flag OR PLATFORM_ADMIN_EMAILS env) */
export async function isPlatformAdmin(userId: string, email?: string): Promise<boolean> {
  // 1. DB flag
  try {
    const { data } = await svc()
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", userId)
      .single();
    if (data?.is_platform_admin) return true;
  } catch {}

  // 2. PLATFORM_ADMIN_EMAILS env var
  const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    return email ? adminEmails.includes(email) : false;
  }

  // 3. Fallback: fresh install — if zero DB admins exist, allow any auth user
  try {
    const { count } = await svc()
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_platform_admin", true);
    if ((count ?? 0) === 0) return true;
  } catch {}

  return false;
}
