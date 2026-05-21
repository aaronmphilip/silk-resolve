import { NextResponse } from "next/server";
import { CALLS } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const outcome = searchParams.get("outcome");
  const limit = searchParams.get("limit");

  let calls = [...CALLS];

  if (agentId) {
    calls = calls.filter((c) => c.agentId === agentId);
  }

  if (outcome) {
    calls = calls.filter((c) => c.outcome === outcome);
  }

  const total = calls.length;

  if (limit) {
    calls = calls.slice(0, Number(limit));
  }

  const avgEmpathy =
    calls.filter((c) => c.empathyScore > 0).length > 0
      ? Math.round(
          calls.filter((c) => c.empathyScore > 0).reduce((s, c) => s + c.empathyScore, 0) /
            calls.filter((c) => c.empathyScore > 0).length
        )
      : 0;

  return NextResponse.json({
    calls,
    meta: {
      total,
      resolved: CALLS.filter((c) => c.outcome === "resolved").length,
      escalated: CALLS.filter((c) => c.outcome === "escalated").length,
      abandoned: CALLS.filter((c) => c.outcome === "abandoned").length,
      avgEmpathy,
    },
  });
}
