import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PublicTalkClient from "./PublicTalkClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicTalkPage({ params }: PageProps) {
  const { id } = await params;
  const { data: agent } = await createServiceClient()
    .from("agents")
    .select("id, name, status")
    .eq("id", id)
    .in("status", ["live", "active"])
    .single();

  if (!agent) notFound();

  return <PublicTalkClient agentId={agent.id} agentName={agent.name ?? "Silk Resolve Agent"} />;
}
