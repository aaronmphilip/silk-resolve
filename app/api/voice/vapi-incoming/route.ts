/**
 * POST /api/voice/vapi-incoming
 *
 * Vapi calls this when an inbound call arrives (assistant-request event).
 * We return a full dynamic assistant config — system prompt injected with
 * MESH context, ElevenLabs voice, and a pointer to our custom LLM endpoint.
 *
 * Response must arrive within 7.5 seconds.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { generateGreeting } from "@/lib/voice-ai";
import { stripTags } from "@/lib/twiml";
import { getPlatformVoiceConfig } from "@/lib/platform";
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
    id:               r.id as string,
    agentId:          r.agent_id as string,
    agentName:        r.agent_name as string,
    name:             r.name as string,
    version:          (r.version as number) ?? 1,
    status:           r.status as AgentScript["status"],
    systemPrompt:     r.system_prompt as string,
    companionVibe:    r.companion_vibe as AgentScript["companionVibe"],
    language:         (r.language as string) ?? "en-IN",
    preferredAddress: (r.preferred_address as string) ?? "ji",
    linguisticNotes:  (r.linguistic_notes as string) ?? "",
    tools:            (r.tools as AgentScript["tools"]) ?? [],
    escalationRules:  (r.escalation_rules as AgentScript["escalationRules"]) ?? [],
    noGoTopics:       (r.no_go_topics as string[]) ?? [],
    createdAt:        ((r.created_at as string) ?? "").slice(0, 10),
    updatedAt:        ((r.updated_at as string) ?? "").slice(0, 10),
  };
}

function buildMeshContext(profile: Record<string, unknown> | null): string {
  if (!profile) return "";
  const identity = (profile.identity_profile as Record<string, unknown>) ?? {};
  const anchors = (profile.contextual_anchors as Array<{ text: string; active: boolean }>) ?? [];
  const active = anchors.filter((a) => a.active).map((a) => a.text);
  return [
    `Caller: ${profile.name ?? "Unknown"} | Emotional debt: ${profile.emotional_debt_level ?? "neutral"} (score: ${profile.emotional_debt_score ?? 0})`,
    `Preferred address: ${identity.preferred_address ?? identity.preferredAddress ?? "ji"} | Vibe: ${identity.companion_vibe ?? "professional"}`,
    `Last resolution: ${profile.last_resolution ?? "no prior calls"}`,
    active.length ? `Context anchors:\n${active.map((a) => `- ${a}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

function buildSystemPrompt(script: AgentScript, meshContext: string): string {
  return [
    script.systemPrompt,
    "",
    script.linguisticNotes ? `LINGUISTIC RULES:\n${script.linguisticNotes}` : "",
    meshContext ? `CUSTOMER MEMORY (MESH):\n${meshContext}` : "",
    "",
    "ESCALATION RULES:",
    ...script.escalationRules.map((r) => `- If ${r.condition} → ${r.action}`),
    "",
    `NO-GO TOPICS (redirect if raised): ${script.noGoTopics.join(", ") || "none"}`,
    "",
    "RESPONSE FORMAT:",
    "- Keep responses to 1-3 SHORT sentences (this is spoken aloud over phone)",
    "- Never use bullet points, markdown, or formatting",
    "- Respond in the same language the customer uses",
    "- Sound warm and human, not robotic",
    `- Preferred address for this caller: ${script.preferredAddress}`,
  ].filter(Boolean).join("\n");
}

export async function POST(req: NextRequest) {
  const db = svc();
  const body = await req.json() as {
    message: {
      type: string;
      call?: {
        id: string;
        phoneNumber?: { number: string };
        customer?: { number: string };
      };
    };
  };

  const { message } = body;

  // Only handle assistant-request
  if (message.type !== "assistant-request") {
    return NextResponse.json({}, { status: 200 });
  }

  const callId      = message.call?.id ?? "";
  const toPhone     = message.call?.phoneNumber?.number ?? "";   // our Vapi number
  const fromPhone   = message.call?.customer?.number ?? "";      // caller

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  try {
    // 1. Find agent by vapi_phone (same column, repurposed)
    const { data: agentRow } = await db
      .from("agents")
      .select("id, name, tenant_id, status")
      .eq("twilio_phone", toPhone)   // column is reused for Vapi number
      .eq("status", "live")
      .single();

    if (!agentRow) {
      return NextResponse.json({
        error: "No active agent found for this number. Please try again later.",
      });
    }

    // 2. Get active script
    const { data: scriptRow } = await db
      .from("scripts")
      .select("*")
      .eq("agent_id", agentRow.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (!scriptRow) {
      return NextResponse.json({ error: "Agent configuration not ready. Please try again." });
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

    // 4. Previous call outcome (for personalised greeting)
    const { data: lastSession } = await db
      .from("voice_sessions")
      .select("resolution")
      .eq("caller_phone", fromPhone)
      .eq("tenant_id", agentRow.tenant_id)
      .order("ended_at", { ascending: false })
      .limit(1)
      .single();

    // 5. Generate first message (greeting)
    const greeting = await generateGreeting({
      script,
      callerName: (meshRow as Record<string, unknown> | null)?.name as string | undefined,
      meshContext: meshContext || undefined,
      previousOutcome: lastSession?.resolution ?? undefined,
    });

    // 6. Create voice session
    await db.from("voice_sessions").insert({
      call_sid:        callId,          // Vapi call ID stored here
      tenant_id:       agentRow.tenant_id,
      agent_id:        agentRow.id,
      script_id:       script.id,
      caller_phone:    fromPhone,
      platform_phone:  toPhone,
      mesh_profile_id: (meshRow as Record<string, unknown> | null)?.id ?? null,
      messages:        [{ role: "agent", content: greeting, timestamp: new Date().toISOString() }],
      tension_level:   0,
      turn_count:      0,
      status:          "active",
    });

    // 7. Get voice config — SILK → ElevenLabs → built-in fallback
    const { elevenlabs, silk } = await getPlatformVoiceConfig();

    // 8. Build and return Vapi assistant config
    const vapiAssistant: Record<string, unknown> = {
      firstMessage: stripTags(greeting),  // strip SILK tags — ElevenLabs handles prosody naturally
      model: {
        provider: "custom-llm",
        url: `${appUrl}/api/voice/vapi-llm`,
        model: "silk-resolve-v1",
        messages: [
          { role: "system", content: buildSystemPrompt(script, meshContext) },
        ],
        temperature: 0.7,
        maxTokens: 200,
      },
      serverUrl: `${appUrl}/api/voice/vapi-events`,
      endCallMessage: "Thank you for calling. Have a great day!",
      endCallPhrases: ["goodbye", "bye", "thank you bye", "ok bye", "alvida"],
      silenceTimeoutSeconds: 20,
      maxDurationSeconds: 1800,      // 30 min max call
      backgroundSound: "off",
      backchannelingEnabled: false,  // no "uh-huh" filler
      analysisPlan: {
        summaryPrompt: "Summarise this customer service call in 2-3 sentences. State the issue, outcome, and customer sentiment.",
        structuredDataPrompt: JSON.stringify({
          intent: "main customer intent",
          outcome: "resolved | escalated | abandoned",
          tensionLevel: "0-10",
          sentiment: "positive | neutral | negative",
        }),
        successEvaluationPrompt: "Did the agent resolve the customer's issue? Answer yes/no with a brief reason.",
        successEvaluationRubric: "NumericScale",
      },
    };

    // ── Voice priority: SILK → ElevenLabs → Vapi built-in ──────────────────
    if (silk.apiKey) {
      // Rumik SILK — custom voice via our TTS proxy endpoint
      // Vapi calls our /api/voice/silk-tts which proxies to Rumik's API
      vapiAssistant.voice = {
        provider: "custom-voice",
        server: {
          url: `${appUrl}/api/voice/silk-tts`,
          timeoutSeconds: 10,
          headers: { "x-silk-key": silk.apiKey },
        },
      };
    } else if (elevenlabs.apiKey && elevenlabs.voiceId) {
      // ElevenLabs — testing/production until SILK is ready
      vapiAssistant.voice = {
        provider: "elevenlabs",
        voiceId: elevenlabs.voiceId,
        model: "eleven_turbo_v2",   // lowest latency model
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
      };
    } else {
      // Free built-in Vapi voice — zero config needed
      vapiAssistant.voice = {
        provider: "playht",
        voiceId: "jennifer",
      };
    }

    return NextResponse.json({ assistant: vapiAssistant });

  } catch (err) {
    console.error("[vapi-incoming] error:", err);
    return NextResponse.json({
      error: "Technical issue. Please try again shortly.",
    });
  }
}
