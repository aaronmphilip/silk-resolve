import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalls } from "@/lib/dal";
import AgentEditor from "./_components/AgentEditor";
import { getVoiceProviderStatus } from "@/lib/platform";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Parallel fetch: agent + calls (provider status is sync, no await needed)
  const [{ data: agentRaw }, callsFromDb] = await Promise.all([
    supabase.from("agents").select("*").eq("id", id).single(),
    getCalls({ agentId: id, limit: 50 }),
  ]);

  if (!agentRaw) notFound();

  // Detect which voice providers are configured (reads env vars — sync)
  const { silkConfigured } = getVoiceProviderStatus();

  // Normalise DB row → AgentEditor shape
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
    agent_variables:  agentRaw.agent_variables ?? [],
    tools:            agentRaw.tools ?? [],
    escalation_rules: agentRaw.escalation_rules ?? [],
    no_go_topics:     agentRaw.no_go_topics ?? [],
    total_calls:      agentRaw.total_calls ?? 0,
    calls_today:      agentRaw.calls_today ?? 0,
    empathy_score:    agentRaw.empathy_score ?? 0,
    resolved_rate:    agentRaw.resolved_rate ?? 0,
    avg_handle_time:  agentRaw.avg_handle_time ?? "—",
  };

  return (
    <AgentEditor
      initial={initial}
      calls={callsFromDb}
      silkConfigured={silkConfigured}
    />
  );
}
