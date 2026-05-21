/**
 * Data Access Layer — all Supabase queries live here.
 * Pages import from this file, never from mock-data.
 * Falls back gracefully to empty data if DB is empty.
 */
import { createClient } from "./supabase/server";
import type {
  Agent, AgentStats, Call, CallAnalysis, Tenant, Metric,
  AgentScript, Integration, UserMeshProfile, ABTest,
  ScriptTool, EscalationRule, IntegrationEndpoint,
  EmotionalDebtEntry, ContextualAnchor, IdentityProfile,
  HeatmapPoint, Pillar,
} from "./types";

// ── Mappers (DB snake_case → TS camelCase) ────────────────────────────────────

function mapAgent(r: Record<string, unknown>): Agent {
  return {
    id: r.id as string,
    name: r.name as string,
    client: r.client as string,
    status: r.status as Agent["status"],
    nodeCount: r.node_count as number,
    createdAt: (r.created_at as string).slice(0, 10),
    lastActive: r.last_active as string,
    pillars: r.pillars as Pillar[],
    description: r.description as string | undefined,
    webhookUrl: r.webhook_url as string | undefined,
    stats: {
      totalCalls: r.total_calls as number,
      callsToday: r.calls_today as number,
      empathyScore: r.empathy_score as number,
      avgHandleTime: r.avg_handle_time as string,
      resolvedRate: r.resolved_rate as number,
    } satisfies AgentStats,
  };
}

function mapCall(r: Record<string, unknown>): Call {
  return {
    id: r.id as string,
    agentId: r.agent_id as string,
    agentName: r.agent_name as string,
    client: r.client as string,
    duration: r.duration as string,
    durationSeconds: r.duration_seconds as number,
    empathyScore: r.empathy_score as number,
    outcome: r.outcome as Call["outcome"],
    tags: r.tags as string[],
    timestamp: r.timestamp as string,
  };
}

function mapCallAnalysis(r: Record<string, unknown>): CallAnalysis {
  const ingress = r.ingress_analysis as Record<string, unknown>;
  const mesh = r.mesh_context as Record<string, unknown>;
  return {
    callId: r.call_id as string,
    heatmap: r.heatmap as HeatmapPoint[],
    ingressAnalysis: {
      pitch: ingress.pitch as number,
      jitter: ingress.jitter as number,
      noiseLevel: ingress.noise_level as number,
      environment: ingress.environment as CallAnalysis["ingressAnalysis"]["environment"],
      language: ingress.language as string,
      confidence: ingress.confidence as number,
    },
    meshContext: {
      interactionsRetrieved: mesh.interactions_retrieved as number,
      emotionalDebt: mesh.emotional_debt as string | null,
      preferredAddress: mesh.preferred_address as string,
      lastOutcome: mesh.last_outcome as Call["outcome"],
      lastTimestamp: mesh.last_timestamp as string,
    },
  };
}

function mapScript(r: Record<string, unknown>): AgentScript {
  return {
    id: r.id as string,
    agentId: r.agent_id as string,
    agentName: r.agent_name as string,
    name: r.name as string,
    version: r.version as number,
    status: r.status as AgentScript["status"],
    systemPrompt: r.system_prompt as string,
    companionVibe: r.companion_vibe as AgentScript["companionVibe"],
    language: r.language as string,
    preferredAddress: r.preferred_address as string,
    linguisticNotes: r.linguistic_notes as string,
    tools: r.tools as ScriptTool[],
    escalationRules: r.escalation_rules as EscalationRule[],
    noGoTopics: r.no_go_topics as string[],
    createdAt: (r.created_at as string).slice(0, 10),
    updatedAt: (r.updated_at as string).slice(0, 10),
  };
}

function mapIntegration(r: Record<string, unknown>): Integration {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Integration["type"],
    status: r.status as Integration["status"],
    baseUrl: r.base_url as string | undefined,
    authType: r.auth_type as Integration["authType"],
    endpoints: r.endpoints as IntegrationEndpoint[],
    lastTested: r.last_tested as string | null,
    createdAt: (r.created_at as string).slice(0, 10),
  };
}

function mapMeshProfile(r: Record<string, unknown>): UserMeshProfile {
  const identity = r.identity_profile as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    client: r.client as string,
    totalInteractions: r.total_interactions as number,
    firstSeen: r.first_seen as string,
    lastSeen: r.last_seen as string,
    emotionalDebtLevel: r.emotional_debt_level as UserMeshProfile["emotionalDebtLevel"],
    emotionalDebtScore: r.emotional_debt_score as number,
    avgEmpathyScore: r.avg_empathy_score as number,
    lastResolution: r.last_resolution as string,
    emotionalDebtHistory: r.emotional_debt_history as EmotionalDebtEntry[],
    identityProfile: identity as unknown as IdentityProfile,
    contextualAnchors: r.contextual_anchors as ContextualAnchor[],
  };
}

function mapABTest(r: Record<string, unknown>): ABTest {
  return {
    id: r.id as string,
    name: r.name as string,
    agentId: r.agent_id as string,
    agentName: r.agent_name as string,
    status: r.status as ABTest["status"],
    startDate: r.start_date as string,
    endDate: r.end_date as string | undefined,
    hypothesis: r.hypothesis as string,
    pathA: r.path_a as ABTest["pathA"],
    pathB: r.path_b as ABTest["pathB"],
    winner: r.winner as ABTest["winner"],
    confidence: r.confidence as number | undefined,
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getTenant(): Promise<Tenant | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", profile.tenant_id)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    plan: data.plan as Tenant["plan"],
    callsThisMonth: data.calls_this_month,
    callLimit: data.call_limit,
    timezone: data.timezone,
    language: data.language,
    escalationEmail: data.escalation_email ?? "",
  };
}

export async function getAgents(): Promise<Agent[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("agents")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapAgent);
}

export async function getAgent(id: string): Promise<Agent | null> {
  const supabase = createClient();
  const { data } = await supabase.from("agents").select("*").eq("id", id).single();
  return data ? mapAgent(data) : null;
}

export async function getCalls(filters?: {
  outcome?: string;
  agentId?: string;
  limit?: number;
}): Promise<Call[]> {
  const supabase = createClient();
  let q = supabase.from("calls").select("*").order("timestamp", { ascending: false });
  if (filters?.outcome && filters.outcome !== "all") q = q.eq("outcome", filters.outcome);
  if (filters?.agentId && filters.agentId !== "all") q = q.eq("agent_id", filters.agentId);
  if (filters?.limit) q = q.limit(filters.limit);
  const { data } = await q;
  return (data ?? []).map(mapCall);
}

export async function getCallAnalysis(callId: string): Promise<CallAnalysis | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("call_analyses")
    .select("*")
    .eq("call_id", callId)
    .single();
  return data ? mapCallAnalysis(data) : null;
}

export async function getMetrics(tenantId?: string): Promise<Metric[]> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: allCalls }, { data: todayCalls }] = await Promise.all([
    supabase.from("calls").select("empathy_score, outcome"),
    supabase.from("calls").select("id").gte("timestamp", today),
  ]);

  const calls = allCalls ?? [];
  const resolved = calls.filter((c) => c.outcome === "resolved");
  const empathyCalls = calls.filter((c) => c.empathy_score > 0);
  const avgEmpathy = empathyCalls.length
    ? (empathyCalls.reduce((s, c) => s + c.empathy_score, 0) / empathyCalls.length).toFixed(1)
    : "0";

  return [
    { label: "active calls", value: "0", sub: "right now", trend: "neutral" },
    { label: "resolved today", value: String(resolved.length), sub: "this session", trend: "up" },
    { label: "avg empathy score", value: `${avgEmpathy}%`, sub: "across all agents", trend: "up" },
    { label: "total calls", value: String(calls.length), sub: "all time", trend: "up" },
  ];
}

export async function getScripts(): Promise<AgentScript[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("scripts")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []).map(mapScript);
}

export async function getScript(id: string): Promise<AgentScript | null> {
  const supabase = createClient();
  const { data } = await supabase.from("scripts").select("*").eq("id", id).single();
  return data ? mapScript(data) : null;
}

export async function getIntegrations(): Promise<Integration[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("integrations")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapIntegration);
}

export async function getMeshProfiles(): Promise<UserMeshProfile[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("mesh_profiles")
    .select("*")
    .order("last_seen", { ascending: false });
  return (data ?? []).map(mapMeshProfile);
}

export async function getMeshProfile(id: string): Promise<UserMeshProfile | null> {
  const supabase = createClient();
  const { data } = await supabase.from("mesh_profiles").select("*").eq("id", id).single();
  return data ? mapMeshProfile(data) : null;
}

export async function getABTests(): Promise<ABTest[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("ab_tests")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapABTest);
}
