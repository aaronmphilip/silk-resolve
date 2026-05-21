import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Service role client — bypasses RLS entirely. Never expose this key client-side.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const { userId, company, industry, firstName, lastName } = await req.json();

    if (!userId || !company) {
      return NextResponse.json({ error: "missing required fields" }, { status: 400 });
    }

    const supabase = serviceClient();
    const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // 1. Create tenant (service role bypasses RLS — safe because we verify userId from auth)
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: company,
        slug: `${slug}-${Date.now()}`,
        plan: "starter",
        industry: industry ?? "Other",
        calls_this_month: 0,
        call_limit: 5000,
        timezone: "Asia/Kolkata",
        language: "English (en-IN)",
      })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      console.error("tenant insert error:", tenantError);
      return NextResponse.json({ error: tenantError?.message ?? "tenant creation failed" }, { status: 500 });
    }

    // 2. Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        tenant_id: tenant.id,
        first_name: firstName ?? "",
        last_name: lastName ?? "",
        role: "owner",
      });

    if (profileError) {
      console.error("profile insert error:", profileError);
      // Roll back tenant if profile fails
      await supabase.from("tenants").delete().eq("id", tenant.id);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ tenantId: tenant.id });
  } catch (err) {
    console.error("register route error:", err);
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}
