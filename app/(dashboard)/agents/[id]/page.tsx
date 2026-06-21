import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalls } from "@/lib/dal";
import AgentStudio from "./_components/studio/AgentStudio";
import { getVoiceProviderStatus } from "@/lib/platform";
import type { WebVoiceMode } from "@/lib/silk-voice";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function normalizeVoiceMode(value: unknown): WebVoiceMode {
  if (value === "silk" || value === "silk-stream" || value === "silk-mulberry" || value === "vapi") {
    return value;
  }
  return "silk-mulberry";
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: agentRaw }, callsFromDb] = await Promise.all([
    supabase.from("agents").select("*").eq("id", id).single(),
    getCalls({ agentId: id, limit: 50 }),
  ]);

  if (!agentRaw) notFound();

  const { silkConfigured } = getVoiceProviderStatus();

  const initial = {
    id:               agentRaw.id,
    name:             agentRaw.name ?? "",
    status:           agentRaw.status ?? "draft",
    description:      agentRaw.description ?? "",
    system_prompt:    agentRaw.system_prompt ?? "",
    first_message:    agentRaw.first_message ?? "",
    language:         agentRaw.language ?? "English (en-IN)",
    hinglish_mode:    agentRaw.hinglish_mode ?? false,
    llm_provider:     agentRaw.llm_provider ?? "anthropic",
    llm_model:        agentRaw.llm_model ?? "claude-sonnet-4-5",
    companion_vibe:   agentRaw.companion_vibe ?? "professional",
    preferred_address: agentRaw.preferred_address ?? "Sir/Ma'am",
    linguistic_notes: agentRaw.linguistic_notes ?? "",
    peek_threshold:   agentRaw.peek_threshold ?? 6.5,
    mesh_depth_days:  agentRaw.mesh_depth_days ?? 180,
    silk_voice_id:    agentRaw.silk_voice_id ?? "",
    voice_mode:       normalizeVoiceMode(agentRaw.voice_mode),
    knowledge_enabled: agentRaw.knowledge_enabled ?? true,
    agent_variables:  agentRaw.agent_variables ?? [],
    tools:            agentRaw.tools ?? [],
    escalation_rules: agentRaw.escalation_rules ?? [],
    no_go_topics:     agentRaw.no_go_topics ?? [],
    total_calls:      agentRaw.total_calls ?? 0,
    calls_today:      agentRaw.calls_today ?? 0,
    empathy_score:    agentRaw.empathy_score ?? 0,
    resolved_rate:    agentRaw.resolved_rate ?? 0,
    avg_handle_time:  agentRaw.avg_handle_time ?? "—",
    call_direction:     agentRaw.call_direction ?? "inbound",
    vapi_phone_number:  agentRaw.vapi_phone_number ?? "",
    outbound_caller_id: agentRaw.outbound_caller_id ?? "",
    outbound_list_url:  agentRaw.outbound_list_url ?? "",
  };

  return (
    <AgentStudio
      initial={initial}
      calls={callsFromDb}
      silkConfigured={silkConfigured}
    />
  );
}