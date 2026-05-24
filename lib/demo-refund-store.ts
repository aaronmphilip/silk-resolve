import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_REFUND_ORDERS,
  type DemoRefundOrder,
  type DemoVoiceReply,
} from "@/lib/demo-refunds";

interface PersistDemoRefundActionArgs {
  db: SupabaseClient | null;
  tenantId?: string | null;
  callSid?: string | null;
  reply: DemoVoiceReply;
}

interface DemoRefundOrderRow {
  order_id: string;
  aliases: string[] | null;
  customer_name: string | null;
  phone_last4: string | null;
  email: string | null;
  item: string | null;
  purchased_at: string | null;
  delivered_at: string | null;
  amount: string | null;
  payment_method: string | null;
  state: DemoRefundOrder["state"] | null;
  refund_window_days: number | null;
  refund_reference: string | null;
  policy_note: string | null;
}

function nextRefundState(reply: DemoVoiceReply, order: DemoRefundOrder): string {
  if (reply.action === "refund_initiated") return "refund_initiated";
  if (reply.action === "manual_review") return "manual_review";
  if (reply.resolution?.startsWith("refund_already_initiated")) return "refund_initiated";
  if (reply.resolution?.startsWith("refund_already_completed")) return "already_refunded";
  return order.state;
}

export async function persistDemoRefundAction({
  db,
  tenantId,
  callSid,
  reply,
}: PersistDemoRefundActionArgs): Promise<void> {
  if (!db || !tenantId || !reply.orderId || !reply.action) return;
  if (!["refund_initiated", "manual_review", "refund_status"].includes(reply.action)) return;

  const order = DEMO_REFUND_ORDERS.find((candidate) => candidate.orderId === reply.orderId);
  if (!order) return;

  const now = new Date().toISOString();
  const state = nextRefundState(reply, order);

  try {
    const { error: orderError } = await db.from("demo_refund_orders").upsert(
      {
        tenant_id: tenantId,
        order_id: order.orderId,
        aliases: order.aliases,
        customer_name: order.customerName,
        phone_last4: order.phoneLast4,
        email: order.email,
        item: order.item,
        purchased_at: order.purchasedAt,
        delivered_at: order.deliveredAt,
        amount: order.amount,
        payment_method: order.paymentMethod,
        state,
        refund_window_days: order.refundWindowDays,
        refund_reference: order.refundReference,
        policy_note: order.policyNote,
        last_call_sid: callSid ?? null,
        last_action_at: now,
      },
      { onConflict: "tenant_id,order_id" }
    );

    if (orderError) {
      console.error("[demo-refund-store] order persistence failed:", orderError.message);
      return;
    }

    const { error: eventError } = await db.from("demo_refund_events").insert({
      tenant_id: tenantId,
      order_id: order.orderId,
      call_sid: callSid ?? null,
      action: reply.action,
      resolution: reply.resolution ?? null,
      payload: {
        status: reply.status,
        text: reply.text,
        silkTone: reply.silkTone,
        emotion: reply.emotion,
        tensionLevel: reply.tensionLevel,
        voiceScore: reply.voiceScore,
      },
    });

    if (eventError) {
      console.error("[demo-refund-store] event persistence failed:", eventError.message);
    }
  } catch (err) {
    console.error("[demo-refund-store] persistence failed:", err);
  }
}

export async function loadDemoRefundOrders(
  db: SupabaseClient | null,
  tenantId?: string | null
): Promise<DemoRefundOrder[]> {
  if (!db || !tenantId) return DEMO_REFUND_ORDERS;

  try {
    const { data, error } = await db
      .from("demo_refund_orders")
      .select(
        "order_id, aliases, customer_name, phone_last4, email, item, purchased_at, delivered_at, amount, payment_method, state, refund_window_days, refund_reference, policy_note"
      )
      .eq("tenant_id", tenantId)
      .order("order_id", { ascending: true });

    if (error || !data?.length) return DEMO_REFUND_ORDERS;

    return (data as DemoRefundOrderRow[]).map((row) => ({
      orderId: row.order_id,
      aliases: row.aliases ?? [],
      customerName: row.customer_name ?? "",
      phoneLast4: row.phone_last4 ?? "",
      email: row.email ?? "",
      item: row.item ?? "",
      purchasedAt: row.purchased_at ?? "",
      deliveredAt: row.delivered_at ?? "",
      amount: row.amount ?? "",
      paymentMethod: row.payment_method ?? "",
      state: row.state ?? "eligible",
      refundWindowDays: row.refund_window_days ?? 7,
      refundReference: row.refund_reference ?? "",
      policyNote: row.policy_note ?? "",
    }));
  } catch (err) {
    console.error("[demo-refund-store] order load failed:", err);
    return DEMO_REFUND_ORDERS;
  }
}
