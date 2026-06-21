import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generatePublishKey } from "@/lib/publish-key";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("agent_publish_keys")
    .select("id, name, prefix, kind, status, last_used, created_at")
    .eq("agent_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: agentId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { name?: string; kind?: string };
  const kind = body.kind === "test" ? "test" : "live";

  const { data: agent } = await supabase
    .from("agents")
    .select("id, tenant_id")
    .eq("id", agentId)
    .single();

  if (!agent?.tenant_id) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const { fullKey, prefix, hash } = generatePublishKey(kind);
  const keyId = `apk-${crypto.randomUUID()}`;

  const { data, error } = await supabase
    .from("agent_publish_keys")
    .insert({
      id: keyId,
      tenant_id: agent.tenant_id,
      agent_id: agentId,
      name: body.name?.trim() || "Default",
      prefix,
      key_hash: hash,
      kind,
      status: "active",
    })
    .select("id, name, prefix, kind, status, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ...data, key: fullKey });
}