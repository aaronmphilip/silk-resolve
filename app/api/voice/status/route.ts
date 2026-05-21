/**
 * POST /api/voice/status
 * Twilio status callback — fires when a call ends (completed, failed, busy, no-answer).
 * Finalises the voice_session and writes a call record for analytics.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Derive a human-readable duration string from seconds */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Calculate empathy score from message history */
function calcEmpathyScore(
  messages: Array<{ role: string; peek?: { tensionLevel?: number } }>,
  finalTension: number
): number {
  // Average of (10 - tensionLevel) for all agent turns, scaled to 0-100
  const agentTurns = messages.filter(
    (m) => m.role === "agent" && m.peek?.tensionLevel != null
  );
  if (!agentTurns.length) return Math.round(100 - finalTension * 10);

  const avg =
    agentTurns.reduce((sum, m) => sum + (m.peek?.tensionLevel ?? 5), 0) /
    agentTurns.length;
  return Math.round(Math.max(0, Math.min(100, (10 - avg) * 10)));
}

export async function POST(req: NextRequest) {
  const db = svc();

  const form = await req.formData();
  const callSid      = form.get("CallSid")       as string;
  const callStatus   = form.get("CallStatus")    as string; // completed|failed|busy|no-answer|canceled
  const durationStr  = form.get("CallDuration")  as string | null;
  const duration     = durationStr ? parseInt(durationStr, 10) : 0;

  if (!callSid) return NextResponse.json({ ok: true }); // Twilio sometimes calls with partial data

  try {
    // Load session
    const { data: session } = await db
      .from("voice_sessions")
      .select("*")
      .eq("call_sid", callSid)
      .single();

    if (!session) {
      // Session may not exist if call was rejected before our webhook ran
      return NextResponse.json({ ok: true });
    }

    const now = new Date().toISOString();
    const messages: Array<{ role: string; peek?: { tensionLevel?: number } }> =
      session.messages ?? [];

    // Determine resolution
    const resolution =
      session.resolution ??
      (callStatus === "completed" ? "resolved" : "abandoned");

    const empathyScore = calcEmpathyScore(messages, session.tension_level ?? 5);

    // 1. Finalise voice_session
    await db
      .from("voice_sessions")
      .update({
        status:        session.status === "active" ? "ended" : session.status,
        resolution,
        empathy_score: empathyScore,
        ended_at:      session.ended_at ?? now,
      })
      .eq("call_sid", callSid);

    // 2. Write a call record for the analytics / calls page
    if (duration > 0 || callStatus === "completed") {
      // Get agent info for the call record
      const { data: agent } = await db
        .from("agents")
        .select("name, tenant_id")
        .eq("id", session.agent_id)
        .single();

      // upsert with ignoreDuplicates — Twilio can fire status twice
      await db.from("calls").upsert(
        {
          agent_id:         session.agent_id,
          agent_name:       agent?.name ?? "Unknown",
          tenant_id:        session.tenant_id,
          call_sid:         callSid,
          client:           session.caller_phone,
          duration:         formatDuration(duration),
          duration_seconds: duration,
          empathy_score:    empathyScore,
          outcome:          resolution as "resolved" | "escalated" | "abandoned",
          tags:             buildTags(messages, session),
          timestamp:        now,
        },
        { onConflict: "call_sid", ignoreDuplicates: true }
      );
    }

    // 3. Update MESH profile: last_seen, total_interactions, last_resolution
    if (session.mesh_profile_id) {
      try {
        await db
          .from("mesh_profiles")
          .update({
            last_seen:         now,
            last_resolution:   resolution,
            avg_empathy_score: empathyScore,
          })
          .eq("id", session.mesh_profile_id);
      } catch {} // non-fatal

      // Increment interaction count via RPC
      try {
        await db.rpc("increment_mesh_interactions", {
          profile_id: session.mesh_profile_id,
        });
      } catch {}
    }

    // 4. Update tenant call counter
    if (session.tenant_id) {
      try {
        await db.rpc("increment_tenant_calls", {
          tenant_id: session.tenant_id,
        });
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[voice/status] error:", err);
    return NextResponse.json({ ok: true }); // always 200 to Twilio
  }
}

/** Derive tags from conversation for analytics display */
function buildTags(
  messages: Array<{ role: string; peek?: { intent?: string; tensionLevel?: number } }>,
  session: Record<string, unknown>
): string[] {
  const tags: string[] = [];
  const intents = new Set(
    messages
      .filter((m) => m.role === "agent" && m.peek?.intent)
      .map((m) => m.peek?.intent as string)
  );

  if (intents.has("complaint")) tags.push("complaint");
  if (intents.has("frustrated") || intents.has("angry")) tags.push("frustrated-caller");
  if (session.status === "escalated") tags.push("escalated");
  if ((session.turn_count as number) > 6) tags.push("long-call");
  if ((session.tension_level as number) >= 7) tags.push("high-tension");

  return tags;
}
