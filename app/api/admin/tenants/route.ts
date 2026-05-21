import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { createClient as svcClient } from "@supabase/supabase-js";
import { isPlatformAdmin } from "@/lib/platform";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ok = await isPlatformAdmin(user.id, user.email);
  if (!ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Use service role to read ALL tenants
  const svc = svcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: tenants } = await svc
    .from("tenants")
    .select("id, name, slug, plan, calls_this_month, call_limit, industry, created_at, timezone, language")
    .order("created_at", { ascending: false });

  const { data: profiles } = await svc
    .from("profiles")
    .select("tenant_id, role")
    .eq("role", "owner");

  const ownerMap = Object.fromEntries((profiles ?? []).map((p) => [p.tenant_id, true]));

  return NextResponse.json(
    (tenants ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      industry: t.industry,
      callsThisMonth: t.calls_this_month,
      callLimit: t.call_limit,
      usagePct: t.call_limit ? Math.round((t.calls_this_month / t.call_limit) * 100) : 0,
      createdAt: (t.created_at as string).slice(0, 10),
      timezone: t.timezone,
      hasOwner: !!ownerMap[t.id],
    }))
  );
}
