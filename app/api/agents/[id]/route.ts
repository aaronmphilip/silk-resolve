import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("agents").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  // Whitelist updateable fields — never let client touch tenant_id or stats
  const allowed = [
    "name", "status", "description", "webhook_url",
    "system_prompt", "first_message", "language", "hinglish_mode",
    "llm_provider", "llm_model", "companion_vibe", "preferred_address",
    "linguistic_notes", "peek_threshold", "mesh_depth_days",
    "silk_voice_id", "voice_mode", "knowledge_enabled",
    "agent_variables", "tools", "escalation_rules",
    "no_go_topics", "twilio_phone", "pillars",
    "call_direction", "vapi_phone_number", "outbound_caller_id", "outbound_list_url",
  ];

  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "no valid fields" }, { status: 400 });

  const { data, error } = await supabase
    .from("agents")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
