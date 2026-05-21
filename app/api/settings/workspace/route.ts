import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return NextResponse.json({ error: "no tenant" }, { status: 400 });
  if (!["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "insufficient permissions" }, { status: 403 });
  }

  const { name, timezone, language, escalationEmail } = await req.json();

  const { error } = await supabase
    .from("tenants")
    .update({
      name,
      timezone,
      language,
      escalation_email: escalationEmail,
    })
    .eq("id", profile.tenant_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
