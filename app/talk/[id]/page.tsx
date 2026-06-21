import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PublicTalkClient from "./PublicTalkClient";
import { getNovaCareFallbackAgent, isNovaCareAgentId } from "@/lib/novacare-knowledge";
import { normalizeWebVoiceMode } from "@/lib/silk-voice";
import { isPublishKeyFormat, resolvePublishKey } from "@/lib/publish-key";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ voice?: string; autostart?: string; key?: string }>;
}

type TalkAgent = { id: string; name: string | null; voice_mode?: string };

export default async function PublicTalkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const publishKey = query.key?.trim() ?? "";
  const autostart = query.autostart === "1";

  let agent: TalkAgent | null = null;
  let voiceFromAgent: string | undefined;

  if (publishKey) {
    if (!isPublishKeyFormat(publishKey)) notFound();
    const resolved = await resolvePublishKey(publishKey);
    if (!resolved) notFound();

    if (isNovaCareAgentId(resolved.agentId)) {
      agent = getNovaCareFallbackAgent();
    } else {
      const row = (
        await createServiceClient()
          .from("agents")
          .select("id, name, status, voice_mode")
          .eq("id", resolved.agentId)
          .maybeSingle()
      ).data;

      if (!row || row.status !== "live") notFound();
      agent = row;
      voiceFromAgent = row.voice_mode ?? undefined;
    }
  } else if (isNovaCareAgentId(id)) {
    agent = getNovaCareFallbackAgent();
  } else {
    agent = (
      await createServiceClient()
        .from("agents")
        .select("id, name, status, voice_mode")
        .eq("id", id)
        .single()
    ).data;

    if (!agent) notFound();
    voiceFromAgent = agent.voice_mode ?? undefined;
  }

  const voiceMode = normalizeWebVoiceMode(query.voice ?? voiceFromAgent);

  return (
    <PublicTalkClient
      agentId={agent.id}
      agentName={agent.name ?? "Silk Resolve Agent"}
      voiceMode={voiceMode}
      autostart={autostart}
    />
  );
}