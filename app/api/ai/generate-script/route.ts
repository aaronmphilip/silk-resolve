import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callAI, extractJSON, type AIProvider } from "@/lib/ai";

const SYSTEM = `You are an expert AI voice agent configurator for Silk Resolve, an enterprise voice AI platform.
Silk agents use three pillars — PEEK (intent/emotion detection), MESH (memory/emotional-debt), SILK (prosody-tagged voice).
Return ONLY valid JSON, no markdown, no explanation.`;

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Get tenant AI config
  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  let provider: AIProvider = "anthropic";
  let apiKey = process.env.ANTHROPIC_API_KEY ?? "";

  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("ai_provider, ai_api_key")
      .eq("id", profile.tenant_id)
      .single();

    if (tenant?.ai_provider) provider = tenant.ai_provider as AIProvider;
    if (tenant?.ai_api_key) apiKey = tenant.ai_api_key;
    else if (provider !== "anthropic") {
      // Non-Anthropic provider requires tenant key — no env fallback
      return NextResponse.json({ error: `No API key configured for ${provider}. Add it in Settings → AI Provider.` }, { status: 503 });
    }
  }

  if (!apiKey) {
    return NextResponse.json({ error: "No AI API key configured. Add ANTHROPIC_API_KEY to your environment or set a key in Settings → AI Provider." }, { status: 503 });
  }

  const { company, industry, useCase, agentName, vibe, language, existingScript, refineMode } = await req.json();

  const userPrompt = refineMode && existingScript
    ? `Refine this agent script for ${industry} customer support at ${company || "this company"}.
Improve systemPrompt, linguisticNotes, escalationRules, noGoTopics. Keep same JSON structure.
Current script: ${JSON.stringify(existingScript, null, 2)}`
    : `Generate a complete agent script for:
Company: ${company}
Industry: ${industry}
Use case: ${useCase}
Agent name: ${agentName}
Vibe: ${vibe} (protective=warm/empathetic, professional=formal/precise, casual=friendly/light)
Language: ${language}

Return JSON:
{
  "systemPrompt": "400-600 word system prompt. Include role, company context, top 5 ${industry} issues, emotional intelligence, PEEK (tension_level/arousal vars), MESH (emotional_debt/interaction_history), SILK prosody tags. Use {{preferred_address}} {{customer_name}} {{tension_level}} {{emotional_debt}} variables.",
  "companionVibe": "${vibe}",
  "language": "${language}",
  "preferredAddress": "appropriate honorific",
  "linguisticNotes": "3-5 specific tonal/code-switching rules",
  "tools": [
    {"id":"bt-001","name":"escalate_to_human","description":"Transfer to human with full context","source":"builtin","enabled":true,"params":["reason","priority"]},
    {"id":"bt-002","name":"send_confirmation","description":"Send SMS + email confirmation","source":"builtin","enabled":true,"params":["customer_id","message"]},
    {"id":"bt-003","name":"schedule_callback","description":"Book callback at preferred time","source":"builtin","enabled":false,"params":["customer_id","preferred_time"]},
    {"id":"bt-004","name":"log_complaint","description":"Log formal complaint with tracking number","source":"builtin","enabled":true,"params":["customer_id","description","category"]}
  ],
  "escalationRules": [
    {"id":"er-001","trigger":"sentiment_drop","condition":"tension_level >= 8 for 2+ consecutive turns","action":"escalate_human"},
    {"id":"er-002","trigger":"legal_threat","condition":"customer mentions legal action or regulatory authority","action":"escalate_human"},
    {"id":"er-003","trigger":"no_resolution","condition":"same issue raised 3+ times without resolution","action":"schedule_callback"},
    {"id":"er-004","trigger":"high_debt","condition":"emotional_debt < -60 and new unresolved complaint","action":"escalate_human"}
  ],
  "noGoTopics": ["competitor pricing","internal escalation procedures","unreleased features","staff personal details"]
}`;

  try {
    const raw = await callAI({ provider, apiKey, system: SYSTEM, user: userPrompt });
    const parsed = JSON.parse(extractJSON(raw));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI generation failed" }, { status: 500 });
  }
}
