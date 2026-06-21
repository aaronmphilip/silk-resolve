import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; keyId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, keyId } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("agent_publish_keys")
    .update({ status: "revoked" })
    .eq("id", keyId)
    .eq("agent_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}