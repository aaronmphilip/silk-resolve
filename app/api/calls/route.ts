/**
 * GET /api/calls — real call history from DB.
 * Also exposes live active calls from voice_sessions.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as svcClient } from "@supabase/supabase-js";

function svc() {
  return svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get tenant_id for this user
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) return NextResponse.json({ calls: [], meta: { total: 0 } });

  const db = svc();
  const { searchParams } = req.nextUrl;
  const agentId  = searchParams.get("agentId");
  const outcome  = searchParams.get("outcome");
  const limitStr = searchParams.get("limit");
  const limit    = limitStr ? parseInt(limitStr, 10) : 50;
  const liveOnly = searchParams.get("live") === "true";

  // ── Live active calls from voice_sessions ────────────────────────────────
  if (liveOnly) {
    const { data: sessions } = await db
      .from("voice_sessions")
      .select("id, call_sid, caller_phone, agent_id, tension_level, turn_count, started_at, status")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "active")
      .order("started_at", { ascending: false });

    return NextResponse.json({ liveCalls: sessions ?? [] });
  }

  // ── Historical calls ─────────────────────────────────────────────────────
  let q = db
    .from("calls")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (agentId && agentId !== "all") q = q.eq("agent_id", agentId);
  if (outcome && outcome !== "all")  q = q.eq("outcome", outcome);

  const { data: rows } = await q;
  const calls = (rows ?? []).map((r) => ({
    id:              r.id,
    agentId:         r.agent_id,
    agentName:       r.agent_name,
    client:          r.client,
    duration:        r.duration,
    durationSeconds: r.duration_seconds,
    empathyScore:    r.empathy_score,
    outcome:         r.outcome,
    tags:            r.tags ?? [],
    timestamp:       r.timestamp,
  }));

  // Aggregates (always full-table for accurate counts)
  const { data: allRows } = await db
    .from("calls")
    .select("outcome, empathy_score")
    .eq("tenant_id", profile.tenant_id);

  const all = allRows ?? [];
  const withScore = all.filter((c) => (c.empathy_score ?? 0) > 0);
  const avgEmpathy = withScore.length
    ? Math.round(withScore.reduce((s, c) => s + c.empathy_score, 0) / withScore.length)
    : 0;

  return NextResponse.json({
    calls,
    meta: {
      total:     all.length,
      resolved:  all.filter((c) => c.outcome === "resolved").length,
      escalated: all.filter((c) => c.outcome === "escalated").length,
      abandoned: all.filter((c) => c.outcome === "abandoned").length,
      avgEmpathy,
    },
  });
}
