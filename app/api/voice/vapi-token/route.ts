/**
 * Returns a short-lived Vapi web token so the browser SDK can start a call.
 * The call uses our assistant-request webhook — same flow as a real phone call.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlatformSettings } from "@/lib/platform";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const settings = await getPlatformSettings();
  const apiKey = settings.vapi_api_key ?? process.env.VAPI_API_KEY ?? "";

  if (!apiKey) return NextResponse.json({ error: "Vapi API key not configured" }, { status: 400 });

  // Vapi public key is the same as the private key prefix (first part before the dash)
  // We return just enough for the client to start a web call
  return NextResponse.json({ apiKey });
}
