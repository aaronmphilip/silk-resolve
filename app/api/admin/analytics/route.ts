/**
 * GET /api/admin/analytics
 * Platform-wide call analytics. Service role — bypasses RLS.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as svc } from "@supabase/supabase-js";
import { isPlatformAdmin } from "@/lib/platform";

function serviceClient() {
  return svc(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  // Auth guard
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ok = await isPlatformAdmin(user.id, user.email);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = serviceClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [
    { data: allSessions },
    { data: thisMonthSessions },
    { data: tenants },
    { data: recentSessions },
  ] = await Promise.all([
    db.from("voice_sessions").select("id, status, resolution, tension_level, turn_count, started_at, ended_at, tenant_id"),
    db.from("voice_sessions").select("id, status").gte("started_at", monthStart),
    db.from("tenants").select("id, name, calls_this_month").order("calls_this_month", { ascending: false }).limit(8),
    db.from("voice_sessions")
      .select("id, status, resolution, tension_level, turn_count, started_at, ended_at, tenant_id")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  const sessions = allSessions ?? [];
  const monthSessions = thisMonthSessions ?? [];

  // KPIs
  const totalCalls = sessions.length;
  const callsThisMonth = monthSessions.length;
  const resolved = sessions.filter((s) => s.resolution === "resolved" || s.status === "resolved");
  const resolvedPct = totalCalls > 0 ? Math.round((resolved.length / totalCalls) * 100) : 0;
  const tensionSum = sessions.reduce((s, c) => s + (c.tension_level ?? 0), 0);
  const avgTension = totalCalls > 0 ? +(tensionSum / totalCalls).toFixed(1) : 0;

  // Avg duration (seconds)
  const durations = sessions
    .filter((s) => s.started_at && s.ended_at)
    .map((s) => (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  // Calls by day — last 30 days
  const dayCounts: Record<string, number> = {};
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push(key);
    dayCounts[key] = 0;
  }
  sessions
    .filter((s) => s.started_at >= thirtyDaysAgo)
    .forEach((s) => {
      const day = (s.started_at as string).slice(0, 10);
      if (dayCounts[day] !== undefined) dayCounts[day]++;
    });
  const callsByDay = days.map((date) => ({ date, count: dayCounts[date] }));

  // Resolution breakdown
  const breakdown: Record<string, number> = {};
  sessions.forEach((s) => {
    const key = s.resolution ?? s.status ?? "unknown";
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  });
  const resolutionBreakdown = Object.entries(breakdown)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Top tenants
  const topTenants = (tenants ?? []).slice(0, 6).map((t) => ({
    name: t.name,
    calls: t.calls_this_month ?? 0,
  }));

  // Recent calls (join tenant name via tenant_id)
  const tenantMap = Object.fromEntries((tenants ?? []).map((t) => [t.id, t.name]));
  const recentCalls = (recentSessions ?? []).map((s) => ({
    id: s.id,
    tenantName: tenantMap[s.tenant_id] ?? "Unknown",
    status: s.status,
    resolution: s.resolution ?? "—",
    tension: s.tension_level ?? 0,
    turns: s.turn_count ?? 0,
    duration: s.started_at && s.ended_at
      ? Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)
      : null,
    startedAt: (s.started_at as string).slice(0, 16).replace("T", " "),
  }));

  return NextResponse.json({
    kpis: { totalCalls, callsThisMonth, resolvedPct, avgTension, avgDuration },
    callsByDay,
    resolutionBreakdown,
    topTenants,
    recentCalls,
  });
}
