/**
 * POST /api/voice/vapi-events
 *
 * Handles all non-LLM Vapi events:
 *  - end-of-call-report  → save to calls table, update MESH
 *  - tool-calls          → execute tools, return results
 *  - status-update       → update session status
 *  - transcript          → (ignored — we get full transcript in end-of-call)
 */
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { stripVoiceMarkers } from "@/lib/voice-emotion";

export const runtime = "nodejs";

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function deriveOutcome(endedReason: string, sessionStatus: string): string {
  if (sessionStatus === "escalated") return "escalated";
  if (["hangup", "customer-ended-call", "assistant-ended-call"].includes(endedReason)) return "resolved";
  if (["customer-did-not-pick-up", "no-answer", "busy"].includes(endedReason)) return "abandoned";
  return "resolved";
}

function buildTags(
  messages: Array<{ role: string }>,
  analysis?: Record<string, unknown>,
  session?: Record<string, unknown>
): string[] {
  const tags: string[] = [];
  const turnCount = messages.filter((m) => m.role === "user").length;
  const sentiment = analysis?.sentiment as string | undefined;
  const outcome = analysis?.outcome as string | undefined;
  const platformPhone = String(session?.platform_phone ?? "");
  const resolution = String(session?.resolution ?? "");

  if (outcome === "escalated")           tags.push("escalated");
  if (sentiment === "negative")          tags.push("frustrated-caller");
  if (turnCount > 6)                     tags.push("long-call");
  if (platformPhone.startsWith("web"))    tags.push("web");
  if (resolution.includes("refund"))      tags.push("refund");
  return tags;
}

export async function POST(req: NextRequest) {
  const db = svc();
  const body = await req.json() as {
    message: {
      type: string;
      call?: {
        id: string;
        customer?: { number: string };
        phoneNumber?: { number: string };
        startedAt?: string;
        endedAt?: string;
      };
      endedReason?: string;
      durationSeconds?: number;
      artifact?: {
        transcript?: string;
        messages?: Array<{ role: string; message?: string; content?: string; time?: number }>;
        recordingUrl?: string;
        summary?: string;
      };
      analysis?: {
        summary?: string;
        structuredData?: Record<string, unknown>;
        successEvaluation?: string;
      };
      status?: string;
      toolWithToolCallList?: Array<{
        name: string;
        toolCall: { id: string; parameters: Record<string, unknown> };
      }>;
      toolCallList?: Array<{ id: string; name: string; parameters: Record<string, unknown> }>;
    };
  };

  const { message } = body;

  // ── status-update ────────────────────────────────────────────────────────
  if (message.type === "status-update") {
    const callId = message.call?.id;
    if (callId && message.status === "ended") {
      try {
        await db
          .from("voice_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("call_sid", callId)
          .eq("status", "active"); // only update if still active (not escalated)
      } catch {}
    }
    return NextResponse.json({ ok: true });
  }

  // ── transcript (real-time partial) ───────────────────────────────────────
  if (message.type === "transcript") {
    // Ignored — we get the full transcript in end-of-call-report
    return NextResponse.json({ ok: true });
  }

  // ── tool-calls ────────────────────────────────────────────────────────────
  if (message.type === "tool-calls") {
    const results: Array<{ name: string; toolCallId: string; result: string }> = [];

    for (const toolCall of (message.toolCallList ?? [])) {
      let result = "{}";

      try {
        switch (toolCall.name) {
          case "escalate_to_human": {
            // Update session to escalated
            const callId = message.call?.id;
            if (callId) {
              await db.from("voice_sessions")
                .update({ status: "escalated", resolution: "escalated" })
                .eq("call_sid", callId);
            }
            result = JSON.stringify({ success: true, message: "Escalation initiated" });
            break;
          }
          case "log_complaint": {
            // Log complaint — in production wire to CRM
            console.log("[tool] log_complaint:", toolCall.parameters);
            result = JSON.stringify({ success: true, trackingId: `SR-${Date.now()}` });
            break;
          }
          case "schedule_callback": {
            console.log("[tool] schedule_callback:", toolCall.parameters);
            result = JSON.stringify({ success: true, message: "Callback scheduled" });
            break;
          }
          default:
            result = JSON.stringify({ success: false, error: `Unknown tool: ${toolCall.name}` });
        }
      } catch (err) {
        result = JSON.stringify({ success: false, error: String(err) });
      }

      results.push({ name: toolCall.name, toolCallId: toolCall.id, result });
    }

    return NextResponse.json({ results });
  }

  // ── end-of-call-report ────────────────────────────────────────────────────
  if (message.type === "end-of-call-report") {
    const callId     = message.call?.id ?? "";
    const fromPhone  = message.call?.customer?.number ?? "";
    const duration   = message.durationSeconds ?? 0;
    const endedReason = message.endedReason ?? "unknown";
    const transcript  = message.artifact?.messages ?? [];
    const summary     = message.analysis?.summary ?? message.artifact?.summary ?? "";
    const structured  = message.analysis?.structuredData ?? {};
    const now         = new Date().toISOString();

    try {
      // Load session
      const { data: session } = await db
        .from("voice_sessions")
        .select("*")
        .eq("call_sid", callId)
        .single();

      if (!session) return NextResponse.json({ ok: true });

      const outcome = deriveOutcome(endedReason, session.status ?? "active");

      // Calculate empathy score: inverse of average tension, scaled 0-100
      const tensionLevel = session.tension_level ?? 5;
      const empathyScore = Math.round(Math.max(0, Math.min(100, (10 - tensionLevel) * 10)));

      const tags = buildTags(
        transcript,
        structured as Record<string, unknown>,
        session as Record<string, unknown>
      );

      // 1. Finalise session
      await db.from("voice_sessions").update({
        status:        "ended",
        resolution:    outcome,
        empathy_score: empathyScore,
        ended_at:      session.ended_at ?? now,
        messages:      transcript.map((m) => ({
          role:    ["bot", "assistant", "agent"].includes(m.role) ? "agent" : "customer",
          content: stripVoiceMarkers(m.message ?? m.content ?? ""),
          time:    m.time,
        })),
      }).eq("call_sid", callId);

      // 2. Write analytics call record
      const { data: agent } = await db
        .from("agents")
        .select("name")
        .eq("id", session.agent_id)
        .single();

      await db.from("calls").upsert(
        {
          id:               callId,
          agent_id:         session.agent_id,
          agent_name:       agent?.name ?? "Unknown",
          tenant_id:        session.tenant_id,
          call_sid:         callId,
          client:           fromPhone || session.caller_phone || "web",
          duration:         formatDuration(duration),
          duration_seconds: duration,
          empathy_score:    empathyScore,
          outcome,
          tags,
          timestamp:        now,
        },
        { onConflict: "call_sid", ignoreDuplicates: true }
      );

      if (session.agent_id) {
        try {
          const today = new Date(now).toISOString().slice(0, 10);
          const { count: totalCalls } = await db
            .from("calls")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", session.agent_id);
          const { count: callsToday } = await db
            .from("calls")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", session.agent_id)
            .gte("timestamp", `${today}T00:00:00.000Z`);
          const { count: resolvedCalls } = await db
            .from("calls")
            .select("id", { count: "exact", head: true })
            .eq("agent_id", session.agent_id)
            .eq("outcome", "resolved");
          const resolvedRate = totalCalls
            ? Math.round(((resolvedCalls ?? 0) / totalCalls) * 100)
            : 0;

          await db.from("agents").update({
            total_calls: totalCalls ?? 0,
            calls_today: callsToday ?? 0,
            empathy_score: empathyScore,
            resolved_rate: resolvedRate,
            avg_handle_time: formatDuration(duration),
            last_active: "just now",
          }).eq("id", session.agent_id);
        } catch {}
      }

      // 3. Update MESH profile
      if (session.mesh_profile_id) {
        const debtDelta = outcome === "escalated" ? -10 : outcome === "resolved" ? +8 : 0;
        try {
          await db.from("mesh_profiles").update({
            last_seen:         now,
            last_resolution:   outcome,
            avg_empathy_score: empathyScore,
          }).eq("id", session.mesh_profile_id);

          if (debtDelta !== 0) {
            await db.rpc("increment_mesh_debt", {
              profile_id: session.mesh_profile_id,
              delta:       debtDelta,
            });
          }
          await db.rpc("increment_mesh_interactions", {
            profile_id: session.mesh_profile_id,
          });
        } catch {} // non-fatal

        // Append contextual anchor if Vapi found something meaningful
        if (summary && summary.length > 20) {
          const currentAnchors = await db
            .from("mesh_profiles")
            .select("contextual_anchors")
            .eq("id", session.mesh_profile_id)
            .single();

          const existing = (currentAnchors.data?.contextual_anchors as Array<Record<string, unknown>>) ?? [];
          if (existing.length < 20) { // cap at 20 anchors
            await db.from("mesh_profiles").update({
              contextual_anchors: [
                ...existing,
                {
                  id:      `anchor-${Date.now()}`,
                  text:    summary.slice(0, 120),
                  addedAt: now,
                  callId,
                  pillar:  "MESH",
                  active:  true,
                },
              ],
            }).eq("id", session.mesh_profile_id);
          }
        }
      }

      // 4. Increment tenant call counter
      if (session.tenant_id) {
        try {
          await db.rpc("increment_tenant_calls", { tenant_id: session.tenant_id });
        } catch {}
      }

    } catch (err) {
      console.error("[vapi-events] end-of-call error:", err);
    }

    return NextResponse.json({ ok: true });
  }

  // Unknown event type — always 200 to Vapi
  return NextResponse.json({ ok: true });
}
