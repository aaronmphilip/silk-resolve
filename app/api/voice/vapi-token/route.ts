/**
 * Returns a short-lived Vapi web token so the browser SDK can start a call.
 * The call uses our assistant-request webhook — same flow as a real phone call.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformVoiceConfig } from "@/lib/platform";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { vapi } = await getPlatformVoiceConfig();
  const publicKey = vapi.publicKey;

  if (!publicKey) return NextResponse.json({ error: "Vapi public key not configured. Add it in Admin → Settings." }, { status: 400 });

  // Only the PUBLIC key goes to the browser — never the private key
  return NextResponse.json({ apiKey: publicKey });
}
