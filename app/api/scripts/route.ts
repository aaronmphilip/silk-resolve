import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return NextResponse.json({ error: "no profile found" }, { status: 400 });

  const body = await req.json();

  const { data, error } = await supabase
    .from("scripts")
    .insert({
      tenant_id: profile.tenant_id,
      agent_id: body.agentId ?? null,
      agent_name: body.agentName ?? "",
      name: body.name,
      version: body.version ?? 1,
      status: body.status ?? "draft",
      system_prompt: body.systemPrompt ?? "",
      companion_vibe: body.companionVibe ?? "professional",
      language: body.language ?? "English (en-IN)",
      preferred_address: body.preferredAddress ?? "Sir/Ma'am",
      linguistic_notes: body.linguisticNotes ?? "",
      tools: body.tools ?? [],
      escalation_rules: body.escalationRules ?? [],
      no_go_topics: body.noGoTopics ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
