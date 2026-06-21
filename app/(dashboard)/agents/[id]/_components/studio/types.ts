import type { Call } from "@/lib/types";
import type { PromptVariable } from "../PromptEditor";

export interface AgentStudioRow {
  id: string;
  name: string;
  status: "live" | "paused" | "draft" | "error";
  description: string;
  system_prompt: string;
  first_message: string;
  language: string;
  hinglish_mode: boolean;
  llm_provider: string;
  llm_model: string;
  companion_vibe: "casual" | "professional" | "protective";
  preferred_address: string;
  linguistic_notes: string;
  peek_threshold: number;
  mesh_depth_days: number;
  silk_voice_id: string;
  voice_mode: "silk" | "silk-stream" | "silk-mulberry" | "vapi";
  knowledge_enabled: boolean;
  agent_variables: PromptVariable[];
  tools: AgentTool[];
  escalation_rules: EscalationRule[];
  no_go_topics: string[];
  total_calls: number;
  calls_today: number;
  empathy_score: number;
  resolved_rate: number;
  avg_handle_time: string;
  call_direction: "inbound" | "outbound" | "both";
  vapi_phone_number: string;
  outbound_caller_id: string;
  outbound_list_url: string;
}

export interface AgentTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  params: string[];
}

export interface EscalationRule {
  id: string;
  trigger: string;
  condition: string;
  action: "transfer_human" | "offer_callback" | "send_email";
}

export interface PublishKeyRow {
  id: string;
  name: string;
  prefix: string;
  kind: "live" | "test";
  status: string;
  last_used: string | null;
  created_at: string;
}

export interface KnowledgeDocRow {
  id: string;
  title: string;
  source_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export type StudioSection =
  | "agent"
  | "voice"
  | "knowledge"
  | "tools"
  | "widget"
  | "guardrails"
  | "settings"
  | "calls"
  | "tests";

export interface AgentStudioProps {
  initial: AgentStudioRow;
  calls: Call[];
  silkConfigured: boolean;
}