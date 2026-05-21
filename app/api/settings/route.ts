import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  let tenant = null;
  if (profile?.tenant_id) {
    const { data } = await supabase
      .from("tenants")
      .select("id,name,slug,plan,calls_this_month,call_limit,timezone,language,escalation_email,ai_provider,ai_api_key")
      .eq("id", profile.tenant_id)
      .single();
    if (data) {
      tenant = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        plan: data.plan,
        callsThisMonth: data.calls_this_month,
        callLimit: data.call_limit,
        timezone: data.timezone,
        language: data.language,
        escalationEmail: data.escalation_email ?? "",
        aiProvider: data.ai_provider ?? "anthropic",
        hasAiKey: !!data.ai_api_key,
      };
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      role: profile?.role ?? "owner",
      tenantId: profile?.tenant_id ?? null,
      createdAt: user.created_at,
    },
    tenant,
  });
}
