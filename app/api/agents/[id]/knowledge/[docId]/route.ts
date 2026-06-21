import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { rebuildAgentKnowledgeChunks } from "@/lib/agent-knowledge";

type Ctx = { params: Promise<{ id: string; docId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id, docId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("agent_documents")
    .select("id, title, content, source_type, status, created_at, updated_at")
    .eq("id", docId)
    .eq("agent_id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id, docId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json() as { title?: string; content?: string };
  const patch: Record<string, string> = {};
  if (body.title?.trim()) patch.title = body.title.trim();
  if (typeof body.content === "string") patch.content = body.content;

  const { data: agent } = await supabase.from("agents").select("tenant_id").eq("id", id).single();
  if (!agent?.tenant_id) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("agent_documents")
    .update(patch)
    .eq("id", docId)
    .eq("agent_id", id)
    .select("id, title, content, source_type, status, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (typeof body.content === "string") {
    await rebuildAgentKnowledgeChunks({
      tenantId: agent.tenant_id,
      agentId: id,
      documentId: docId,
      content: body.content,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, docId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await supabase.from("agent_knowledge_chunks").delete().eq("document_id", docId);
  const { error } = await supabase.from("agent_documents").delete().eq("id", docId).eq("agent_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}