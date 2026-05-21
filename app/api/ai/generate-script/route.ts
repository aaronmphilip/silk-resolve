import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const { company, industry, useCase, agentName, vibe, language, existingScript, refineMode } = await req.json();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemContext = `You are an expert AI voice agent configurator for Silk Resolve, an enterprise voice AI platform.
Silk Resolve agents handle inbound customer support calls. They use three pillars:
- PEEK: real-time intent and emotional arousal detection
- MESH: relationship memory and emotional debt tracking across past interactions
- SILK: prosody-tagged voice synthesis (<apologetic_whisper>, <warm>, <warm_closing> etc.)

Generate production-ready agent configurations. Return ONLY valid JSON, no markdown, no explanation.`;

  let userPrompt: string;

  if (refineMode && existingScript) {
    userPrompt = `Refine and improve this existing agent script for a ${industry} company.
Make the system prompt more precise, empathetic, and effective. Keep the same JSON structure.

Company: ${company || "not specified"}
Industry: ${industry}
Use case: ${useCase || "general customer support"}

Current script:
${JSON.stringify(existingScript, null, 2)}

Return the full updated JSON with improved systemPrompt, linguisticNotes, escalationRules, and noGoTopics.
Keep the same tools array unless improvements are obvious.`;
  } else {
    userPrompt = `Generate a complete agent script configuration for:

Company: ${company}
Industry: ${industry}
Use case: ${useCase}
Agent name: ${agentName}
Companion vibe: ${vibe} (protective=warm/empathetic, professional=formal/precise, casual=friendly/light)
Primary language: ${language}

Return JSON with exactly these fields:
{
  "systemPrompt": "Detailed 400-600 word system prompt. Include: agent role, company context, how to handle the top 5 most common issues for ${industry}, emotional intelligence guidelines (how to respond to frustration, escalation patterns), PEEK signal awareness (mention you receive real-time tension_level and arousal scores), MESH context awareness (you have access to customer's interaction history and emotional_debt), SILK prosody tags usage. Include variables: {{preferred_address}}, {{customer_name}}, {{tension_level}}, {{emotional_debt}}.",
  "companionVibe": "${vibe}",
  "language": "${language}",
  "preferredAddress": "appropriate honorific for this industry and vibe (Sir/Ma'am, Ji, etc.)",
  "linguisticNotes": "3-5 specific linguistic rules: when to code-switch between languages, when to inject empathy markers, tonal shifts based on tension level, humor guidelines",
  "tools": [
    {"id": "bt-001", "name": "escalate_to_human", "description": "Transfer call to human agent with full context package", "source": "builtin", "enabled": true, "params": ["reason", "priority"]},
    {"id": "bt-002", "name": "send_confirmation", "description": "Send SMS + email confirmation to customer", "source": "builtin", "enabled": true, "params": ["customer_id", "message"]},
    {"id": "bt-003", "name": "schedule_callback", "description": "Schedule callback at customer preferred time", "source": "builtin", "enabled": false, "params": ["customer_id", "preferred_time"]},
    {"id": "bt-004", "name": "log_complaint", "description": "Log formal complaint with tracking number", "source": "builtin", "enabled": true, "params": ["customer_id", "description", "category"]}
  ],
  "escalationRules": [
    {"id": "er-001", "trigger": "sentiment_drop", "condition": "tension_level >= 8 for 2+ consecutive turns", "action": "escalate_human"},
    {"id": "er-002", "trigger": "legal_threat", "condition": "customer mentions legal action, consumer court, or regulatory body", "action": "escalate_human"},
    {"id": "er-003", "trigger": "no_resolution", "condition": "same issue raised 3+ times without resolution path", "action": "schedule_callback"},
    {"id": "er-004", "trigger": "high_debt", "condition": "emotional_debt score below -60 and new complaint raised", "action": "escalate_human"}
  ],
  "noGoTopics": ["competitor pricing", "internal escalation procedures", "staff personal details", "unreleased products"]
}`;
  }

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemContext,
      messages: [{ role: "user", content: userPrompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonText = raw.replace(/^```json?\s*/m, "").replace(/\s*```$/m, "");
    const parsed = JSON.parse(jsonText);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("AI generate error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
