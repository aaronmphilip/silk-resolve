/**
 * POST /api/voice/vapi-incoming
 *
 * Vapi calls this when a call arrives (assistant-request).
 * Works for both phone calls (lookup by phone number) and
 * web/browser calls (lookup by agentId passed in call metadata).
 *
 * Returns a full dynamic assistant config to Vapi.
 * Response must arrive within 7.5s.
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getPlatformVoiceConfig } from "@/lib/platform";
import { withSilkTone } from "@/lib/voice-emotion";

export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function buildMeshContext(profile: Record<string, unknown> | null): string {
  if (!profile) return "";
  const identity = (profile.identity_profile as Record<string, unknown>) ?? {};
  const anchors = (profile.contextual_anchors as Array<{ text: string; active: boolean }>) ?? [];
  const active = anchors.filter((a) => a.active).map((a) => `- ${a.text}`);
  return [
    `Caller: ${profile.name ?? "Unknown"} | Emotional debt: ${profile.emotional_debt_level ?? "neutral"} (score: ${profile.emotional_debt_score ?? 0})`,
    `Preferred address: ${identity.preferred_address ?? identity.preferredAddress ?? "Sir/Ma'am"} | Vibe: ${identity.companion_vibe ?? "professional"}`,
    `Last resolution: ${profile.last_resolution ?? "no prior calls"}`,
    active.length ? `Context:\n${active.join("\n")}` : "",
  ].filter(Boolean).join("\n");
}

function buildSystemPrompt(agent: Record<string, unknown>, meshContext: string): string {
  const base = (agent.system_prompt as string) || "You are a helpful customer support agent. Resolve issues with warmth and efficiency.";
  const rules = (agent.escalation_rules as Array<{ condition: string; action: string }>) ?? [];
  const noGo  = (agent.no_go_topics as string[]) ?? [];
  const addr  = (agent.preferred_address as string) || "Sir/Ma'am";

  return [
    base,
    "",
    agent.linguistic_notes ? `LINGUISTIC RULES:\n${agent.linguistic_notes}` : "",
    meshContext ? `CUSTOMER MEMORY (MESH):\n${meshContext}` : "",
    "",
    rules.length ? "ESCALATION RULES:\n" + rules.map(r => `- If ${r.condition} → ${r.action}`).join("\n") : "",
    noGo.length  ? `NO-GO TOPICS: ${noGo.join(", ")}` : "",
    "",
    "LIVE DEMO REFUND FLOW:",
    "- If the customer mentions a refund, return, charge, damaged item, wrong item, or cancellation, ask for the order ID or registered phone last four digits.",
    "- Demo lookup records include SR-1001 / phone ending 4321 for an eligible refund, SR-1002 / 7788 for senior review, and SR-1003 / 9090 for an already-refunded order.",
    "- Verify the item, purchase date, delivered date, amount, and payment method before initiating a refund.",
    "- Ask the reason for refund, then confirm the refund reference and expected 3 to 5 business day timeline.",
    "",
    "VOICE EMOTION VARIABLES:",
    "- Every response is scored with tensionLevel, emotion, silkTone, arousal, valence, and voiceScore.",
    "- Start with a happy tone. Use neutral for lookup, sad or whisper for frustration, and excited when the issue is solved.",
    "- SILK muga tones are emitted as [happy], [neutral], [sad], [whisper], or [excited] before spoken text.",
    "",
    "RESPONSE FORMAT:",
    "- Keep responses to 1–3 SHORT sentences (spoken aloud over phone/browser)",
    "- Never use bullet points, markdown, or special characters",
    "- Respond in the same language the customer uses",
    "- Sound warm and human, never robotic",
    "- If the caller asks outside the company/support script, say you don't have that information and redirect to what you can help with",
    `- Preferred address for this caller: ${addr}`,
  ].filter(Boolean).join("\n");
}

export async function POST(req: NextRequest) {
  const db = svc();

  const body = await req.json() as {
    message: {
      type: string;
      call?: {
        id: string;
        type?: string;                          // "webCall" | "inboundPhoneCall"
        metadata?: Record<string, string>;      // agentId passed from our web client
        phoneNumber?: { number: string };
        customer?: { number: string };
      };
    };
  };

  const { message } = body;
  if (message.type !== "assistant-request") {
    return NextResponse.json({}, { status: 200 });
  }

  const callId         = message.call?.id ?? "";
  const toPhone        = message.call?.phoneNumber?.number ?? "";
  const fromPhone      = message.call?.customer?.number ?? "";
  const agentIdMeta    = message.call?.metadata?.agentId ?? "";   // web calls pass this
  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;

  try {
    // ── 1. Find agent ─────────────────────────────────────────────────────────
    let agentRow: Record<string, unknown> | null = null;

    if (agentIdMeta) {
      const { data } = await db.from("agents").select("*").eq("id", agentIdMeta).single();
      agentRow = data as Record<string, unknown> | null;
    } else if (toPhone) {
      const { data } = await db.from("agents").select("*").eq("twilio_phone", toPhone).eq("status", "live").single();
      agentRow = data as Record<string, unknown> | null;
    }

    if (!agentRow) {
      const { data } = await db.from("agents").select("*").eq("status", "live").limit(1).single();
      agentRow = data as Record<string, unknown> | null;
    }

    if (!agentRow) {
      return NextResponse.json({ assistant: {
        firstMessage: "Hello! No agents are currently configured. Please set up an agent in the dashboard.",
        model: { provider: "openai", model: "gpt-4o-mini", messages: [{ role: "system", content: "You are a helpful assistant." }] },
        voice: { provider: "vapi", voiceId: "Neha" },
      }});
    }

    // ── 2. MESH + voice config — parallel fetch ───────────────────────────────
    const meshPromise: Promise<Record<string, unknown> | null> = fromPhone
      ? (async () => {
          try {
            const { data } = await db.from("mesh_profiles")
              .select("*")
              .eq("phone", fromPhone)
              .eq("tenant_id", agentRow.tenant_id)
              .single();
            return data as Record<string, unknown> | null;
          } catch { return null; }
        })()
      : Promise.resolve(null);

    const [meshRow] = await Promise.all([meshPromise]);

    const meshContext = buildMeshContext(meshRow);

    // ── 3. Build first message ────────────────────────────────────────────────
    const storedFirstMsg = (agentRow.first_message as string) || "";
    const callerName = (meshRow?.name as string) ?? "";

    let firstMessage = storedFirstMsg;
    if (!firstMessage) {
      // Auto-generate based on MESH context
      const addr = (meshRow?.identity_profile as Record<string, unknown>)?.preferred_address
        ?? (agentRow.preferred_address as string)
        ?? "there";
      firstMessage = callerName
        ? `Hello ${addr}, welcome back. How can I help you today?`
        : `Hello ${addr}! How can I help you today?`;
    }
    // Replace {{variables}} in first message
    firstMessage = firstMessage
      .replace(/\{\{preferred_address\}\}/g, callerName ? String((meshRow?.identity_profile as Record<string, unknown>)?.preferred_address ?? agentRow.preferred_address ?? "there") : String(agentRow.preferred_address ?? "there"))
      .replace(/\{\{caller_name\}\}/g, callerName)
      .replace(/\{\{company_name\}\}/g, String(agentRow.client ?? "us"));

    // ── 4. Create voice session ───────────────────────────────────────────────
    await db.from("voice_sessions").upsert({
      call_sid:        callId,
      tenant_id:       agentRow.tenant_id,
      agent_id:        agentRow.id,
      caller_phone:    fromPhone || "web-call",
      platform_phone:  toPhone || "web",
      mesh_profile_id: meshRow?.id ?? null,
      messages:        [{
        role: "agent",
        content: firstMessage,
        ts: new Date().toISOString(),
        meta: { silkTone: "happy", emotion: "welcoming", voiceScore: 90 },
      }],
      tension_level:   0,
      turn_count:      0,
      status:          "active",
    }, { onConflict: "call_sid", ignoreDuplicates: true });

    // ── 5. Voice config ───────────────────────────────────────────────────────
    const { silk } = await getPlatformVoiceConfig();
    const useSilkVoice = Boolean(silk.apiKey && silk.vapiEnabled);
    const spokenFirstMessage = useSilkVoice ? withSilkTone("happy", firstMessage) : firstMessage;

    const vapiAssistant: Record<string, unknown> = {
      firstMessage: spokenFirstMessage,
      model: {
        provider:    "custom-llm",
        url:         `${appUrl}/api/voice/vapi-llm?voice=silk`,
        model:       process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite",
        messages:    [{ role: "system", content: buildSystemPrompt(agentRow, meshContext) }],
        temperature: 0.7,
        maxTokens:   120,
        // Pass agent context so vapi-llm can look up session
        metadata: { agentId: String(agentRow.id), callId },
      },
      serverUrl:              `${appUrl}/api/voice/vapi-events`,
      endCallMessage:         "Thank you for calling. Have a great day!",
      endCallPhrases:         ["goodbye", "bye", "thank you bye", "ok bye", "alvida", "shukriya"],
      silenceTimeoutSeconds:  20,
      maxDurationSeconds:     1800,
      backgroundSound:        "off",
      backchannelingEnabled:  false,
      // Match the website's fast turn-taking on phone calls too: Deepgram nova-2
      // with tight endpointing + a short pre-reply wait (Vapi default is 0.4s).
      // NOTE: pins phone STT to English — adjust `language` if you take non-EN calls.
      transcriber: {
        provider:    "deepgram",
        model:       "flux-general-en",
        language:    "en",
        smartFormat: false,
        numerals:    true,
        eotThreshold: 0.55,
        eotTimeoutMs: 1200,
      },
      startSpeakingPlan: {
        waitSeconds: 0,
        transcriptionEndpointingPlan: {
          onPunctuationSeconds: 0.05,
          onNoPunctuationSeconds: 0.3,
          onNumberSeconds: 0.2,
        },
      },
      stopSpeakingPlan: {
        numWords: 0,
        voiceSeconds: 0.15,
        backoffSeconds: 0.4,
      },
      analysisPlan: {
        summaryPrompt:            "Summarise this call in 2 sentences: issue raised, outcome, and customer sentiment.",
        successEvaluationPrompt:  "Did the agent resolve the customer's issue? yes/no with brief reason.",
        successEvaluationRubric:  "NumericScale",
        structuredDataSchema: {
          type: "object",
          properties: {
            outcome:      { type: "string", enum: ["resolved", "escalated", "abandoned"] },
            tensionPeak:  { type: "number" },
            sentiment:    { type: "string", enum: ["positive", "neutral", "negative"] },
          },
        },
      },
    };

    // Voice priority: SILK (Rumik) → Vapi built-in PlayHT
    if (useSilkVoice) {
      vapiAssistant.voice = {
        provider: "custom-voice",
        server:   { url: `${appUrl}/api/voice/silk-tts?transport=ws`, timeoutSeconds: 45 },
      };
    } else {
      vapiAssistant.voice = { provider: "vapi", voiceId: "Neha" };
    }

    return NextResponse.json({ assistant: vapiAssistant });

  } catch (err) {
    console.error("[vapi-incoming]", err);
    return NextResponse.json({ assistant: {
      firstMessage: "We're experiencing a technical issue. Please try again shortly.",
      model: { provider: "openai", model: "gpt-4o-mini", messages: [{ role: "system", content: "You are a helpful assistant." }] },
      voice: { provider: "vapi", voiceId: "Neha" },
    }});
  }
}
