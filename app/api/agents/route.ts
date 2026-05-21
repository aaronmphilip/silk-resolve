import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const id = searchParams.get("id");

  let agents = AGENTS;

  if (id) {
    const agent = agents.find((a) => a.id === id);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json({ agent });
  }

  if (status) {
    agents = agents.filter((a) => a.status === status);
  }

  return NextResponse.json({
    agents,
    meta: {
      total: agents.length,
      live: AGENTS.filter((a) => a.status === "live").length,
      paused: AGENTS.filter((a) => a.status === "paused").length,
      draft: AGENTS.filter((a) => a.status === "draft").length,
    },
  });
}

export async function POST(request: Request) {
  // Stub — replace with DB insert
  const body = await request.json();
  return NextResponse.json(
    {
      message: "Agent created",
      agent: { id: `agt-${Date.now()}`, ...body, status: "draft" },
    },
    { status: 201 }
  );
}
