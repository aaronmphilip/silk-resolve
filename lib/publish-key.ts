import { createHash, randomBytes } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const PREFIX_LIVE = "sr_live_";
const PREFIX_TEST = "sr_test_";

export type PublishKeyKind = "live" | "test";

export function publishKeyPrefix(kind: PublishKeyKind): string {
  return kind === "test" ? PREFIX_TEST : PREFIX_LIVE;
}

export function generatePublishKey(kind: PublishKeyKind = "live"): {
  fullKey: string;
  prefix: string;
  hash: string;
} {
  const body = randomBytes(24).toString("base64url");
  const fullKey = `${publishKeyPrefix(kind)}${body}`;
  const prefix = fullKey.slice(0, 16);
  const hash = hashPublishKey(fullKey);
  return { fullKey, prefix, hash };
}

export function hashPublishKey(fullKey: string): string {
  return createHash("sha256").update(fullKey.trim()).digest("hex");
}

export function isPublishKeyFormat(value: string): boolean {
  const v = value.trim();
  return v.startsWith(PREFIX_LIVE) || v.startsWith(PREFIX_TEST);
}

export interface ResolvedPublishKey {
  agentId: string;
  tenantId: string;
  kind: PublishKeyKind;
  keyId: string;
}

export async function resolvePublishKey(fullKey: string): Promise<ResolvedPublishKey | null> {
  const trimmed = fullKey.trim();
  if (!isPublishKeyFormat(trimmed)) return null;

  const hash = hashPublishKey(trimmed);
  const svc = createServiceClient();
  const { data } = await svc
    .from("agent_publish_keys")
    .select("id, agent_id, tenant_id, kind, status")
    .eq("key_hash", hash)
    .eq("status", "active")
    .maybeSingle();

  if (!data?.agent_id || !data.tenant_id) return null;

  void svc
    .from("agent_publish_keys")
    .update({ last_used: new Date().toISOString() })
    .eq("id", data.id);

  return {
    agentId: data.agent_id,
    tenantId: data.tenant_id,
    kind: data.kind as PublishKeyKind,
    keyId: data.id,
  };
}

/** Test keys work on draft/paused agents; live keys require published (live) status. */
export function publishKeyAllowsAgentStatus(
  kind: PublishKeyKind,
  agentStatus: string
): boolean {
  if (kind === "test") return agentStatus !== "error";
  return agentStatus === "live";
}

export async function resolveAgentForRuntime(args: {
  agentId?: string | null;
  publishKey?: string | null;
}): Promise<{ agentId: string; tenantId?: string; via: "id" | "key"; kind?: PublishKeyKind } | null> {
  if (args.publishKey) {
    const resolved = await resolvePublishKey(args.publishKey);
    if (!resolved) return null;
    return {
      agentId: resolved.agentId,
      tenantId: resolved.tenantId,
      via: "key",
      kind: resolved.kind,
    };
  }

  const id = args.agentId?.trim();
  if (!id) return null;
  return { agentId: id, via: "id" };
}