import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PublicTalkClient from "./PublicTalkClient";
import type { WebVoiceMode } from "@/lib/use-web-voice-call";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ voice?: string }>;
}

function normalizeVoiceMode(value: string | undefined): WebVoiceMode {
  return value === "vapi" ? "vapi" : "silk";
}

export default async function PublicTalkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const voiceMode = normalizeVoiceMode(query.voice);
  const { data: agent } = await createServiceClient()
    .from("agents")
    .select("id, name, status")
    .eq("id", id)
    .single();

  if (!agent) notFound();

  return <PublicTalkClient agentId={agent.id} agentName={agent.name ?? "Silk Resolve Agent"} voiceMode={voiceMode} />;
}
