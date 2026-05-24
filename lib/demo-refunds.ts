export type DemoRefundState = "eligible" | "manual_review" | "already_refunded";

export interface DemoRefundOrder {
  orderId: string;
  aliases: string[];
  customerName: string;
  phoneLast4: string;
  email: string;
  item: string;
  purchasedAt: string;
  deliveredAt: string;
  amount: string;
  paymentMethod: string;
  state: DemoRefundState;
  refundWindowDays: number;
  refundReference: string;
  policyNote: string;
}

export interface DemoVoiceReply {
  text: string;
  intent: string;
  tensionLevel: number;
  status: "active" | "resolved" | "escalated";
  resolution?: string;
  orderId?: string;
  action?: "ask_issue" | "ask_order" | "confirm_order" | "ask_reason" | "refund_initiated" | "refund_status" | "manual_review";
}

export interface DemoChatMessage {
  role: string;
  content: string;
}

export const DEMO_REFUND_ORDERS: DemoRefundOrder[] = [
  {
    orderId: "SR-1001",
    aliases: ["1001", "MED-1001", "ORD-1001"],
    customerName: "Riya Sharma",
    phoneLast4: "4321",
    email: "riya.sharma@example.com",
    item: "NoiseBeam Pro headphones",
    purchasedAt: "May 18, 2026",
    deliveredAt: "May 20, 2026",
    amount: "INR 4,999",
    paymentMethod: "UPI ending 1188",
    state: "eligible",
    refundWindowDays: 7,
    refundReference: "RF-1001-0524",
    policyNote: "Unused item inside the 7-day refund window.",
  },
  {
    orderId: "SR-1002",
    aliases: ["1002", "MED-1002", "ORD-1002"],
    customerName: "Aarav Mehta",
    phoneLast4: "7788",
    email: "aarav.mehta@example.com",
    item: "TrailStep running shoes",
    purchasedAt: "May 4, 2026",
    deliveredAt: "May 6, 2026",
    amount: "INR 3,299",
    paymentMethod: "Visa ending 2204",
    state: "manual_review",
    refundWindowDays: 7,
    refundReference: "RV-1002-0524",
    policyNote: "Outside the 7-day self-serve refund window, so it needs senior review.",
  },
  {
    orderId: "SR-1003",
    aliases: ["1003", "MED-1003", "ORD-1003"],
    customerName: "Neha Kapoor",
    phoneLast4: "9090",
    email: "neha.kapoor@example.com",
    item: "Linen comfort shirt",
    purchasedAt: "May 16, 2026",
    deliveredAt: "May 18, 2026",
    amount: "INR 1,499",
    paymentMethod: "Mastercard ending 5412",
    state: "already_refunded",
    refundWindowDays: 7,
    refundReference: "RF-1003-0521",
    policyNote: "Refund was already issued to the original payment method.",
  },
];

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function hasAny(text: string, words: RegExp[]): boolean {
  return words.some((pattern) => pattern.test(text));
}

export function findDemoRefundOrder(text: string): DemoRefundOrder | null {
  const source = compact(text);
  if (!source) return null;

  for (const order of DEMO_REFUND_ORDERS) {
    const orderKeys = [order.orderId, ...order.aliases].map(compact);
    if (orderKeys.some((key) => key && source.includes(key))) return order;
    if (source.includes(order.phoneLast4)) return order;
  }

  return null;
}

function lastUserMessage(messages: DemoChatMessage[]): string {
  return [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
}

function allUserText(messages: DemoChatMessage[]): string {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join(" ");
}

function allAssistantText(messages: DemoChatMessage[]): string {
  return messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content)
    .join(" ");
}

function isAffirmative(text: string): boolean {
  return /\b(yes|yeah|yep|correct|right|that is right|that's right|haan|ha|ji|sure|confirm|confirmed)\b/i.test(text);
}

function isNegative(text: string): boolean {
  return /\b(no|nope|wrong|not this|not that|incorrect|nahi|nahin)\b/i.test(text);
}

function inferRefundReason(text: string): string | null {
  const lowered = text.toLowerCase();
  const reasons: Array<[RegExp, string]> = [
    [/\b(duplicate|charged twice|double charge|two times|twice)\b/i, "duplicate charge"],
    [/\b(damaged|broken|defective|not working|faulty)\b/i, "damaged or defective item"],
    [/\b(wrong item|different item|incorrect item)\b/i, "wrong item received"],
    [/\b(late|delayed|not delivered|never arrived)\b/i, "delivery issue"],
    [/\b(cancel|changed my mind|do not want|don't want)\b/i, "customer cancellation"],
    [/\b(quality|bad|poor|not satisfied|problem)\b/i, "product quality issue"],
  ];

  for (const [pattern, reason] of reasons) {
    if (pattern.test(lowered)) return reason;
  }

  return null;
}

function isRefundIntent(text: string): boolean {
  return hasAny(text, [
    /\brefund\b/i,
    /\breturn\b/i,
    /\bmoney back\b/i,
    /\bchargeback\b/i,
    /\bcharged\b/i,
    /\bcancel order\b/i,
    /\bwrong item\b/i,
    /\bdamaged\b/i,
  ]);
}

function shortIssueOnly(text: string): boolean {
  return /^(hi|hello|hey|help|my problem|problem|issue|i have a problem|i need help)$/i.test(text.trim());
}

export function buildDemoVoiceReply(messages: DemoChatMessage[], currentTension = 0): DemoVoiceReply {
  const userText = allUserText(messages);
  const assistantText = allAssistantText(messages);
  const lastUser = lastUserMessage(messages);
  const refundIntent = isRefundIntent(userText);
  const order = findDemoRefundOrder(userText);
  const reason = inferRefundReason(userText);
  const askedToConfirm = /is that the right order|please confirm|confirm this order/i.test(assistantText);
  const askedForReason = /reason for the refund|what went wrong|why do you want/i.test(assistantText);
  const alreadyCompleted = /refund has been initiated|already initiated under reference/i.test(assistantText);
  const confirmed = askedToConfirm && isAffirmative(lastUser);
  const denied = askedToConfirm && isNegative(lastUser);
  const tensionLevel = Math.min(10, Math.max(currentTension, refundIntent ? 3 : 1));

  if (!lastUser || shortIssueOnly(lastUser)) {
    return {
      text: "Tell me what happened. If this is about a refund, I can check the order database during this call and process it if the order is eligible.",
      intent: "query",
      tensionLevel,
      status: "active",
      action: "ask_issue",
    };
  }

  if (refundIntent && !order) {
    return {
      text: "I can help with that. Please share the order ID, or the last four digits of the registered phone number, and I will check the refund record now.",
      intent: "refund",
      tensionLevel,
      status: "active",
      action: "ask_order",
    };
  }

  if (!refundIntent && !order) {
    return {
      text: "I understand. Tell me whether this is about an order status, a refund, a delivery issue, or a damaged item, and I will handle it from there.",
      intent: "query",
      tensionLevel,
      status: "active",
      action: "ask_issue",
    };
  }

  if (!order) {
    return {
      text: "I need one lookup detail before I can act on it. Please say the order ID or the registered phone number's last four digits.",
      intent: "refund",
      tensionLevel,
      status: "active",
      action: "ask_order",
    };
  }

  if (denied) {
    return {
      text: "Got it. Please give me the correct order ID or the registered phone number's last four digits, and I will pull up the right record.",
      intent: "refund",
      tensionLevel,
      status: "active",
      action: "ask_order",
    };
  }

  if (order.state === "already_refunded") {
    return {
      text: `I checked the order database. ${order.orderId} for ${order.item} was already refunded under reference ${order.refundReference}. It was sent back to ${order.paymentMethod}.`,
      intent: "refund_status",
      tensionLevel,
      status: "resolved",
      resolution: `refund_already_completed:${order.orderId}:${order.refundReference}`,
      orderId: order.orderId,
      action: "refund_status",
    };
  }

  if (order.state === "manual_review") {
    return {
      text: `I found ${order.orderId}: ${order.item}, purchased on ${order.purchasedAt} for ${order.amount}. This is outside the ${order.refundWindowDays}-day automatic refund window, so I have opened senior review ${order.refundReference} instead of promising an instant refund.`,
      intent: "refund",
      tensionLevel: Math.max(tensionLevel, 5),
      status: "escalated",
      resolution: `manual_review_created:${order.orderId}:${order.refundReference}`,
      orderId: order.orderId,
      action: "manual_review",
    };
  }

  if (!askedToConfirm && !confirmed) {
    return {
      text: `I found ${order.orderId} in the order database: ${order.item}, bought on ${order.purchasedAt}, delivered on ${order.deliveredAt}, for ${order.amount} paid by ${order.paymentMethod}. Is that the right order?`,
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "confirm_order",
    };
  }

  if (!confirmed && !reason) {
    return {
      text: "Please confirm if that is the right order. Once you confirm, I can check the policy and process the refund if it qualifies.",
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "confirm_order",
    };
  }

  if (!reason && !askedForReason) {
    return {
      text: "Thanks, I have the order. What was the reason for the refund, for example duplicate charge, damaged item, wrong item, or cancellation?",
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "ask_reason",
    };
  }

  if (!reason) {
    return {
      text: "I still need the refund reason before I can submit it. Was it a duplicate charge, damaged item, wrong item, delivery issue, or cancellation?",
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "ask_reason",
    };
  }

  if (alreadyCompleted) {
    return {
      text: `The refund is already initiated under reference ${order.refundReference}. You will receive it on ${order.paymentMethod} within 3 to 5 business days.`,
      intent: "refund_status",
      tensionLevel,
      status: "resolved",
      resolution: `refund_already_initiated:${order.orderId}:${order.refundReference}`,
      orderId: order.orderId,
      action: "refund_status",
    };
  }

  return {
    text: `I checked the policy and the order qualifies. I have initiated a ${order.amount} refund for ${order.orderId} because of ${reason}. The reference is ${order.refundReference}, and it should reach ${order.paymentMethod} within 3 to 5 business days.`,
    intent: "refund",
    tensionLevel,
    status: "resolved",
    resolution: `refund_initiated:${order.orderId}:${order.refundReference}`,
    orderId: order.orderId,
    action: "refund_initiated",
  };
}
