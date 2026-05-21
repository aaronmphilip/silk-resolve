/**
 * POST /api/voice/respond
 * Twilio posts here after each customer speech input.
 * Runs one AI turn, returns next TwiML action.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { runVoiceTurn, type Message } from "@/lib/voice-ai";
import { conversationTurn, twiml, say, gather, hangup, pause } from "@/lib/twiml";
import type { AgentScript } from "@/lib/types";

export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function mapScript(r: Record<string, unknown>): AgentScript {
  return {
    id: r.id as string,
    agentId: r.agent_id as string,
    agentName: r.agent_name as string,
    name: r.name as string,
    version: (r.version as number) ?? 1,
    status: r.status as AgentScript["status"],
    systemPrompt: r.system_prompt as string,
    companionVibe: r.companion_vibe as AgentScript["companionVibe"],
    language: (r.language as string) ?? "en-IN",
    preferredAddress: (r.preferred_address as string) ?? "ji",
    linguisticNotes: (r.linguistic_notes as string) ?? "",
    tools: (r.tools as AgentScript["tools"]) ?? [],
    escalationRules: (r.escalation_rules as AgentScript["escalationRules"]) ?? [],
    noGoTopics: (r.no_go_topics as string[]) ?? [],
    createdAt: ((r.created_at as string) ?? "").slice(0, 10),
    updatedAt: ((r.updated_at as string) ?? "").slice(0, 10),
  };
}

function buildMeshContext(profile: Record<string, unknown> | null): string {
  if (!profile) return "";
  const identity = (profile.identity_profile as Record<string, unknown>) ?? {};
  const anchors =
    (profile.contextual_anchors as Array<{ text: string; active: boolean }>) ?? [];
  const active = anchors.filter((a) => a.active).map((a) => a.text);
  return [
    `Caller: ${profile.name ?? "Unknown"} | Debt: ${profile.emotional_debt_level ?? "neutral"} (${profile.emotional_debt_score ?? 0})`,
    `Vibe: ${identity.companion_vibe ?? identity.companionVibe ?? "professional"} | Address: ${identity.preferred_address ?? identity.preferredAddress ?? ""}`,
    active.length ? `Anchors: ${active.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Build escalation TwiML: transfer to human agent via <Dial> or say + hangup */
function escalationTwiml(reason: string, escalationPhone?: string): string {
  const escMsg = `I completely understand your concern. Let me connect you with one of our senior team members right away who can help you better.`;
  if (escalationPhone) {
    // Transfer to human
    return (
      say(escMsg) +
      `<Dial timeout="30" callerId="${escalationPhone}"><Number>${escalationPhone}</Number></Dial>` +
      say("I'm sorry, no one is available right now. Please call back during business hours.") +
      hangup
    );
  }
  // No transfer number — apologise and hang up
  return (
    say(escMsg) +
    say(
      "Our team will call you back shortly. Thank you for your patience."
    ) +
    pause(1) +
    hangup
  );
}

export async function POST(req: NextRequest) {
  const db = svc();

  const form = await req.formData();
  const callSid      = form.get("CallSid")      as string;
  const speechResult = form.get("SpeechResult") as string | null;
  const confidence   = parseFloat((form.get("Confidence") as string) ?? "1");

  if (!callSid) {
    return twiml(say("Technical error. Goodbye.") + hangup);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const respondUrl = `${baseUrl}/api/voice/respond`;

  // Handle silence / no speech detected
  const customerSpeech = speechResult?.trim();
  if (!customerSpeech || confidence < 0.3) {
    return twiml(
      gather({
        action: respondUrl,
        prompt: "I didn't catch that. Could you please repeat?",
        timeout: 10,
        speechTimeout: "auto",
      })
    );
  }

  try {
    // 1. Load current session
    const { data: session, error: sessionErr } = await db
      .from("voice_sessions")
      .select("*")
      .eq("call_sid", callSid)
      .single();

    if (sessionErr || !session) {
      console.error("[voice/respond] session not found:", callSid, sessionErr);
      return twiml(
        say("I'm sorry, I've lost track of our conversation. Please call back.") + hangup
      );
    }

    // 2. Load the script
    const { data: scriptRow } = await db
      .from("scripts")
      .select("*")
      .eq("id", session.script_id)
      .single();

    if (!scriptRow) {
      return twiml(say("Configuration error. Please call back shortly.") + hangup);
    }

    const script = mapScript(scriptRow as Record<string, unknown>);

    // 3. MESH context
    let meshContext = "";
    if (session.mesh_profile_id) {
      const { data: meshRow } = await db
        .from("mesh_profiles")
        .select("*")
        .eq("id", session.mesh_profile_id)
        .single();
      meshContext = buildMeshContext(meshRow as Record<string, unknown> | null);
    }

    // 4. Build history from stored messages
    const storedMessages: Array<{ role: string; content: string }> =
      session.messages ?? [];
    const history: Message[] = storedMessages.map((m) => ({
      role: m.role === "agent" ? "agent" : "customer",
      content: m.content,
    }));

    // 5. Run AI turn
    const turn = await runVoiceTurn({
      script,
      history,
      customerSpeech,
      tensionLevel: session.tension_level ?? 0,
      meshContext: meshContext || undefined,
    });

    // 6. Append new messages
    const now = new Date().toISOString();
    const newMessages = [
      ...storedMessages,
      { role: "customer", content: customerSpeech, timestamp: now, confidence },
      { role: "agent",    content: turn.agentText,  timestamp: now,
        peek: turn.peek, toolCalls: turn.toolCalls },
    ];

    // 7. Persist updated session
    await db
      .from("voice_sessions")
      .update({
        messages:      newMessages,
        tension_level: turn.peek.tensionLevel,
        turn_count:    (session.turn_count ?? 0) + 1,
        status: turn.shouldEscalate ? "escalated" : turn.isFinal ? "ended" : "active",
        resolution: turn.isFinal ? "resolved" : turn.shouldEscalate ? "escalated" : null,
        ended_at: (turn.isFinal || turn.shouldEscalate) ? now : null,
        empathy_score: turn.isFinal
          ? Math.round(100 - turn.peek.tensionLevel * 10)
          : null,
      })
      .eq("call_sid", callSid);

    // 8. Update MESH profile emotional debt score + interaction count
    if (session.mesh_profile_id) {
      const debtDelta = turn.shouldEscalate ? -10 : turn.isFinal ? +5 : 0;
      if (debtDelta !== 0) {
        try {
          await db.rpc("increment_mesh_debt", {
            profile_id: session.mesh_profile_id,
            delta: debtDelta,
          });
        } catch {} // non-fatal
      }
    }

    // 9. Return TwiML
    if (turn.shouldEscalate) {
      // Get tenant escalation phone/email
      const { data: tenant } = await db
        .from("tenants")
        .select("escalation_email")
        .eq("id", session.tenant_id)
        .single();
      return twiml(escalationTwiml(turn.escalationReason ?? "", undefined));
    }

    return twiml(
      conversationTurn({
        agentText: turn.agentText,
        respondUrl,
        isFinal: turn.isFinal,
      })
    );
  } catch (err) {
    console.error("[voice/respond] error:", err);
    return twiml(
      gather({
        action: respondUrl,
        prompt: "I'm sorry, could you repeat that? I had a momentary issue.",
        timeout: 8,
      })
    );
  }
}
