import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isNovaCareAgentId, getNovaCareFallbackAgent } from "@/lib/novacare-knowledge";
import { isPublishKeyFormat, resolvePublishKey } from "@/lib/publish-key";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key")?.trim() ?? "";
  const agentIdParam = req.nextUrl.searchParams.get("id")?.trim() ?? "";

  let agentId = agentIdParam;

  if (key) {
    if (!isPublishKeyFormat(key)) {
      return NextResponse.json({ error: "invalid publish key" }, { status: 400 });
    }
    const resolved = await resolvePublishKey(key);
    if (!resolved) return NextResponse.json({ error: "key not found" }, { status: 404 });
    agentId = resolved.agentId;
  }

  if (!agentId) return NextResponse.json({ error: "id or key required" }, { status: 400 });

  if (isNovaCareAgentId(agentId)) {
    const agent = getNovaCareFallbackAgent();
    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      status: "live",
      voice_mode: "silk-mulberry",
    });
  }

  const svc = createServiceClient();
  const { data: agent } = await svc
    .from("agents")
    .select("id, name, status, voice_mode, language, hinglish_mode")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  if (key && agent.status !== "live") {
    return NextResponse.json({ error: "agent not published" }, { status: 403 });
  }

  return NextResponse.json(agent);
}