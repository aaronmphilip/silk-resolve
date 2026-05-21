import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/platform";

/** Lightweight endpoint for the sidebar — minimal DB queries */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, first_name, last_name, role")
    .eq("id", user.id)
    .single();

  let tenant = null;
  if (profile?.tenant_id) {
    const { data } = await supabase
      .from("tenants")
      .select("name, plan, calls_this_month, call_limit")
      .eq("id", profile.tenant_id)
      .single();
    if (data) {
      tenant = {
        name: data.name,
        plan: data.plan,
        callsThisMonth: data.calls_this_month,
        callLimit: data.call_limit,
      };
    }
  }

  const isAdmin = await isPlatformAdmin(user.id, user.email);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    role: profile?.role ?? "viewer",
    isPlatformAdmin: isAdmin,
    tenant,
  });
}
