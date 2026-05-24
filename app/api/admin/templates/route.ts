/**
 * GET  /api/admin/templates  — list all templates
 * POST /api/admin/templates  — create template
 * PUT  /api/admin/templates  — update template (body must include id)
 * DELETE /api/admin/templates?id=tmpl-xxx — delete template
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as svc } from "@supabase/supabase-js";
import { isPlatformAdmin } from "@/lib/platform";

function db() {
  return svc(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function guard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const ok = await isPlatformAdmin(user.id, user.email);
  return ok ? user : null;
}

export async function GET() {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await db()
    .from("agent_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description, industry, system_prompt, first_message, llm_model, companion_vibe, tags } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data, error } = await db()
    .from("agent_templates")
    .insert({
      name: name.trim(),
      description: description ?? "",
      industry: industry ?? "general",
      system_prompt: system_prompt ?? "",
      first_message: first_message ?? "",
      llm_model: llm_model ?? "grok-4",
      companion_vibe: companion_vibe ?? "professional",
      tags: tags ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["name", "description", "industry", "system_prompt", "first_message",
    "llm_model", "companion_vibe", "tags", "is_active"];
  const patch = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await db()
    .from("agent_templates")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const user = await guard();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db().from("agent_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
