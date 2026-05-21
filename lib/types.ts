export type AgentStatus = "live" | "paused" | "draft" | "error";
export type Pillar = "PEEK" | "MESH" | "SILK" | "ACTION";
export type CallOutcome = "resolved" | "escalated" | "abandoned";
export type UserRole = "owner" | "admin" | "viewer";
export type PlanTier = "starter" | "growth" | "enterprise";

// ── Agents ──────────────────────────────────────────────────────────────────

export interface AgentStats {
  totalCalls: number;
  callsToday: number;
  empathyScore: number;
  avgHandleTime: string;
  resolvedRate: number;
}

export interface Agent {
  id: string;
  name: string;
  client: string;
  status: AgentStatus;
  nodeCount: number;
  createdAt: string;
  lastActive: string;
  pillars: Pillar[];
  stats: AgentStats;
  description?: string;
  webhookUrl?: string;
}

// ── Calls ────────────────────────────────────────────────────────────────────

export interface Call {
  id: string;
  agentId: string;
  agentName: string;
  client: string;
  duration: string;
  durationSeconds: number;
  empathyScore: number;
  outcome: CallOutcome;
  tags: string[];
  timestamp: string;
}

// ── Settings ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string | null;
  status: "active" | "revoked";
  permissions: string[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  status: "active" | "paused";
  lastDelivery: string | null;
  deliverySuccess: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
  lastSeen: string;
}

// ── Tenant ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: PlanTier;
  callsThisMonth: number;
  callLimit: number;
  timezone: string;
  language: string;
  escalationEmail: string;
}

// ── Dashboard Metrics ────────────────────────────────────────────────────────

export interface Metric {
  label: string;
  value: string;
  sub: string;
  trend?: "up" | "down" | "neutral";
}

// ── Emotional Heatmap ────────────────────────────────────────────────────────

export interface HeatmapPoint {
  t: number;           // seconds into call
  tension: number;     // 0-100
  empathy: number;     // 0-100
  event?: Pillar;
  eventLabel?: string;
}

export interface CallAnalysis {
  callId: string;
  heatmap: HeatmapPoint[];
  ingressAnalysis: {
    pitch: number;       // Hz
    jitter: number;      // ms deviation
    noiseLevel: number;  // dB
    environment: "quiet" | "noisy_market" | "vehicle" | "hospital" | "office";
    language: string;
    confidence: number;
  };
  meshContext: {
    interactionsRetrieved: number;
    emotionalDebt: string | null;
    preferredAddress: string;
    lastOutcome: CallOutcome;
    lastTimestamp: string;
  };
}

// ── A/B Empathy Testing ──────────────────────────────────────────────────────

export interface ABTestPath {
  name: string;
  description: string;
  calls: number;
  empathyScore: number;
  resolvedRate: number;
  avgHandleTime: string;
  retention: number;
  silkConfig: string;
}

export interface ABTest {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  status: "running" | "completed" | "draft";
  startDate: string;
  endDate?: string;
  hypothesis: string;
  pathA: ABTestPath;
  pathB: ABTestPath;
  winner?: "A" | "B" | null;
  confidence?: number;
}

// ── Infrastructure / Edge Nodes ──────────────────────────────────────────────

export type NodeHealth = "healthy" | "degraded" | "offline";

export interface EdgeNode {
  id: string;
  region: string;
  location: string;
  status: NodeHealth;
  latencyMs: number;
  activeConnections: number;
  maxConnections: number;
  cpuPct: number;
  memPct: number;
  version: string;
  deployedAt: string;
  deployMode: "cloud" | "on-premise";
}

export interface SystemComponent {
  name: string;
  pillar: Pillar | "CORE";
  status: NodeHealth;
  latencyMs: number;
  callsProcessed: number;
  lastHealthCheck: string;
  version: string;
}

// ── Scripts ──────────────────────────────────────────────────────────────────

export type ScriptStatus = "draft" | "active" | "archived";

export interface ScriptTool {
  id: string;
  name: string;
  description: string;
  source: "builtin" | "integration";
  integrationId?: string;
  enabled: boolean;
  params: string[];
}

export interface EscalationRule {
  id: string;
  trigger: "tension_threshold" | "topic_match" | "repeat_request" | "explicit_ask" | "sentiment_drop";
  condition: string;
  action: "transfer_human" | "offer_callback" | "send_email";
}

export interface AgentScript {
  id: string;
  agentId: string;
  agentName: string;
  name: string;
  version: number;
  status: ScriptStatus;
  systemPrompt: string;
  companionVibe: CompanionVibe;
  language: string;
  preferredAddress: string;
  linguisticNotes: string;
  tools: ScriptTool[];
  escalationRules: EscalationRule[];
  noGoTopics: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Integrations ─────────────────────────────────────────────────────────────

export type IntegrationType = "rest_api" | "database" | "crm" | "webhook";
export type IntegrationStatus = "connected" | "error" | "pending" | "untested";

export interface IntegrationEndpoint {
  id: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  toolName: string;
  description: string;
  params: string[];
}

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  baseUrl?: string;
  authType?: "bearer" | "api_key" | "basic" | "oauth2";
  endpoints: IntegrationEndpoint[];
  lastTested: string | null;
  createdAt: string;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface BillingPlan {
  name: PlanTier;
  monthlyBase: number;
  minutesIncluded: number;
  pricePerMinute: number;
  maxAgents: number;
}

export interface UsageRecord {
  date: string;
  minutesUsed: number;
  callCount: number;
  costUSD: number;
}

export interface Invoice {
  id: string;
  period: string;
  minutesUsed: number;
  amount: number;
  status: "paid" | "pending" | "overdue";
  issuedAt: string;
}

// ── Mesh / Relationship Stack ────────────────────────────────────────────────

export type CompanionVibe = "casual" | "professional" | "protective";
export type EmotionalDebtLevel = "positive" | "neutral" | "negative" | "critical";

export interface EmotionalDebtEntry {
  date: string;
  note: string;
  callId: string;
  delta: number; // positive = good, negative = bad
}

export interface ContextualAnchor {
  id: string;
  text: string;
  addedAt: string;
  callId: string;
  pillar: "MESH" | "PEEK";
  active: boolean;
}

export interface IdentityProfile {
  language: string;
  companionVibe: CompanionVibe;
  preferredAddress: string;
  linguisticNotes: string;
}

export interface UserMeshProfile {
  id: string;
  name: string;
  phone: string;
  client: string;
  totalInteractions: number;
  firstSeen: string;
  lastSeen: string;
  emotionalDebtLevel: EmotionalDebtLevel;
  emotionalDebtScore: number; // -100 to +100
  emotionalDebtHistory: EmotionalDebtEntry[];
  identityProfile: IdentityProfile;
  contextualAnchors: ContextualAnchor[];
  lastResolution: string;
  avgEmpathyScore: number;
}

// ── Hidden Intent / PEEK Signals ─────────────────────────────────────────────

export type IntentSignalType = "sarcasm" | "hesitation" | "suppressed_frustration" | "latency_spike" | "arousal_mismatch";

export interface HiddenIntentEvent {
  id: string;
  time: string;          // "00:14"
  type: IntentSignalType;
  label: string;
  detail: string;
  arousalScore: number;   // 0-10
  sentimentScore: number; // 0-10, higher = positive
  triggered: string;      // what action was triggered
}

// ── Silk Payload ─────────────────────────────────────────────────────────────

export interface SilkPayloadSegment {
  type: "tag" | "text" | "tag-close";
  value: string;
}

export interface SilkPayload {
  id: string;
  time: string;
  raw: string;
  segments: SilkPayloadSegment[];
  meshInput: string;
  peekInput: string;
  targetEmotion: string;
}
