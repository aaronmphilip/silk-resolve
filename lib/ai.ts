/**
 * Multi-provider AI abstraction.
 * Supports Anthropic (claude-sonnet-4-6), OpenAI (gpt-4o), Google Gemini (gemini-1.5-pro).
 * Uses native fetch for OpenAI/Gemini — no extra SDK dependencies.
 */

export type AIProvider = "anthropic" | "openai" | "gemini";

export const AI_PROVIDERS: {
  id: AIProvider;
  label: string;
  model: string;
  note: string;
  keyHint: string;
}[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    model: "claude-sonnet-4-6",
    note: "Best reasoning + instruction following. Recommended for complex scripts.",
    keyHint: "sk-ant-...",
  },
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-4o",
    note: "Fast, cost-effective. Strong multilingual support.",
    keyHint: "sk-...",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-1.5-pro",
    note: "Long context. Good for document-heavy integrations.",
    keyHint: "AIza...",
  },
];

export async function callAI(opts: {
  provider: AIProvider;
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const { provider, apiKey, system, user, maxTokens = 3000 } = opts;

  if (provider === "anthropic") {
    // Dynamic import — SDK already installed
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `OpenAI error ${response.status}`);
    }
    const data = await response.json() as { choices: { message: { content: string } }[] };
    return data.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(err) ?? `Gemini error ${response.status}`);
    }
    const data = await response.json() as { candidates: { content: { parts: { text: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

export async function testAIKey(provider: AIProvider, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await callAI({
      provider,
      apiKey,
      system: "You are a test assistant.",
      user: "Reply with exactly: {\"ok\": true}",
      maxTokens: 20,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

/** Strip JSON markdown wrapper that models sometimes add */
export function extractJSON(raw: string): string {
  return raw.trim().replace(/^```json?\s*/m, "").replace(/\s*```$/m, "");
}
