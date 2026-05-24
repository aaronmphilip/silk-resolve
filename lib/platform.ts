/**
 * Platform-level config — all sourced from environment variables.
 * No DB-based settings storage. Simpler, faster, more secure.
 * API keys NEVER leave the server.
 */
import { createClient } from "@supabase/supabase-js";
import type { AIProvider } from "./ai-providers";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = env(name);
    if (value) return value;
  }
  return "";
}

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
 * Defaults to Gemini if not set.
 */
export async function getPlatformAIConfig(): Promise<{ provider: AIProvider; apiKey: string }> {
  const provider = (process.env.AI_PROVIDER ?? "gemini") as AIProvider;
  const apiKey =
    provider === "gemini"    ? firstEnv("GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY") :
    provider === "anthropic" ? firstEnv("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY") :
    provider === "openai"    ? firstEnv("OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY") :
    firstEnv("GEMINI_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY");
  return { provider, apiKey };
}

/**
 * Get voice provider config.
 * All keys read directly from env vars.
 */
export async function getPlatformVoiceConfig() {
  return {
    vapi: {
      publicKey:   firstEnv("VAPI_PUBLIC_KEY", "NEXT_PUBLIC_VAPI_PUBLIC_KEY"),
      privateKey:  firstEnv("VAPI_PRIVATE_KEY", "VAPI_API_KEY"),
      phoneNumber: env("VAPI_PHONE_NUMBER"),
    },
    silk: {
      apiKey: env("SILK_API_KEY"),
    },
  };
}

/**
 * Quick synchronous check — which voice providers are configured.
 * Used in server components (AgentEditor page) to pass flags to the client.
 */
export function getVoiceProviderStatus() {
  return {
    silkConfigured:      !!env("SILK_API_KEY"),
    vapiWebConfigured:   !!firstEnv("VAPI_PUBLIC_KEY", "NEXT_PUBLIC_VAPI_PUBLIC_KEY"),
    vapiServerConfigured: !!firstEnv("VAPI_PRIVATE_KEY", "VAPI_API_KEY"),
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
