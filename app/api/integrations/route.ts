import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map snake_case → camelCase
  const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    status: r.status,
    baseUrl: r.base_url,
    authType: r.auth_type,
    endpoints: r.endpoints ?? [],
    lastTested: r.last_tested,
    createdAt: ((r.created_at as string) || "").slice(0, 10),
  }));

  return NextResponse.json(mapped);
}
