import { NextResponse } from "next/server";
import { METRICS, AGENTS, CALLS, TENANT } from "@/lib/mock-data";

export async function GET() {
  const liveAgents = AGENTS.filter((a) => a.status === "live");
  const todayCalls = CALLS.length;
  const resolved = CALLS.filter((c) => c.outcome === "resolved").length;

  return NextResponse.json({
    metrics: METRICS,
    summary: {
      activeCalls: 12,
      liveAgents: liveAgents.length,
      totalAgents: AGENTS.length,
      callsToday: todayCalls,
      resolvedToday: resolved,
      resolvedRate: Math.round((resolved / todayCalls) * 100),
      avgEmpathy: 91.4,
      avgHandleTime: "2m 34s",
      callsThisMonth: TENANT.callsThisMonth,
      callLimit: TENANT.callLimit,
    },
  });
}
