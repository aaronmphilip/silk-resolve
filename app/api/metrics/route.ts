/**
 * GET /api/metrics
 * Returns live metrics from Supabase — used by the Observer and dashboard.
 * No mock data: returns zeros when DB is empty.
 * Auth-protected: requires a valid Supabase session.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase/server";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Auth guard — only authenticated users can poll metrics
  const authClient = createAuthClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = svc();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [
      { data: allCalls },
      { data: todayCalls },
      { data: activeSessions },
      { data: agentsData },
    ] = await Promise.all([
      db.from("calls").select("empathy_score, outcome, duration_seconds"),
      db.from("calls").select("id").gte("timestamp", `${today}T00:00:00.000Z`),
      db.from("voice_sessions").select("id").eq("status", "active"),
      db.from("agents").select("id, status, name"),
    ]);

    const calls = allCalls ?? [];
    const resolved = calls.filter((c) => c.outcome === "resolved");
    const empathyCalls = calls.filter((c) => (c.empathy_score ?? 0) > 0);
    const avgEmpathy = empathyCalls.length
      ? (empathyCalls.reduce((s, c) => s + (c.empathy_score as number), 0) / empathyCalls.length).toFixed(1)
      : "0";
    const avgHandleSecs = calls.length
      ? Math.round(calls.reduce((s, c) => s + ((c.duration_seconds as number) ?? 0), 0) / calls.length)
      : 0;
    const avgHandle = avgHandleSecs >= 60
      ? `${Math.floor(avgHandleSecs / 60)}m ${avgHandleSecs % 60}s`
      : `${avgHandleSecs}s`;

    const agents = agentsData ?? [];
    const liveAgents = agents.filter((a) => a.status === "live");

    return NextResponse.json({
      metrics: [
        { label: "active calls",      value: String(activeSessions?.length ?? 0), sub: "right now",          trend: "neutral" },
        { label: "resolved today",    value: String(resolved.length),              sub: "this session",       trend: "up" },
        { label: "avg empathy score", value: `${avgEmpathy}%`,                     sub: "across all agents",  trend: "up" },
        { label: "total calls",       value: String(calls.length),                 sub: "all time",           trend: "up" },
      ],
      summary: {
        activeCalls:    activeSessions?.length ?? 0,
        liveAgents:     liveAgents.length,
        totalAgents:    agents.length,
        callsToday:     todayCalls?.length ?? 0,
        resolvedToday:  resolved.length,
        resolvedRate:   calls.length ? Math.round((resolved.length / calls.length) * 100) : 0,
        avgEmpathy:     parseFloat(avgEmpathy),
        avgHandleTime:  avgHandle,
        callsThisMonth: calls.length,
        callLimit:      10000,
      },
    });
  } catch (err) {
    console.error("[metrics] error:", err);
    return NextResponse.json({
      metrics: [
        { label: "active calls",      value: "0",  sub: "right now",         trend: "neutral" },
        { label: "resolved today",    value: "0",  sub: "this session",      trend: "neutral" },
        { label: "avg empathy score", value: "—",  sub: "across all agents", trend: "neutral" },
        { label: "total calls",       value: "0",  sub: "all time",          trend: "neutral" },
      ],
      summary: {
        activeCalls: 0, liveAgents: 0, totalAgents: 0,
        callsToday: 0, resolvedToday: 0, resolvedRate: 0,
        avgEmpathy: 0, avgHandleTime: "—", callsThisMonth: 0, callLimit: 10000,
      },
    });
  }
}
