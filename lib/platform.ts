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

function isExplicitlyDisabled(name: string): boolean {
  return ["0", "false", "off", "no"].includes(env(name).toLowerCase());
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
  const requested = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();
  const validProviders: AIProvider[] = ["gemini", "anthropic", "openai"];
  const requestedProvider = validProviders.includes(requested as AIProvider)
    ? requested as AIProvider
    : "gemini";

  const keys: Record<AIProvider, string> = {
    gemini:    env("GEMINI_API_KEY"),
    anthropic: env("ANTHROPIC_API_KEY"),
    openai:    env("OPENAI_API_KEY"),
  };

  if (keys[requestedProvider]) {
    return { provider: requestedProvider, apiKey: keys[requestedProvider] };
  }

  const fallbackProvider = validProviders.find(provider => keys[provider]);
  return {
    provider: fallbackProvider ?? requestedProvider,
    apiKey: fallbackProvider ? keys[fallbackProvider] : "",
  };
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
      vapiEnabled: !isExplicitlyDisabled("SILK_VAPI_VOICE"),
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
    silkVapiEnabled:     !isExplicitlyDisabled("SILK_VAPI_VOICE"),
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
