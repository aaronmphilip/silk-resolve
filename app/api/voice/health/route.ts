import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPlatformAIConfig, getPlatformVoiceConfig } from "@/lib/platform";

export const runtime = "nodejs";

type CheckStatus = "ok" | "warning" | "error";

interface HealthCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
}

function deriveOrigin(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000")
    .split(",")[0]
    .trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]")).toLowerCase()
    : host.split(":")[0]?.toLowerCase();
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const proto = forwardedProto || (isLocalHost ? "http" : "https");
  return `${proto}://${host}`;
}

async function checkVapiPrivateKey(privateKey: string): Promise<HealthCheck> {
  if (!privateKey) {
    return {
      id: "vapi-private-key",
      label: "Vapi private key",
      status: "warning",
      message: "Missing. Web calls can start, but server-side Vapi diagnostics cannot run.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch("https://api.vapi.ai/call?limit=1", {
      headers: { Authorization: `Bearer ${privateKey}` },
      signal: controller.signal,
    });

    if (response.ok) {
      return {
        id: "vapi-private-key",
        label: "Vapi private key",
        status: "ok",
        message: "Accepted by Vapi.",
      };
    }

    return {
      id: "vapi-private-key",
      label: "Vapi private key",
      status: response.status === 401 || response.status === 403 ? "error" : "warning",
      message: `Vapi returned ${response.status} while checking the server key.`,
    };
  } catch (err) {
    return {
      id: "vapi-private-key",
      label: "Vapi private key",
      status: "warning",
      message: err instanceof Error && err.name === "AbortError"
        ? "Timed out while checking Vapi."
        : "Could not reach Vapi from the server.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function overallStatus(checks: HealthCheck[]): CheckStatus {
  if (checks.some(check => check.status === "error")) return "error";
  if (checks.some(check => check.status === "warning")) return "warning";
  return "ok";
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ vapi, silk }, aiConfig] = await Promise.all([
    getPlatformVoiceConfig(),
    getPlatformAIConfig(),
  ]);

  const checks: HealthCheck[] = [];
  const origin = deriveOrigin(req);
  const isLocalOrigin = origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");

  checks.push({
    id: "origin",
    label: "Public app URL",
    status: origin.startsWith("https://") || isLocalOrigin ? "ok" : "error",
    message: origin.startsWith("https://") || isLocalOrigin
      ? `${origin} can be used for Vapi webhooks.`
      : `${origin} is not HTTPS. Vapi webhooks and browser microphone access can fail.`,
  });

  checks.push({
    id: "vapi-public-key",
    label: "Vapi public key",
    status: vapi.publicKey ? "ok" : "error",
    message: vapi.publicKey
      ? "Configured for browser web-call creation."
      : "Missing VAPI_PUBLIC_KEY. Browser web calls cannot start.",
  });

  checks.push({
    id: "vapi-key-scope",
    label: "Vapi key scope",
    status: vapi.publicKey && vapi.privateKey && vapi.publicKey === vapi.privateKey ? "error" : "ok",
    message: vapi.publicKey && vapi.privateKey && vapi.publicKey === vapi.privateKey
      ? "Public and private keys are identical. /call/web rejects the wrong scope."
      : "Public/private key scopes are not obviously mixed.",
  });

  checks.push(await checkVapiPrivateKey(vapi.privateKey));

  checks.push({
    id: "ai-provider",
    label: "AI provider",
    status: aiConfig.apiKey ? "ok" : "error",
    message: aiConfig.apiKey
      ? `${aiConfig.provider} is configured for live replies.`
      : "No AI API key is configured. Live replies will fail after the first message.",
  });

  checks.push({
    id: "silk",
    label: "SILK voice",
    status: silk.apiKey ? "ok" : "warning",
    message: silk.apiKey
      ? "Configured. Calls will request SILK custom voice."
      : "Missing. Calls will use Vapi's PlayHT fallback voice.",
  });

  try {
    const { error } = await createServiceClient()
      .from("voice_sessions")
      .select("id", { count: "exact", head: true });

    checks.push({
      id: "supabase-service-role",
      label: "Supabase service role",
      status: error ? "error" : "ok",
      message: error ? `Cannot write voice sessions: ${error.message}` : "Can access voice session storage.",
    });
  } catch (err) {
    checks.push({
      id: "supabase-service-role",
      label: "Supabase service role",
      status: "error",
      message: err instanceof Error ? err.message : "Cannot access voice session storage.",
    });
  }

  try {
    const { count, error } = await supabase
      .from("agents")
      .select("id", { count: "exact", head: true });

    checks.push({
      id: "agents",
      label: "Test agents",
      status: error ? "error" : (count ?? 0) > 0 ? "ok" : "warning",
      message: error ? `Cannot read agents: ${error.message}` : `${count ?? 0} agent(s) available to test.`,
    });
  } catch (err) {
    checks.push({
      id: "agents",
      label: "Test agents",
      status: "error",
      message: err instanceof Error ? err.message : "Cannot read agents.",
    });
  }

  const status = overallStatus(checks);
  return NextResponse.json({
    ok: status !== "error",
    status,
    checks,
    generatedAt: new Date().toISOString(),
  });
}
