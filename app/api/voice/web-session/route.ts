import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function cleanSpokenText(text: string): string {
  return text
    .replace(/\{\{\s*caller_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*customer_name\s*\}\}/gi, "there")
    .replace(/\{\{\s*preferred_address\s*\}\}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const { agentId, callId, visitorId } = await req.json() as {
    agentId?: string;
    callId?: string;
    visitorId?: string;
  };
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  if (!callId) return NextResponse.json({ error: "callId required" }, { status: 400 });

  const db = createServiceClient();
  const { data: agent, error } = await db
    .from("agents")
    .select("id, tenant_id, status, first_message")
    .eq("id", agentId)
    .single();

  if (error || !agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const firstMessage = cleanSpokenText(agent.first_message || "Hello, how can I help you today?");
  const safeVisitorId = typeof visitorId === "string"
    ? visitorId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48)
    : "";

  const { error: sessionError } = await createServiceClient().from("voice_sessions").upsert({
    call_sid:       callId,
    tenant_id:      agent.tenant_id,
    agent_id:       agent.id,
    caller_phone:   safeVisitorId ? `web:${safeVisitorId}` : "web-guest",
    platform_phone: "web-public",
    messages:       [{
      role: "agent",
      content: firstMessage,
      ts: new Date().toISOString(),
      meta: { silkTone: "happy", emotion: "welcoming", voiceScore: 90 },
    }],
    tension_level:  0,
    turn_count:     0,
    status:         "active",
  }, { onConflict: "call_sid", ignoreDuplicates: true });

  if (sessionError) {
    console.error("[web-session] failed to create local voice session:", sessionError);
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
