import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "no profile found" }, { status: 400 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("agents")
    .insert({
      id:              `agt-${crypto.randomUUID()}`,
      tenant_id:       profile.tenant_id,
      name:            body.name,
      client:          body.client ?? "",
      status:          body.status ?? "draft",
      node_count:      0,
      pillars:         body.pillars ?? ["PEEK", "MESH", "SILK"],
      description:     body.description ?? "",
      twilio_phone:    body.twilioPhone ?? null,   // assign phone number at creation
      total_calls:     0,
      calls_today:     0,
      empathy_score:   0,
      avg_handle_time: "—",
      resolved_rate:   0,
      last_active:     "never",
      webhook_url:     body.webhookUrl ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { id: string; twilioPhone?: string; status?: string };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body.twilioPhone !== undefined) updates.twilio_phone = body.twilioPhone;
  if (body.status !== undefined)      updates.status       = body.status;

  const { data, error } = await supabase
    .from("agents")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
