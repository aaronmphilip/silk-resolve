import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rebuildAgentKnowledgeChunks } from "@/lib/agent-knowledge";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("agent_documents")
    .select("id, title, source_type, status, created_at, updated_at")
    .eq("agent_id", id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id: agentId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { title?: string; content?: string; source_type?: string };
  const title = body.title?.trim();
  const content = body.content?.trim() ?? "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const { data: agent } = await supabase
    .from("agents")
    .select("id, tenant_id")
    .eq("id", agentId)
    .single();

  if (!agent?.tenant_id) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const docId = `doc-${crypto.randomUUID()}`;
  const { data, error } = await supabase
    .from("agent_documents")
    .insert({
      id: docId,
      tenant_id: agent.tenant_id,
      agent_id: agentId,
      title,
      content,
      source_type: body.source_type === "upload" ? "upload" : "manual",
      status: "ready",
    })
    .select("id, title, source_type, status, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await rebuildAgentKnowledgeChunks({
      tenantId: agent.tenant_id,
      agentId,
      documentId: docId,
      content,
    });
  } catch (err) {
    console.error("[knowledge] chunk rebuild failed:", err);
  }

  return NextResponse.json(data);
}