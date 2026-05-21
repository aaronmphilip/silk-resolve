import type {
  Agent,
  Call,
  ApiKey,
  WebhookEndpoint,
  TeamMember,
  Tenant,
  Metric,
  CallAnalysis,
  ABTest,
  EdgeNode,
  SystemComponent,
  UserMeshProfile,
  HiddenIntentEvent,
  SilkPayload,
  AgentScript,
  Integration,
  BillingPlan,
  UsageRecord,
  Invoice,
} from "./types";

// ── Tenant ────────────────────────────────────────────────────────────────────

export const TENANT: Tenant = {
  id: "ten-apollo",
  name: "Apollo Healthcare",
  slug: "apollo",
  plan: "enterprise",
  callsThisMonth: 12847,
  callLimit: 50000,
  timezone: "Asia/Kolkata",
  language: "Hinglish (hi-IN / en-IN)",
  escalationEmail: "ops@apollo.com",
};

// ── Agents ────────────────────────────────────────────────────────────────────

export const AGENTS: Agent[] = [
  {
    id: "agt-001",
    name: "MedCore Billing",
    client: "Apollo Healthcare",
    status: "live",
    nodeCount: 7,
    createdAt: "2026-03-12",
    lastActive: "2 min ago",
    pillars: ["PEEK", "MESH", "SILK", "ACTION"],
    description:
      "Handles billing disputes, report delays, and payment queries for Apollo's B2C patients.",
    webhookUrl: "https://apollo.internal/silk/billing-callback",
    stats: {
      totalCalls: 4821,
      callsToday: 234,
      empathyScore: 93.2,
      avgHandleTime: "2m 41s",
      resolvedRate: 94.7,
    },
  },
  {
    id: "agt-002",
    name: "FlightCare Resolution",
    client: "AirIndia Express",
    status: "live",
    nodeCount: 9,
    createdAt: "2026-02-28",
    lastActive: "5 min ago",
    pillars: ["PEEK", "MESH", "SILK", "ACTION"],
    description:
      "Manages rebooking, refunds, and compensation claims across AirIndia Express domestic routes.",
    webhookUrl: "https://airindiaexpress.in/silk/resolve",
    stats: {
      totalCalls: 8102,
      callsToday: 412,
      empathyScore: 89.7,
      avgHandleTime: "3m 02s",
      resolvedRate: 91.3,
    },
  },
  {
    id: "agt-003",
    name: "BankResolve Premier",
    client: "Kotak Mahindra",
    status: "live",
    nodeCount: 6,
    createdAt: "2026-01-15",
    lastActive: "12 min ago",
    pillars: ["PEEK", "MESH", "SILK", "ACTION"],
    description:
      "Automates dispute resolution, balance queries, and fee waivers for Kotak Premier customers.",
    webhookUrl: "https://kotak.com/api/silk",
    stats: {
      totalCalls: 3201,
      callsToday: 201,
      empathyScore: 94.1,
      avgHandleTime: "2m 18s",
      resolvedRate: 96.2,
    },
  },
  {
    id: "agt-004",
    name: "RetailCare Returns",
    client: "Myntra Enterprise",
    status: "paused",
    nodeCount: 5,
    createdAt: "2026-04-01",
    lastActive: "2 days ago",
    pillars: ["PEEK", "SILK", "ACTION"],
    description:
      "Handles return requests, refund status, and exchange workflows for Myntra customers.",
    stats: {
      totalCalls: 1089,
      callsToday: 0,
      empathyScore: 87.3,
      avgHandleTime: "2m 05s",
      resolvedRate: 89.4,
    },
  },
  {
    id: "agt-005",
    name: "EduSupport Admissions",
    client: "IIM Ahmedabad",
    status: "draft",
    nodeCount: 4,
    createdAt: "2026-05-18",
    lastActive: "never",
    pillars: ["PEEK", "SILK"],
    description:
      "Admission enquiry resolution and document follow-up for IIMA PGP applicants. In development.",
    stats: {
      totalCalls: 0,
      callsToday: 0,
      empathyScore: 0,
      avgHandleTime: "—",
      resolvedRate: 0,
    },
  },
];

// ── Calls ─────────────────────────────────────────────────────────────────────

export const CALLS: Call[] = [
  { id: "SR-2841", agentId: "agt-001", agentName: "MedCore Billing", client: "Apollo Healthcare", duration: "3m 12s", durationSeconds: 192, empathyScore: 96, outcome: "resolved", tags: ["<apologetic_whisper>", "queue_skip"], timestamp: "2026-05-21 14:32:10" },
  { id: "SR-2840", agentId: "agt-003", agentName: "BankResolve Premier", client: "Kotak Mahindra", duration: "1m 47s", durationSeconds: 107, empathyScore: 88, outcome: "resolved", tags: ["mesh_recall", "<warm>"], timestamp: "2026-05-21 14:29:44" },
  { id: "SR-2839", agentId: "agt-002", agentName: "FlightCare Resolution", client: "AirIndia Express", duration: "4m 01s", durationSeconds: 241, empathyScore: 94, outcome: "resolved", tags: ["peek_escalation", "rebook"], timestamp: "2026-05-21 14:27:02" },
  { id: "SR-2838", agentId: "agt-001", agentName: "MedCore Billing", client: "Apollo Healthcare", duration: "2m 58s", durationSeconds: 178, empathyScore: 79, outcome: "escalated", tags: ["<frustrated>", "human_handoff"], timestamp: "2026-05-21 14:21:18" },
  { id: "SR-2837", agentId: "agt-004", agentName: "RetailCare Returns", client: "Myntra Enterprise", duration: "2m 05s", durationSeconds: 125, empathyScore: 91, outcome: "resolved", tags: ["refund_triggered"], timestamp: "2026-05-21 14:15:33" },
  { id: "SR-2836", agentId: "agt-003", agentName: "BankResolve Premier", client: "Kotak Mahindra", duration: "1m 22s", durationSeconds: 82, empathyScore: 97, outcome: "resolved", tags: ["<warm>", "balance_check"], timestamp: "2026-05-21 14:10:55" },
  { id: "SR-2835", agentId: "agt-002", agentName: "FlightCare Resolution", client: "AirIndia Express", duration: "5m 44s", durationSeconds: 344, empathyScore: 72, outcome: "escalated", tags: ["peak_frustration", "human_handoff", "<distressed>"], timestamp: "2026-05-21 14:04:11" },
  { id: "SR-2834", agentId: "agt-001", agentName: "MedCore Billing", client: "Apollo Healthcare", duration: "2m 31s", durationSeconds: 151, empathyScore: 93, outcome: "resolved", tags: ["mesh_recall", "<empathetic>"], timestamp: "2026-05-21 13:58:47" },
  { id: "SR-2833", agentId: "agt-003", agentName: "BankResolve Premier", client: "Kotak Mahindra", duration: "3m 17s", durationSeconds: 197, empathyScore: 89, outcome: "resolved", tags: ["fraud_check", "<calm>"], timestamp: "2026-05-21 13:51:22" },
  { id: "SR-2832", agentId: "agt-002", agentName: "FlightCare Resolution", client: "AirIndia Express", duration: "1m 58s", durationSeconds: 118, empathyScore: 95, outcome: "resolved", tags: ["<warm_closing>", "upgrade_offered"], timestamp: "2026-05-21 13:44:09" },
  { id: "SR-2831", agentId: "agt-001", agentName: "MedCore Billing", client: "Apollo Healthcare", duration: "0m 47s", durationSeconds: 47, empathyScore: 0, outcome: "abandoned", tags: ["early_disconnect"], timestamp: "2026-05-21 13:39:55" },
  { id: "SR-2830", agentId: "agt-003", agentName: "BankResolve Premier", client: "Kotak Mahindra", duration: "2m 44s", durationSeconds: 164, empathyScore: 98, outcome: "resolved", tags: ["mesh_recall", "<apologetic_whisper>", "fee_waived"], timestamp: "2026-05-21 13:32:18" },
  { id: "SR-2829", agentId: "agt-002", agentName: "FlightCare Resolution", client: "AirIndia Express", duration: "3m 33s", durationSeconds: 213, empathyScore: 87, outcome: "resolved", tags: ["peek_detect", "compensation_issued"], timestamp: "2026-05-21 13:25:41" },
  { id: "SR-2828", agentId: "agt-001", agentName: "MedCore Billing", client: "Apollo Healthcare", duration: "1m 19s", durationSeconds: 79, empathyScore: 92, outcome: "resolved", tags: ["<warm>", "report_dispatched"], timestamp: "2026-05-21 13:18:07" },
  { id: "SR-2827", agentId: "agt-003", agentName: "BankResolve Premier", client: "Kotak Mahindra", duration: "4m 02s", durationSeconds: 242, empathyScore: 83, outcome: "escalated", tags: ["complex_dispute", "human_handoff"], timestamp: "2026-05-21 13:11:50" },
];

// ── Metrics ───────────────────────────────────────────────────────────────────

export const METRICS: Metric[] = [
  { label: "active calls", value: "12", sub: "right now", trend: "up" },
  { label: "resolved today", value: "847", sub: "+124 vs yesterday", trend: "up" },
  { label: "avg empathy score", value: "91.4%", sub: "across all agents", trend: "up" },
  { label: "avg handle time", value: "2m 34s", sub: "↓ 18s this week", trend: "up" },
];

// ── Settings ──────────────────────────────────────────────────────────────────

export const API_KEYS: ApiKey[] = [
  { id: "key-001", name: "Production WebSocket", prefix: "sk_live_4f8a...", createdAt: "2026-03-12", lastUsed: "2 min ago", status: "active", permissions: ["calls.read", "calls.write", "agents.read"] },
  { id: "key-002", name: "CRM Integration", prefix: "sk_live_9c2b...", createdAt: "2026-04-01", lastUsed: "1 hour ago", status: "active", permissions: ["calls.read", "agents.read"] },
  { id: "key-003", name: "Dev Testing", prefix: "sk_test_7e1d...", createdAt: "2026-05-10", lastUsed: "3 days ago", status: "active", permissions: ["calls.read", "calls.write", "agents.read", "agents.write"] },
  { id: "key-004", name: "Legacy Webhook Key", prefix: "sk_live_2a9f...", createdAt: "2026-01-15", lastUsed: null, status: "revoked", permissions: ["calls.read"] },
];

export const WEBHOOKS: WebhookEndpoint[] = [
  { id: "wh-001", url: "https://apollo.internal/silk/resolve-callback", events: ["call.resolved", "call.escalated"], status: "active", lastDelivery: "2 min ago", deliverySuccess: 99.2 },
  { id: "wh-002", url: "https://apollo.internal/silk/metrics", events: ["call.completed"], status: "active", lastDelivery: "5 min ago", deliverySuccess: 98.7 },
  { id: "wh-003", url: "https://crm.apollohealth.com/webhooks/silk", events: ["call.resolved", "action.executed"], status: "paused", lastDelivery: "2 days ago", deliverySuccess: 87.4 },
];

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "usr-001", name: "Aarush Mehta", email: "aarush@apollo.com", role: "owner", joinedAt: "2026-01-01", lastSeen: "now" },
  { id: "usr-002", name: "Priya Sharma", email: "priya@apollo.com", role: "admin", joinedAt: "2026-02-15", lastSeen: "2 hours ago" },
  { id: "usr-003", name: "Vikram Nair", email: "vikram@apollo.com", role: "admin", joinedAt: "2026-03-01", lastSeen: "1 day ago" },
  { id: "usr-004", name: "Kavya Reddy", email: "kavya@apollo.com", role: "viewer", joinedAt: "2026-04-20", lastSeen: "3 days ago" },
];

// ── Emotional Heatmap ─────────────────────────────────────────────────────────

export const CALL_ANALYSES: Record<string, CallAnalysis> = {
  "SR-2841": {
    callId: "SR-2841",
    heatmap: [
      { t: 0,  tension: 38, empathy: 0 },
      { t: 4,  tension: 82, empathy: 14, event: "PEEK", eventLabel: "tension 6.2/10" },
      { t: 8,  tension: 85, empathy: 28, event: "MESH", eventLabel: "delay_march_2026" },
      { t: 13, tension: 88, empathy: 38, event: "PEEK", eventLabel: "URGENT 8.5/10" },
      { t: 16, tension: 72, empathy: 54, event: "SILK", eventLabel: "<apologetic_whisper>" },
      { t: 19, tension: 58, empathy: 67, event: "MESH", eventLabel: "empathy_boost +15%" },
      { t: 23, tension: 42, empathy: 78, event: "ACTION", eventLabel: "queue: 47→1" },
      { t: 27, tension: 30, empathy: 87, event: "SILK", eventLabel: "<warm>" },
      { t: 32, tension: 20, empathy: 93 },
      { t: 38, tension: 14, empathy: 96, event: "SILK", eventLabel: "<warm_closing>" },
      { t: 45, tension: 10, empathy: 96 },
    ],
    ingressAnalysis: {
      pitch: 187,
      jitter: 4.2,
      noiseLevel: 28,
      environment: "hospital",
      language: "Hinglish (hi-IN / en-IN)",
      confidence: 0.94,
    },
    meshContext: {
      interactionsRetrieved: 3,
      emotionalDebt: "Report delayed 3 months ago. High sensitivity flag active.",
      preferredAddress: "Sir",
      lastOutcome: "escalated",
      lastTimestamp: "2026-03-14 11:22:05",
    },
  },
  "SR-2839": {
    callId: "SR-2839",
    heatmap: [
      { t: 0,  tension: 42, empathy: 0 },
      { t: 6,  tension: 76, empathy: 20, event: "PEEK", eventLabel: "tension 7.1/10" },
      { t: 11, tension: 80, empathy: 34, event: "MESH", eventLabel: "prev_flight_delay" },
      { t: 18, tension: 65, empathy: 52, event: "SILK", eventLabel: "<empathetic>" },
      { t: 24, tension: 48, empathy: 68, event: "ACTION", eventLabel: "rebook_initiated" },
      { t: 31, tension: 30, empathy: 84 },
      { t: 38, tension: 18, empathy: 93, event: "SILK", eventLabel: "<warm_closing>" },
      { t: 45, tension: 12, empathy: 94 },
    ],
    ingressAnalysis: {
      pitch: 204,
      jitter: 6.1,
      noiseLevel: 52,
      environment: "noisy_market",
      language: "Hindi (hi-IN)",
      confidence: 0.88,
    },
    meshContext: {
      interactionsRetrieved: 5,
      emotionalDebt: "Two prior flight cancellations. Priority tier: Gold.",
      preferredAddress: "Bhaiya",
      lastOutcome: "escalated",
      lastTimestamp: "2026-04-02 08:41:18",
    },
  },
  "SR-2835": {
    callId: "SR-2835",
    heatmap: [
      { t: 0,  tension: 55, empathy: 0 },
      { t: 3,  tension: 90, empathy: 8,  event: "PEEK", eventLabel: "tension 9.1/10" },
      { t: 9,  tension: 92, empathy: 20, event: "MESH", eventLabel: "3 prior escalations" },
      { t: 15, tension: 88, empathy: 30, event: "SILK", eventLabel: "<apologetic_whisper>" },
      { t: 22, tension: 85, empathy: 42 },
      { t: 30, tension: 80, empathy: 52 },
      { t: 38, tension: 75, empathy: 58, event: "ACTION", eventLabel: "human_handoff" },
      { t: 45, tension: 72, empathy: 60 },
    ],
    ingressAnalysis: {
      pitch: 228,
      jitter: 11.4,
      noiseLevel: 61,
      environment: "vehicle",
      language: "English (en-IN)",
      confidence: 0.79,
    },
    meshContext: {
      interactionsRetrieved: 7,
      emotionalDebt: "Critical: 3 unresolved escalations. Human priority flag.",
      preferredAddress: "Sir",
      lastOutcome: "escalated",
      lastTimestamp: "2026-05-19 14:02:44",
    },
  },
};

// ── A/B Empathy Testing ───────────────────────────────────────────────────────

export const AB_TESTS: ABTest[] = [
  {
    id: "ab-001",
    name: "Formal vs Warm Hinglish",
    agentId: "agt-001",
    agentName: "MedCore Billing",
    status: "completed",
    startDate: "2026-04-15",
    endDate: "2026-05-01",
    hypothesis: "A warm, Hinglish-inflected tone with emotional prosody tags will increase first-call resolution and 30-day retention versus a formal, efficient English response.",
    pathA: {
      name: "Path A — Formal & Efficient",
      description: "Standard English. Direct, professional. No prosody tags. Resolution-first.",
      calls: 412,
      empathyScore: 74.2,
      resolvedRate: 83.1,
      avgHandleTime: "2m 11s",
      retention: 67,
      silkConfig: "voice: formal_en · mesh: disabled · peek: threshold 8.0",
    },
    pathB: {
      name: "Path B — Warm, Hinglish, Apologetic",
      description: "Hinglish code-switch. Emotional debt aware. Prosody tags: <warm>, <apologetic_whisper>, <warm_closing>.",
      calls: 409,
      empathyScore: 93.4,
      resolvedRate: 94.7,
      avgHandleTime: "2m 41s",
      retention: 87,
      silkConfig: "voice: hinglish_warm · mesh: enabled · peek: threshold 6.5 · tags: full",
    },
    winner: "B",
    confidence: 97.3,
  },
  {
    id: "ab-002",
    name: "Low Threshold PEEK vs Standard",
    agentId: "agt-002",
    agentName: "FlightCare Resolution",
    status: "running",
    startDate: "2026-05-10",
    hypothesis: "Lowering PEEK's tension threshold from 7.0 to 5.5 will catch latent frustration earlier and reduce escalation rate.",
    pathA: {
      name: "Path A — Standard PEEK (7.0)",
      description: "PEEK fires at tension ≥ 7.0. Standard escalation flow.",
      calls: 201,
      empathyScore: 89.7,
      resolvedRate: 91.3,
      avgHandleTime: "3m 02s",
      retention: 79,
      silkConfig: "peek: threshold 7.0 · silk: standard",
    },
    pathB: {
      name: "Path B — Sensitive PEEK (5.5)",
      description: "PEEK fires at tension ≥ 5.5. Earlier empathy injection, proactive de-escalation.",
      calls: 198,
      empathyScore: 92.1,
      resolvedRate: 93.8,
      avgHandleTime: "3m 18s",
      retention: 83,
      silkConfig: "peek: threshold 5.5 · silk: proactive",
    },
    winner: null,
    confidence: 71.2,
  },
  {
    id: "ab-003",
    name: "Mesh Depth: 6mo vs 2yr",
    agentId: "agt-003",
    agentName: "BankResolve Premier",
    status: "draft",
    startDate: "2026-06-01",
    hypothesis: "Extending Mesh memory from 6 months to 2 years of interaction history will improve personalisation and reduce repeat escalations.",
    pathA: {
      name: "Path A — 6-Month Mesh",
      description: "Mesh recalls last 6 months of interactions only.",
      calls: 0,
      empathyScore: 0,
      resolvedRate: 0,
      avgHandleTime: "—",
      retention: 0,
      silkConfig: "mesh: depth 6mo",
    },
    pathB: {
      name: "Path B — 2-Year Mesh",
      description: "Mesh recalls full 2-year interaction history with emotional debt weighting.",
      calls: 0,
      empathyScore: 0,
      resolvedRate: 0,
      avgHandleTime: "—",
      retention: 0,
      silkConfig: "mesh: depth 2yr · debt: weighted",
    },
    winner: null,
    confidence: 0,
  },
];

// ── Infrastructure ────────────────────────────────────────────────────────────

export const EDGE_NODES: EdgeNode[] = [
  {
    id: "node-mum-01",
    region: "IN-MUM",
    location: "Mumbai, Maharashtra",
    status: "healthy",
    latencyMs: 42,
    activeConnections: 1284,
    maxConnections: 5000,
    cpuPct: 38,
    memPct: 51,
    version: "silk-core 2.1.4",
    deployedAt: "2026-05-20 02:00:00",
    deployMode: "cloud",
  },
  {
    id: "node-del-01",
    region: "IN-DEL",
    location: "Delhi NCR",
    status: "healthy",
    latencyMs: 38,
    activeConnections: 892,
    maxConnections: 5000,
    cpuPct: 29,
    memPct: 44,
    version: "silk-core 2.1.4",
    deployedAt: "2026-05-20 02:00:00",
    deployMode: "cloud",
  },
  {
    id: "node-blr-01",
    region: "IN-BLR",
    location: "Bangalore, Karnataka",
    status: "degraded",
    latencyMs: 127,
    activeConnections: 341,
    maxConnections: 5000,
    cpuPct: 71,
    memPct: 82,
    version: "silk-core 2.1.3",
    deployedAt: "2026-05-18 14:30:00",
    deployMode: "cloud",
  },
  {
    id: "node-apollo-edge",
    region: "ON-PREM",
    location: "Apollo Healthcare DC, Chennai",
    status: "healthy",
    latencyMs: 11,
    activeConnections: 234,
    maxConnections: 500,
    cpuPct: 22,
    memPct: 61,
    version: "silk-edge 2.1.4 (8GB)",
    deployedAt: "2026-04-01 09:00:00",
    deployMode: "on-premise",
  },
];

// ── Mesh Profiles / Relationship Stack ───────────────────────────────────────

export const USER_MESH_PROFILES: UserMeshProfile[] = [
  {
    id: "usr-mesh-001",
    name: "Rajesh Iyer",
    phone: "+91 98201 44382",
    client: "Apollo Healthcare",
    totalInteractions: 8,
    firstSeen: "2025-11-04",
    lastSeen: "2026-05-21",
    emotionalDebtLevel: "negative",
    emotionalDebtScore: -42,
    avgEmpathyScore: 84,
    lastResolution: "resolved",
    emotionalDebtHistory: [
      { date: "2025-11-04", note: "First contact. Report issue resolved quickly.", callId: "SR-0041", delta: +12 },
      { date: "2026-01-18", note: "Billing dispute. Escalated to human. User expressed disappointment.", callId: "SR-0319", delta: -28 },
      { date: "2026-03-14", note: "Report delayed 3 months — anger threshold triggered. Human handoff.", callId: "SR-1102", delta: -38 },
      { date: "2026-05-21", note: "Queue prioritized. Apologetic whisper resolved in under 4 mins.", callId: "SR-2841", delta: +12 },
    ],
    identityProfile: {
      language: "Hinglish (hi-IN / en-IN)",
      companionVibe: "protective",
      preferredAddress: "Sir",
      linguisticNotes: "Code-switches mid-sentence. Responds well to formal acknowledgement + emotional softness. Avoid corporate jargon.",
    },
    contextualAnchors: [
      { id: "anc-001", text: "Daughter's medical exam results were the reason for urgency on 14 March call.", addedAt: "2026-03-14", callId: "SR-1102", pillar: "PEEK", active: true },
      { id: "anc-002", text: "Prefers calls resolved in under 5 minutes. Gets frustrated with transfers.", addedAt: "2026-01-18", callId: "SR-0319", pillar: "MESH", active: true },
      { id: "anc-003", text: "Had a bad experience with Apollo billing portal — avoid mentioning it.", addedAt: "2026-03-14", callId: "SR-1102", pillar: "MESH", active: true },
    ],
  },
  {
    id: "usr-mesh-002",
    name: "Priya Venkataraman",
    phone: "+91 90044 12871",
    client: "AirIndia Express",
    totalInteractions: 12,
    firstSeen: "2025-09-11",
    lastSeen: "2026-05-21",
    emotionalDebtLevel: "negative",
    emotionalDebtScore: -55,
    avgEmpathyScore: 79,
    lastResolution: "escalated",
    emotionalDebtHistory: [
      { date: "2025-09-11", note: "First booking issue resolved. Happy outcome.", callId: "SR-0088", delta: +18 },
      { date: "2025-12-24", note: "Flight cancelled Christmas eve. Severe distress. Partial refund only.", callId: "SR-0542", delta: -40 },
      { date: "2026-02-14", note: "Second cancellation. Escalated. Refund processed late.", callId: "SR-0891", delta: -35 },
      { date: "2026-04-02", note: "Third delay. Previous history recalled. Gold tier upgrade offered.", callId: "SR-1401", delta: +12 },
      { date: "2026-05-21", note: "Rebooking. High arousal at start. Silk de-escalated. Resolved.", callId: "SR-2839", delta: +10 },
    ],
    identityProfile: {
      language: "Hindi (hi-IN)",
      companionVibe: "protective",
      preferredAddress: "Bhaiya",
      linguisticNotes: "Prefers Hindi. Speaks fast under stress. Long pauses = high frustration. Use <whisper> immediately on latency spike.",
    },
    contextualAnchors: [
      { id: "anc-004", text: "Christmas 2025 cancellation caused her to miss family travel — emotionally significant event.", addedAt: "2025-12-24", callId: "SR-0542", pillar: "PEEK", active: true },
      { id: "anc-005", text: "Upgraded to Gold tier after 3 cancellations. Must be acknowledged in every call.", addedAt: "2026-04-02", callId: "SR-1401", pillar: "MESH", active: true },
      { id: "anc-006", text: "Doesn't trust automated refunds. Wants confirmation email + SMS.", addedAt: "2026-02-14", callId: "SR-0891", pillar: "MESH", active: true },
    ],
  },
  {
    id: "usr-mesh-003",
    name: "Amit Bose",
    phone: "+91 98765 00341",
    client: "Kotak Mahindra",
    totalInteractions: 4,
    firstSeen: "2026-02-10",
    lastSeen: "2026-05-21",
    emotionalDebtLevel: "positive",
    emotionalDebtScore: +61,
    avgEmpathyScore: 96,
    lastResolution: "resolved",
    emotionalDebtHistory: [
      { date: "2026-02-10", note: "Fee waiver request. Agent resolved in 90 seconds. Delighted.", callId: "SR-0712", delta: +25 },
      { date: "2026-03-28", note: "Balance query. Resolved instantly. Positive response.", callId: "SR-1089", delta: +18 },
      { date: "2026-05-01", note: "Fraud check initiated. Handled sensitively. User relieved.", callId: "SR-1677", delta: +18 },
    ],
    identityProfile: {
      language: "English (en-IN)",
      companionVibe: "professional",
      preferredAddress: "Mr. Bose",
      linguisticNotes: "Formal English preferred. Businesslike. Appreciates efficiency. Minimal small talk. Gets impatient with emotional warmth.",
    },
    contextualAnchors: [
      { id: "anc-007", text: "Senior banking executive. Time is extremely limited — aim for sub-2 minute resolution.", addedAt: "2026-02-10", callId: "SR-0712", pillar: "PEEK", active: true },
      { id: "anc-008", text: "Had a fraudulent charge attempt in March — heightened security awareness.", addedAt: "2026-05-01", callId: "SR-1677", pillar: "MESH", active: true },
    ],
  },
  {
    id: "usr-mesh-004",
    name: "Sunita Rawat",
    phone: "+91 97310 55822",
    client: "Myntra Enterprise",
    totalInteractions: 6,
    firstSeen: "2026-03-02",
    lastSeen: "2026-05-18",
    emotionalDebtLevel: "neutral",
    emotionalDebtScore: +8,
    avgEmpathyScore: 88,
    lastResolution: "resolved",
    emotionalDebtHistory: [
      { date: "2026-03-02", note: "First return request. Slight delay in processing.", callId: "SR-0801", delta: -8 },
      { date: "2026-03-18", note: "Refund status check. Resolved with warmth.", callId: "SR-0877", delta: +14 },
      { date: "2026-04-10", note: "Exchange workflow. Smooth resolution. Positive ending.", callId: "SR-1244", delta: +12 },
      { date: "2026-05-18", note: "Refund triggered in under 2 minutes. Happy outcome.", callId: "SR-2837", delta: +10 },
    ],
    identityProfile: {
      language: "Hinglish (hi-IN / en-IN)",
      companionVibe: "casual",
      preferredAddress: "Sunita",
      linguisticNotes: "Casual tone works best. Uses slang naturally. Appreciates humor if tension is low. Use <soft_laugh> when appropriate.",
    },
    contextualAnchors: [
      { id: "anc-009", text: "Mentioned she shops for family of 5 — returns are frequent and expected.", addedAt: "2026-03-02", callId: "SR-0801", pillar: "MESH", active: true },
      { id: "anc-010", text: "Prefers WhatsApp confirmation over email.", addedAt: "2026-03-18", callId: "SR-0877", pillar: "PEEK", active: false },
    ],
  },
  {
    id: "usr-mesh-005",
    name: "Harsh Malhotra",
    phone: "+91 99881 20014",
    client: "AirIndia Express",
    totalInteractions: 14,
    firstSeen: "2025-07-19",
    lastSeen: "2026-05-20",
    emotionalDebtLevel: "critical",
    emotionalDebtScore: -81,
    avgEmpathyScore: 61,
    lastResolution: "escalated",
    emotionalDebtHistory: [
      { date: "2025-07-19", note: "Initial flight issue. Resolved.", callId: "SR-0011", delta: +10 },
      { date: "2025-09-30", note: "Refund delay. Escalated.", callId: "SR-0201", delta: -22 },
      { date: "2025-11-15", note: "Mishandled complaint. Agent lacked empathy. User very angry.", callId: "SR-0387", delta: -31 },
      { date: "2026-01-08", note: "3rd escalation. Compensation demanded. Partial issued.", callId: "SR-0609", delta: -18 },
      { date: "2026-03-22", note: "4th unresolved. Human handoff forced.", callId: "SR-1188", delta: -20 },
    ],
    identityProfile: {
      language: "English (en-IN)",
      companionVibe: "protective",
      preferredAddress: "Mr. Malhotra",
      linguisticNotes: "Speaks quickly. Formal English. Very direct. Interrupts frequently — do not wait for full pause. Triggers on corporate language.",
    },
    contextualAnchors: [
      { id: "anc-011", text: "Business traveller — 3 missed meetings due to flight issues. Compensation owed.", addedAt: "2026-01-08", callId: "SR-0609", pillar: "PEEK", active: true },
      { id: "anc-012", text: "Has threatened Twitter complaint twice. Social escalation risk flagged.", addedAt: "2026-03-22", callId: "SR-1188", pillar: "MESH", active: true },
      { id: "anc-013", text: "Wife travelling separately on same airline — often calls about joint bookings.", addedAt: "2025-11-15", callId: "SR-0387", pillar: "MESH", active: true },
    ],
  },
];

// ── Hidden Intent Events (Observer simulation) ────────────────────────────────

export const HIDDEN_INTENT_EVENTS: HiddenIntentEvent[] = [
  {
    id: "hi-001",
    time: "00:06",
    type: "arousal_mismatch",
    label: "Sarcasm Detected",
    detail: "\"Sure, take your time\" — high arousal (8.1) + positive lexical → sarcasm flag",
    arousalScore: 8.1,
    sentimentScore: 7.4,
    triggered: "PEEK alert · <apologetic_whisper> pre-loaded",
  },
  {
    id: "hi-002",
    time: "00:14",
    type: "latency_spike",
    label: "Hesitation Signal",
    detail: "3.4s pause after agent question → suppressed distress pattern",
    arousalScore: 5.2,
    sentimentScore: 3.1,
    triggered: "<whisper> injected · MESH re-queried",
  },
  {
    id: "hi-003",
    time: "00:21",
    type: "suppressed_frustration",
    label: "Suppressed Frustration",
    detail: "Short clipped responses + rising pitch but calm words → tension building",
    arousalScore: 7.8,
    sentimentScore: 4.2,
    triggered: "PEEK escalation · empathy_boost +20%",
  },
  {
    id: "hi-004",
    time: "00:29",
    type: "hesitation",
    label: "Hesitation Resolved",
    detail: "Response latency normalised. Tone softening detected.",
    arousalScore: 3.4,
    sentimentScore: 6.8,
    triggered: "<warm> tag queued for next utterance",
  },
];

// ── Silk Payloads (Observer simulation) ──────────────────────────────────────

export const SILK_PAYLOADS: SilkPayload[] = [
  {
    id: "sp-001",
    time: "00:08",
    raw: "<warm_tone> <soft_laugh> Arre bhaiya, <whisper> don't worry at all. </whisper> I've already pushed that refund through — it'll hit your account in 2 hours. </warm_tone>",
    segments: [
      { type: "tag", value: "<warm_tone>" },
      { type: "tag", value: "<soft_laugh>" },
      { type: "text", value: " Arre bhaiya, " },
      { type: "tag", value: "<whisper>" },
      { type: "text", value: " don't worry at all. " },
      { type: "tag-close", value: "</whisper>" },
      { type: "text", value: " I've already pushed that refund through — it'll hit your account in 2 hours. " },
      { type: "tag-close", value: "</warm_tone>" },
    ],
    meshInput: "Emotional debt: negative · preferredAddress: Bhaiya · prev_flight_delay",
    peekInput: "Arousal 8.1 · sarcasm flag · hesitation at 00:14",
    targetEmotion: "Anxious → Comforted",
  },
  {
    id: "sp-002",
    time: "00:22",
    raw: "<apologetic_whisper> I sincerely apologise, Sir. Three months is too long — that's completely on us. </apologetic_whisper> <warm> Let me make this right right now. </warm>",
    segments: [
      { type: "tag", value: "<apologetic_whisper>" },
      { type: "text", value: " I sincerely apologise, Sir. Three months is too long — that's completely on us. " },
      { type: "tag-close", value: "</apologetic_whisper>" },
      { type: "tag", value: "<warm>" },
      { type: "text", value: " Let me make this right right now. " },
      { type: "tag-close", value: "</warm>" },
    ],
    meshInput: "Emotional debt: -42 · 3 prior escalations · preferredAddress: Sir",
    peekInput: "Tension 9.1/10 · suppressed_frustration pattern",
    targetEmotion: "Frustrated → Acknowledged",
  },
  {
    id: "sp-003",
    time: "00:35",
    raw: "<warm_closing> Is there anything else I can do for you today, Sir? Your report is on its way. </warm_closing>",
    segments: [
      { type: "tag", value: "<warm_closing>" },
      { type: "text", value: " Is there anything else I can do for you today, Sir? Your report is on its way. " },
      { type: "tag-close", value: "</warm_closing>" },
    ],
    meshInput: "Emotional debt rising → neutral · resolution confirmed",
    peekInput: "Tension 1.8/10 · latency normal · positive sentiment",
    targetEmotion: "Comforted → Satisfied",
  },
];

// ── Scripts ───────────────────────────────────────────────────────────────────

export const SCRIPTS: AgentScript[] = [
  {
    id: "scr-001",
    agentId: "agt-001",
    agentName: "MedCore Billing",
    name: "Apollo Billing Resolution v3",
    version: 3,
    status: "active",
    systemPrompt: `You are a billing resolution specialist for Apollo Healthcare. Your name is Aria.

Your job is to resolve billing disputes, report delays, and payment queries for Apollo's patients — with genuine warmth and zero corporate detachment.

CONTEXT YOU WILL RECEIVE:
- Patient name, ID, and account history via MESH
- Current tension level and emotional signals via PEEK
- Preferred address and linguistic style

RESOLUTION PRIORITIES:
1. Acknowledge the issue immediately — never minimise wait times or errors
2. Use lookup_patient to retrieve current report/bill status before responding
3. If a report is delayed >48h, skip standard queue and use escalate_queue_priority
4. For billing disputes over ₹5,000, offer a 15-day payment hold automatically
5. Always confirm resolution via send_confirmation before ending the call

TONE:
- Warm, never robotic. Use {{preferred_address}} always.
- If PEEK detects tension >7.0, slow down, lower register, use <apologetic_whisper>
- Never say "as per our policy" — say "here's what I can do for you"
- Code-switch to Hinglish if {{language}} is hi-IN

NEVER:
- Promise timelines you cannot confirm in the system
- Mention internal ticket numbers
- Ask the patient to call back`,
    companionVibe: "protective",
    language: "Hinglish (hi-IN / en-IN)",
    preferredAddress: "Sir/Ma'am",
    linguisticNotes: "Default to warm Hinglish. Switch to formal English if patient uses English first. Use <soft_laugh> only when tension < 3.0.",
    tools: [
      { id: "t-001", name: "lookup_patient", description: "Retrieve patient record by phone or ID", source: "integration", integrationId: "int-001", enabled: true, params: ["patient_id", "phone"] },
      { id: "t-002", name: "get_report_status", description: "Check current status of a medical report", source: "integration", integrationId: "int-001", enabled: true, params: ["report_id"] },
      { id: "t-003", name: "escalate_queue_priority", description: "Move patient request to top of processing queue", source: "integration", integrationId: "int-001", enabled: true, params: ["patient_id", "reason"] },
      { id: "t-004", name: "process_payment_hold", description: "Apply a 15-day payment hold to billing account", source: "integration", integrationId: "int-001", enabled: true, params: ["account_id", "amount", "hold_days"] },
      { id: "t-005", name: "send_confirmation", description: "Send SMS + email confirmation of resolution", source: "builtin", enabled: true, params: ["patient_id", "message"] },
      { id: "t-006", name: "escalate_to_human", description: "Transfer call to human agent with full context", source: "builtin", enabled: true, params: ["reason", "priority"] },
    ],
    escalationRules: [
      { id: "er-001", trigger: "tension_threshold", condition: "tension > 8.5 sustained for 45 seconds", action: "transfer_human" },
      { id: "er-002", trigger: "topic_match", condition: "topic contains 'legal' OR 'court' OR 'consumer forum'", action: "transfer_human" },
      { id: "er-003", trigger: "repeat_request", condition: "patient requests human agent 2+ times", action: "transfer_human" },
      { id: "er-004", trigger: "sentiment_drop", condition: "empathy score drops below 40 after 3 minutes", action: "offer_callback" },
    ],
    noGoTopics: ["staff names", "internal hospital systems", "other patients", "pricing of procedures"],
    createdAt: "2026-03-12",
    updatedAt: "2026-05-20",
  },
  {
    id: "scr-002",
    agentId: "agt-002",
    agentName: "FlightCare Resolution",
    name: "AirIndia Express Resolution v2",
    version: 2,
    status: "active",
    systemPrompt: `You are a flight resolution specialist for AirIndia Express. Your name is Priya.

Handle rebooking, refunds, and compensation claims for domestic routes — with the efficiency of an airline ops team and the warmth of someone who genuinely gets it.

CONTEXT YOU WILL RECEIVE:
- Booking reference, passenger details, and flight history via MESH
- Emotional debt level — if negative, acknowledge past issues before anything else
- Prior cancellations or delays on record

RESOLUTION PRIORITIES:
1. For cancellations: offer immediate rebook on next available flight first
2. For refunds: initiate within the call using process_refund — never tell passenger to "wait for email"
3. Gold tier passengers (flag in MESH): skip standard hold queue, always
4. For 2+ prior cancellations: offer proactive compensation without passenger asking
5. Always send SMS + email confirmation before hanging up

TONE:
- Direct and confident, not apologetic to the point of seeming incompetent
- Use <empathetic> tag when acknowledging delays/cancellations
- If passenger is a frequent traveller (5+ flights): treat as insider, use casual tone
- Never say "I understand your frustration" as an opener — it's weak

NEVER:
- Quote regulations or airline policies verbatim
- Tell a Gold tier passenger to visit the airport counter
- Promise compensation amounts you haven't confirmed in the system`,
    companionVibe: "professional",
    language: "Hindi (hi-IN)",
    preferredAddress: "Ji",
    linguisticNotes: "Primary Hindi. English for technical terms (booking ref, PNR). If PEEK detects high arousal, drop to <whisper> immediately.",
    tools: [
      { id: "t-010", name: "lookup_booking", description: "Retrieve booking by PNR or passenger phone", source: "integration", integrationId: "int-002", enabled: true, params: ["pnr", "phone"] },
      { id: "t-011", name: "rebook_flight", description: "Rebook passenger on next available flight", source: "integration", integrationId: "int-002", enabled: true, params: ["pnr", "preferred_date", "class"] },
      { id: "t-012", name: "process_refund", description: "Initiate refund to original payment method", source: "integration", integrationId: "int-002", enabled: true, params: ["pnr", "amount", "reason"] },
      { id: "t-013", name: "apply_compensation", description: "Apply travel credit or voucher to passenger account", source: "integration", integrationId: "int-002", enabled: true, params: ["passenger_id", "credit_amount", "expiry_days"] },
      { id: "t-014", name: "send_confirmation", description: "Send rebooking or refund confirmation via SMS + email", source: "builtin", enabled: true, params: ["passenger_id", "type", "details"] },
      { id: "t-015", name: "escalate_to_human", description: "Transfer to human agent", source: "builtin", enabled: true, params: ["reason", "priority"] },
    ],
    escalationRules: [
      { id: "er-010", trigger: "tension_threshold", condition: "tension > 9.0 for 30 seconds", action: "transfer_human" },
      { id: "er-011", trigger: "topic_match", condition: "topic contains 'DGCA' OR 'consumer court' OR 'news'", action: "transfer_human" },
      { id: "er-012", trigger: "repeat_request", condition: "passenger requests human 2+ times", action: "transfer_human" },
    ],
    noGoTopics: ["specific aircraft faults", "crew names", "other passengers", "ATC decisions"],
    createdAt: "2026-02-28",
    updatedAt: "2026-05-15",
  },
  {
    id: "scr-003",
    agentId: "agt-003",
    agentName: "BankResolve Premier",
    name: "Kotak Premier Banking v1",
    version: 1,
    status: "draft",
    systemPrompt: `You are a Premier Banking specialist for Kotak Mahindra Bank. Your name is Arjun.

Handle balance disputes, fee waivers, and fraud checks for Premier account holders.

CONTEXT:
- Account details and transaction history via MESH
- Risk flags and fraud indicators
- Preferred communication style (most Premier customers prefer formal English)

ALWAYS:
- Verify identity before ANY account action (use verify_identity tool)
- For fee waiver requests under ₹500: approve immediately
- For amounts ₹500-₹2000: approve if customer tenure > 2 years
- For fraud flags: initiate fraud review within the call, reassure customer

TONE:
- Professional and precise. This is a Premier relationship, not a call centre interaction.
- Address as {{preferred_address}} always
- Minimal small talk — respect that this is a busy, high-value customer

NEVER:
- Ask the customer to visit the branch for something resolvable on-call
- Mention competitor bank names
- Discuss internal risk scoring`,
    companionVibe: "professional",
    language: "English (en-IN)",
    preferredAddress: "Mr./Ms.",
    linguisticNotes: "Formal English throughout. Use 'certainly' not 'sure'. Never 'no problem' — use 'absolutely'. Short sentences.",
    tools: [
      { id: "t-020", name: "verify_identity", description: "Verify customer identity via OTP", source: "integration", integrationId: "int-003", enabled: true, params: ["account_id", "method"] },
      { id: "t-021", name: "lookup_account", description: "Retrieve account details and recent transactions", source: "integration", integrationId: "int-003", enabled: true, params: ["account_id"] },
      { id: "t-022", name: "waive_fee", description: "Waive a fee on the account", source: "integration", integrationId: "int-003", enabled: false, params: ["account_id", "fee_id", "reason"] },
      { id: "t-023", name: "initiate_fraud_review", description: "Flag a transaction for fraud investigation", source: "integration", integrationId: "int-003", enabled: true, params: ["account_id", "transaction_id"] },
      { id: "t-024", name: "send_confirmation", description: "Send action confirmation to registered mobile", source: "builtin", enabled: true, params: ["account_id", "message"] },
      { id: "t-025", name: "escalate_to_human", description: "Transfer to Relationship Manager", source: "builtin", enabled: true, params: ["reason", "priority"] },
    ],
    escalationRules: [
      { id: "er-020", trigger: "tension_threshold", condition: "tension > 8.0 for 60 seconds", action: "transfer_human" },
      { id: "er-021", trigger: "topic_match", condition: "topic contains 'RBI' OR 'ombudsman' OR 'fraud complaint'", action: "transfer_human" },
      { id: "er-022", trigger: "explicit_ask", condition: "customer requests Relationship Manager by name", action: "transfer_human" },
    ],
    noGoTopics: ["specific interest rates", "internal credit scoring", "other customers", "RBI compliance details"],
    createdAt: "2026-05-18",
    updatedAt: "2026-05-18",
  },
];

// ── Integrations ──────────────────────────────────────────────────────────────

export const INTEGRATIONS: Integration[] = [
  {
    id: "int-001",
    name: "Apollo Healthcare CRM",
    type: "rest_api",
    status: "connected",
    baseUrl: "https://api.apollo.internal/v2",
    authType: "bearer",
    endpoints: [
      { id: "ep-001", name: "Lookup Patient", method: "GET", path: "/patients/{patient_id}", toolName: "lookup_patient", description: "Retrieve patient record including billing, reports, and history", params: ["patient_id"] },
      { id: "ep-002", name: "Get Report Status", method: "GET", path: "/reports/{report_id}/status", toolName: "get_report_status", description: "Check processing status of a diagnostic report", params: ["report_id"] },
      { id: "ep-003", name: "Escalate Queue Priority", method: "POST", path: "/queue/escalate", toolName: "escalate_queue_priority", description: "Move a request to top of processing queue", params: ["patient_id", "reason"] },
      { id: "ep-004", name: "Process Payment Hold", method: "POST", path: "/billing/hold", toolName: "process_payment_hold", description: "Apply a payment hold to an account", params: ["account_id", "days"] },
    ],
    lastTested: "2026-05-21 14:30",
    createdAt: "2026-03-12",
  },
  {
    id: "int-002",
    name: "AirIndia Express Booking API",
    type: "rest_api",
    status: "connected",
    baseUrl: "https://api.airindiaexpress.in/silk/v1",
    authType: "api_key",
    endpoints: [
      { id: "ep-010", name: "Lookup Booking", method: "GET", path: "/bookings/{pnr}", toolName: "lookup_booking", description: "Retrieve booking details by PNR", params: ["pnr"] },
      { id: "ep-011", name: "Rebook Flight", method: "POST", path: "/bookings/{pnr}/rebook", toolName: "rebook_flight", description: "Rebook passenger on next available flight", params: ["pnr", "preferred_date"] },
      { id: "ep-012", name: "Process Refund", method: "POST", path: "/bookings/{pnr}/refund", toolName: "process_refund", description: "Initiate full or partial refund", params: ["pnr", "amount"] },
      { id: "ep-013", name: "Apply Compensation", method: "POST", path: "/passengers/{id}/credit", toolName: "apply_compensation", description: "Issue travel credit to passenger account", params: ["passenger_id", "amount"] },
    ],
    lastTested: "2026-05-21 11:15",
    createdAt: "2026-02-28",
  },
  {
    id: "int-003",
    name: "Kotak Core Banking (Read)",
    type: "database",
    status: "pending",
    baseUrl: "postgresql://kotak-readonly.internal:5432/corebank",
    authType: "basic",
    endpoints: [
      { id: "ep-020", name: "Lookup Account", method: "GET", path: "/accounts/{account_id}", toolName: "lookup_account", description: "Retrieve account balance and recent 30 transactions", params: ["account_id"] },
      { id: "ep-021", name: "Verify Identity", method: "POST", path: "/auth/verify-otp", toolName: "verify_identity", description: "Send OTP and verify customer identity", params: ["account_id", "phone"] },
      { id: "ep-022", name: "Get Fee History", method: "GET", path: "/accounts/{account_id}/fees", toolName: "get_fee_history", description: "Retrieve recent fee charges", params: ["account_id"] },
      { id: "ep-023", name: "Waive Fee", method: "POST", path: "/accounts/{account_id}/waive-fee", toolName: "waive_fee", description: "Waive a specific fee charge", params: ["account_id", "fee_id"] },
    ],
    lastTested: null,
    createdAt: "2026-05-18",
  },
];

// ── Billing ───────────────────────────────────────────────────────────────────

export const BILLING_PLAN: BillingPlan = {
  name: "enterprise",
  monthlyBase: 999,
  minutesIncluded: 20000,
  pricePerMinute: 0.06,
  maxAgents: 20,
};

export const USAGE_RECORDS: UsageRecord[] = (() => {
  const records: UsageRecord[] = [];
  const base = new Date("2026-04-22");
  const pattern = [320,410,380,440,290,80,60,510,490,470,530,410,100,90,560,540,580,610,490,110,100,620,590,640,680,520,120,110,700,640];
  pattern.forEach((mins, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    records.push({
      date: d.toISOString().slice(0, 10),
      minutesUsed: mins,
      callCount: Math.round(mins / 2.4),
      costUSD: +(mins * 0.06).toFixed(2),
    });
  });
  return records;
})();

export const INVOICES: Invoice[] = [
  { id: "inv-003", period: "May 2026", minutesUsed: 12847, amount: 999.00, status: "pending", issuedAt: "2026-05-01" },
  { id: "inv-002", period: "April 2026", minutesUsed: 22140, amount: 1127.40, status: "paid", issuedAt: "2026-04-01" },
  { id: "inv-001", period: "March 2026", minutesUsed: 18820, amount: 999.00, status: "paid", issuedAt: "2026-03-01" },
];

// ── Relationship Pulse (Dashboard) ────────────────────────────────────────────

export const RELATIONSHIP_PULSE = [
  { userId: "usr-mesh-001", name: "Rajesh Iyer", before: "Distressed", after: "Comforted", callId: "SR-2841", empathy: 96, debtDelta: +12 },
  { userId: "usr-mesh-002", name: "Priya Venkataraman", before: "Anxious", after: "Reassured", callId: "SR-2839", empathy: 94, debtDelta: +10 },
  { userId: "usr-mesh-003", name: "Amit Bose", before: "Neutral", after: "Satisfied", callId: "SR-2836", empathy: 97, debtDelta: +18 },
  { userId: "usr-mesh-004", name: "Sunita Rawat", before: "Impatient", after: "Happy", callId: "SR-2837", empathy: 91, debtDelta: +10 },
];

export const SYSTEM_COMPONENTS: SystemComponent[] = [
  { name: "WebSocket Mesh", pillar: "CORE", status: "healthy", latencyMs: 18, callsProcessed: 12847, lastHealthCheck: "30s ago", version: "ws-mesh 3.4.1" },
  { name: "PEEK Engine", pillar: "PEEK", status: "healthy", latencyMs: 23, callsProcessed: 12847, lastHealthCheck: "30s ago", version: "peek 1.9.2" },
  { name: "MESH Database", pillar: "MESH", status: "healthy", latencyMs: 34, callsProcessed: 12847, lastHealthCheck: "30s ago", version: "mesh-db 4.2.0" },
  { name: "SILK Synthesizer", pillar: "SILK", status: "degraded", latencyMs: 148, callsProcessed: 12604, lastHealthCheck: "30s ago", version: "silk-synth 2.8.1" },
  { name: "Action Executor", pillar: "ACTION", status: "healthy", latencyMs: 41, callsProcessed: 8921, lastHealthCheck: "30s ago", version: "exec 1.4.7" },
  { name: "LLM Distillation Layer", pillar: "CORE", status: "healthy", latencyMs: 312, callsProcessed: 12847, lastHealthCheck: "2m ago", version: "distil-3b v0.9" },
];
