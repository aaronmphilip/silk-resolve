/**
 * POST /api/voice/incoming
 * Twilio calls this when a new inbound call arrives.
 * Looks up the agent by phone number, generates greeting, creates voice session.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { generateGreeting } from "@/lib/voice-ai";
import { conversationTurn, twiml, say, gather, hangup } from "@/lib/twiml";
import type { AgentScript } from "@/lib/types";

export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Build a compact MESH context string for the AI prompt */
function buildMeshContext(profile: Record<string, unknown> | null): string {
  if (!profile) return "";
  const identity = (profile.identity_profile as Record<string, unknown>) ?? {};
  const anchors = (profile.contextual_anchors as Array<{ text: string; active: boolean }>) ?? [];
  const activeAnchors = anchors.filter((a) => a.active).map((a) => a.text);

  return [
    `Caller: ${profile.name ?? "Unknown"} | Phone: ${profile.phone}`,
    `Interactions: ${profile.total_interactions ?? 0} | Emotional debt: ${profile.emotional_debt_level ?? "neutral"} (${profile.emotional_debt_score ?? 0})`,
    `Vibe: ${identity.companion_vibe ?? identity.companionVibe ?? "professional"} | Address: ${identity.preferred_address ?? identity.preferredAddress ?? ""}`,
    `Last resolution: ${profile.last_resolution ?? "unknown"}`,
    activeAnchors.length ? `Context anchors: ${activeAnchors.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Map DB script row → AgentScript */
function mapScript(r: Record<string, unknown>): AgentScript {
  return {
    id: r.id as string,
    agentId: r.agent_id as string,
    agentName: r.agent_name as string,
    name: r.name as string,
    version: r.version as number ?? 1,
    status: r.status as AgentScript["status"],
    systemPrompt: r.system_prompt as string,
    companionVibe: r.companion_vibe as AgentScript["companionVibe"],
    language: r.language as string ?? "en-IN",
    preferredAddress: r.preferred_address as string ?? "ji",
    linguisticNotes: r.linguistic_notes as string ?? "",
    tools: (r.tools as AgentScript["tools"]) ?? [],
    escalationRules: (r.escalation_rules as AgentScript["escalationRules"]) ?? [],
    noGoTopics: (r.no_go_topics as string[]) ?? [],
    createdAt: (r.created_at as string)?.slice(0, 10) ?? "",
    updatedAt: (r.updated_at as string)?.slice(0, 10) ?? "",
  };
}

export async function POST(req: NextRequest) {
  const db = svc();

  // Twilio sends form-encoded body
  const form = await req.formData();
  const callSid   = form.get("CallSid")   as string;
  const fromPhone = form.get("From")      as string; // caller
  const toPhone   = form.get("To")        as string; // our Twilio number

  if (!callSid || !fromPhone || !toPhone) {
    return twiml(say("Sorry, there was a technical issue. Please try again.") + hangup);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  try {
    // 1. Find agent by twilio_phone number
    const { data: agentRow } = await db
      .from("agents")
      .select("id, name, tenant_id, status")
      .eq("twilio_phone", toPhone)
      .eq("status", "live")
      .single();

    if (!agentRow) {
      return twiml(
        say("This service is currently unavailable. Please try again later.") + hangup
      );
    }

    // 2. Get active script for this agent
    const { data: scriptRow } = await db
      .from("scripts")
      .select("*")
      .eq("agent_id", agentRow.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!scriptRow) {
      return twiml(
        say("Hello! I'm having trouble loading my configuration. Please call back shortly.") + hangup
      );
    }

    const script = mapScript(scriptRow as Record<string, unknown>);

    // 3. MESH lookup by caller phone
    const { data: meshRow } = await db
      .from("mesh_profiles")
      .select("*")
      .eq("phone", fromPhone)
      .eq("tenant_id", agentRow.tenant_id)
      .single();

    const meshContext = buildMeshContext(meshRow as Record<string, unknown> | null);

    // 4. Get last call outcome for personalised greeting
    const { data: lastSession } = await db
      .from("voice_sessions")
      .select("resolution")
      .eq("caller_phone", fromPhone)
      .eq("tenant_id", agentRow.tenant_id)
      .order("ended_at", { ascending: false })
      .limit(1)
      .single();

    // 5. Generate AI greeting
    const greeting = await generateGreeting({
      script,
      callerName: (meshRow as Record<string, unknown> | null)?.name as string | undefined,
      meshContext: meshContext || undefined,
      previousOutcome: lastSession?.resolution ?? undefined,
    });

    // 6. Create voice session
    await db.from("voice_sessions").insert({
      call_sid: callSid,
      tenant_id: agentRow.tenant_id,
      agent_id: agentRow.id,
      script_id: script.id,
      caller_phone: fromPhone,
      platform_phone: toPhone,
      mesh_profile_id: (meshRow as Record<string, unknown> | null)?.id ?? null,
      messages: [
        { role: "agent", content: greeting, timestamp: new Date().toISOString() },
      ],
      tension_level: 0,
      turn_count: 0,
      status: "active",
    });

    // 7. Return TwiML: say greeting then gather speech
    const respondUrl = `${baseUrl}/api/voice/respond`;
    return twiml(
      gather({
        action: respondUrl,
        prompt: greeting,
        timeout: 10,
        speechTimeout: "auto",
      })
    );
  } catch (err) {
    console.error("[voice/incoming] error:", err);
    return twiml(
      say("I'm sorry, we're experiencing technical difficulties. Please try again shortly.") +
        hangup
    );
  }
}
