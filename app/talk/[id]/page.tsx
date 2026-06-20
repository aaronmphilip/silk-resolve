import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PublicTalkClient from "./PublicTalkClient";
import { getNovaCareFallbackAgent, isNovaCareAgentId } from "@/lib/novacare-knowledge";
import { normalizeWebVoiceMode } from "@/lib/silk-voice";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ voice?: string; autostart?: string }>;
}

type TalkAgent = { id: string; name: string | null };

export default async function PublicTalkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const voiceMode = normalizeWebVoiceMode(query.voice);
  const autostart = query.autostart === "1";

  // NovaCare demo agent is bundled in code — never depend on Supabase for public talk.
  let agent: TalkAgent | null = isNovaCareAgentId(id) ? getNovaCareFallbackAgent() : null;

  if (!agent) {
    agent = (
      await createServiceClient()
        .from("agents")
        .select("id, name, status")
        .eq("id", id)
        .single()
    ).data;
  }

  if (!agent) notFound();

  return (
    <PublicTalkClient
      agentId={agent.id}
      agentName={agent.name ?? "Silk Resolve Agent"}
      voiceMode={voiceMode}
      autostart={autostart}
    />
  );
}
