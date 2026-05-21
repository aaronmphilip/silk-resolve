import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: Request, { params }: Ctx) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("scripts")
    .update({
      name: body.name,
      status: body.status,
      version: body.version,
      system_prompt: body.systemPrompt,
      companion_vibe: body.companionVibe,
      language: body.language,
      preferred_address: body.preferredAddress,
      linguistic_notes: body.linguisticNotes,
      tools: body.tools,
      escalation_rules: body.escalationRules,
      no_go_topics: body.noGoTopics,
    })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase.from("scripts").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
