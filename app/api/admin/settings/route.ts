import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getPlatformSettings, setPlatformSettings, isPlatformAdmin } from "@/lib/platform";
import { testAIKey, type AIProvider } from "@/lib/ai";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const ok = await isPlatformAdmin(user.id, user.email);
  if (!ok) return null;
  return user;
}

// Keys that contain secrets — masked before sending to client, never returned as plaintext
const SECRET_KEYS = [
  "ai_api_key",
  "vapi_public_key",
  "vapi_private_key",
  "vapi_api_key",          // legacy — keep masking for backward compat
  "silk_api_key",
  "elevenlabs_api_key",
  "twilio_auth_token",
  "twilio_account_sid",
];

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const settings = await getPlatformSettings();

  // Replace secret values with a masked indicator
  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    safe[k] = SECRET_KEYS.includes(k) ? (v ? "set" : "") : v;
  }

  return NextResponse.json(safe);
}

export async function PUT(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body: Record<string, string> = await req.json();

  // Don't save masked placeholders
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v && v !== "set" && v !== "••••••••") filtered[k] = v;
    else if (!SECRET_KEYS.includes(k)) filtered[k] = v; // non-secret fields always saved
  }

  try {
    await setPlatformSettings(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/settings PUT]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Test an AI key without saving
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { provider, apiKey } = await req.json();
  if (!provider || !apiKey) return NextResponse.json({ error: "provider and apiKey required" }, { status: 400 });

  const result = await testAIKey(provider as AIProvider, apiKey);
  return NextResponse.json(result);
}
