import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { testAIKey, type AIProvider } from "@/lib/ai";

export async function PUT(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return NextResponse.json({ error: "no tenant" }, { status: 400 });
  if (!["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "insufficient permissions" }, { status: 403 });
  }

  const { provider, apiKey } = await req.json();

  const updates: Record<string, string> = { ai_provider: provider };
  if (apiKey && apiKey !== "••••••••") updates.ai_api_key = apiKey;

  const { error } = await supabase
    .from("tenants")
    .update(updates)
    .eq("id", profile.tenant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  // Test an API key without saving it
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { provider, apiKey } = await req.json();
  if (!provider || !apiKey) return NextResponse.json({ error: "provider and apiKey required" }, { status: 400 });

  const result = await testAIKey(provider as AIProvider, apiKey);
  return NextResponse.json(result);
}
