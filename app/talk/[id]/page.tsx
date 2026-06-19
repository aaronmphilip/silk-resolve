import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PublicTalkClient from "./PublicTalkClient";
import { normalizeWebVoiceMode } from "@/lib/silk-voice";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ voice?: string }>;
}

export default async function PublicTalkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const voiceMode = normalizeWebVoiceMode(query.voice);
  const { data: agent } = await createServiceClient()
    .from("agents")
    .select("id, name, status")
    .eq("id", id)
    .single();

  if (!agent) notFound();

  return <PublicTalkClient agentId={agent.id} agentName={agent.name ?? "Silk Resolve Agent"} voiceMode={voiceMode} />;
}
