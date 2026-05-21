/**
 * Multi-provider AI abstraction.
 * Supports Anthropic, OpenAI, Google Gemini, xAI (Grok).
 * xAI uses OpenAI-compatible API — no extra SDK needed.
 */

export type AIProvider = "anthropic" | "openai" | "gemini" | "xai";

export const AI_PROVIDERS: {
  id: AIProvider;
  label: string;
  model: string;
  note: string;
  keyHint: string;
}[] = [
  {
    id: "xai",
    label: "xAI Grok",
    model: "grok-3",
    note: "Fast, smart, cost-effective. OpenAI-compatible API. Great for voice scripts.",
    keyHint: "xai-...",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    model: "claude-sonnet-4-5",
    note: "Best reasoning + instruction following. Top choice for complex scripts.",
    keyHint: "sk-ant-...",
  },
  {
    id: "openai",
    label: "OpenAI GPT-4o",
    model: "gpt-4o",
    note: "Reliable, fast. Strong multilingual support.",
    keyHint: "sk-...",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    model: "gemini-1.5-pro",
    note: "Long context window. Good for document-heavy use cases.",
    keyHint: "AIza...",
  },
];

// ── Internal OpenAI-compatible call (used for OpenAI + xAI) ─────────────────

async function callOpenAICompat(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  jsonMode?: boolean;
}): Promise<string> {
  const { baseUrl, apiKey, model, system, user, maxTokens, jsonMode = true } = opts;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user },
    ],
    max_tokens: maxTokens,
  };

  // Only add json_object mode when we actually want JSON
  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `API error ${response.status}`);
  }

  const data = await response.json() as { choices: { message: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Main callAI ───────────────────────────────────────────────────────────────

export async function callAI(opts: {
  provider: AIProvider;
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
  jsonMode?: boolean;   // default true for structured responses
}): Promise<string> {
  const { provider, apiKey, system, user, maxTokens = 3000, jsonMode = true } = opts;

  // ── xAI Grok (OpenAI-compatible) ──────────────────────────────────────────
  if (provider === "xai") {
    return callOpenAICompat({
      baseUrl: "https://api.x.ai/v1",
      apiKey,
      model: "grok-3",
      system,
      user,
      maxTokens,
      jsonMode,
    });
  }

  // ── Anthropic Claude ──────────────────────────────────────────────────────
  if (provider === "anthropic") {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  // ── OpenAI GPT-4o ─────────────────────────────────────────────────────────
  if (provider === "openai") {
    return callOpenAICompat({
      baseUrl: "https://api.openai.com/v1",
      apiKey,
      model: "gpt-4o",
      system,
      user,
      maxTokens,
      jsonMode,
    });
  }

  // ── Google Gemini ─────────────────────────────────────────────────────────
  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(JSON.stringify(err) ?? `Gemini error ${response.status}`);
    }
    const data = await response.json() as {
      candidates: { content: { parts: { text: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

// ── Key tester ────────────────────────────────────────────────────────────────

export async function testAIKey(
  provider: AIProvider,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await callAI({
      provider,
      apiKey,
      system: "You are a test assistant.",
      user: 'Reply with exactly: {"ok": true}',
      maxTokens: 20,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}

/** Strip JSON markdown wrapper that models sometimes add */
export function extractJSON(raw: string): string {
  return raw.trim().replace(/^```json?\s*/im, "").replace(/\s*```$/m, "");
}
