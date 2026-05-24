/**
 * POST /api/admin/vapi-test
 * Tests a Vapi key by hitting their API and tells you if it's valid
 * and whether it's a public or private key type.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await isPlatformAdmin(user.id, user.email);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { key } = await req.json() as { key: string };
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  // Test as PRIVATE key — call a server-only endpoint (list calls)
  const privateTest = await fetch("https://api.vapi.ai/call?limit=1", {
    headers: { "Authorization": `Bearer ${key}` },
  });

  // Test as PUBLIC key — call the token endpoint
  const publicTest = await fetch("https://api.vapi.ai/assistant?limit=1", {
    headers: { "Authorization": `Bearer ${key}` },
  });

  const isValidPrivate = privateTest.ok;
  const isValidPublic  = publicTest.ok;

  if (isValidPrivate) {
    return NextResponse.json({ ok: true, type: "private", message: "✓ Valid private key — use this in the Private Key field" });
  }
  if (isValidPublic) {
    return NextResponse.json({ ok: true, type: "public", message: "✓ Valid public key — use this in the Public Key field" });
  }

  return NextResponse.json({
    ok: false,
    message: "✗ Key rejected by Vapi — check you copied it correctly from dashboard.vapi.ai → Account → API Keys",
  });
}
