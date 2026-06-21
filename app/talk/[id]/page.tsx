import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import PublicTalkClient from "./PublicTalkClient";
import { getNovaCareFallbackAgent, isNovaCareAgentId } from "@/lib/novacare-knowledge";
import { normalizeWebVoiceMode } from "@/lib/silk-voice";
import {
  isPublishKeyFormat,
  publishKeyAllowsAgentStatus,
  resolvePublishKey,
} from "@/lib/publish-key";
import { agentLanguageLabelToBcp47 } from "@/lib/speech-languages";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ voice?: string; autostart?: string; key?: string; lang?: string }>;
}

type TalkAgent = {
  id: string;
  name: string | null;
  voice_mode?: string;
  language?: string | null;
};

export default async function PublicTalkPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const publishKey = query.key?.trim() ?? "";
  const autostart = query.autostart === "1";

  let agent: TalkAgent | null = null;
  let voiceFromAgent: string | undefined;
  let languageFromAgent: string | undefined;

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
          .select("id, name, status, voice_mode, language")
          .eq("id", resolved.agentId)
          .maybeSingle()
      ).data;

      if (!row || !publishKeyAllowsAgentStatus(resolved.kind, row.status ?? "draft")) notFound();
      agent = row;
      voiceFromAgent = row.voice_mode ?? undefined;
      languageFromAgent = row.language ?? undefined;
    }
  } else if (isNovaCareAgentId(id)) {
    agent = getNovaCareFallbackAgent();
  } else {
    agent = (
      await createServiceClient()
        .from("agents")
        .select("id, name, status, voice_mode, language")
        .eq("id", id)
        .single()
    ).data;

    if (!agent) notFound();
    voiceFromAgent = agent.voice_mode ?? undefined;
    languageFromAgent = agent.language ?? undefined;
  }

  const voiceMode = normalizeWebVoiceMode(query.voice ?? voiceFromAgent);
  const speechLanguage =
    query.lang?.trim() || agentLanguageLabelToBcp47(languageFromAgent);

  return (
    <PublicTalkClient
      agentId={agent.id}
      agentName={agent.name ?? "Silk Resolve Agent"}
      voiceMode={voiceMode}
      speechLanguage={speechLanguage}
      autostart={autostart}
    />
  );
}