import type { SilkTone } from "./voice-emotion";

export type DemoRefundState = "eligible" | "manual_review" | "already_refunded";
export type DemoVoiceEmotion =
  | "welcoming"
  | "focused_lookup"
  | "empathetic"
  | "de_escalating"
  | "concerned_review"
  | "confident_resolution"
  | "status_reassurance";

export type DemoVoiceVariables = Record<string, string | number | boolean | null>;

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
  silkTone: SilkTone;
  emotion: DemoVoiceEmotion;
  arousal: number;
  valence: number;
  voiceScore: number;
  voiceVariables: DemoVoiceVariables;
  status: "active" | "resolved" | "escalated";
  resolution?: string;
  orderId?: string;
  action?: "ask_issue" | "ask_order" | "confirm_order" | "ask_reason" | "refund_initiated" | "refund_status" | "manual_review";
}

type DemoVoiceReplyCore = Omit<
  DemoVoiceReply,
  "silkTone" | "emotion" | "arousal" | "valence" | "voiceScore" | "voiceVariables"
>;

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

function speakablePaymentMethod(paymentMethod: string): string {
  const last4 = paymentMethod.match(/\d{4}$/)?.[0];
  if (!last4) return paymentMethod;
  const provider = paymentMethod.replace(/\s+ending\s+\d{4}$/i, "").trim();
  return `${provider.split("").join(" ")} ending ${last4.split("").join(" ")}`;
}

function speakableReference(reference: string): string {
  const match = reference.match(/^([A-Z]+)-(\d{4})-(\d{4})$/i);
  if (!match) return reference.replace(/-/g, " ");
  return `${match[1].toUpperCase().split("").join(" ")} ${match[2].split("").join(" ")} ${match[3].split("").join(" ")}`;
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

function buildDemoVoiceReplyCore(messages: DemoChatMessage[], currentTension = 0): DemoVoiceReplyCore {
  const userText = allUserText(messages);
  const assistantText = allAssistantText(messages);
  const lastUser = lastUserMessage(messages);
  const refundIntent = isRefundIntent(userText);
  const order = findDemoRefundOrder(userText);
  const reason = inferRefundReason(userText);
  const askedToConfirm = /is that the right order|is that right|please confirm|confirm this order/i.test(assistantText);
  const askedForReason = /reason for the refund|what went wrong|why do you want/i.test(assistantText);
  const alreadyCompleted = /refund has been initiated|already initiated under reference|refund approved|already started/i.test(assistantText);
  const confirmed = askedToConfirm && isAffirmative(lastUser);
  const denied = askedToConfirm && isNegative(lastUser);
  const tensionLevel = Math.min(10, Math.max(currentTension, refundIntent ? 3 : 1));

  if (!lastUser || shortIssueOnly(lastUser)) {
    return {
      text: "Tell me the issue. If it is a refund, I can check the order now.",
      intent: "query",
      tensionLevel,
      status: "active",
      action: "ask_issue",
    };
  }

  if (refundIntent && !order) {
    return {
      text: "I can help. Say the order ID or phone last four, and I will check it now.",
      intent: "refund",
      tensionLevel,
      status: "active",
      action: "ask_order",
    };
  }

  if (!refundIntent && !order) {
    return {
      text: "I understand. Is this about order status, refund, delivery, or damage?",
      intent: "query",
      tensionLevel,
      status: "active",
      action: "ask_issue",
    };
  }

  if (!order) {
    return {
      text: "I need one lookup detail. Say the order ID or phone last four.",
      intent: "refund",
      tensionLevel,
      status: "active",
      action: "ask_order",
    };
  }

  if (denied) {
    return {
      text: "Got it. Say the correct order ID or phone last four.",
      intent: "refund",
      tensionLevel,
      status: "active",
      action: "ask_order",
    };
  }

  if (order.state === "already_refunded") {
    return {
      text: `${order.orderId} was already refunded. Reference ${speakableReference(order.refundReference)}, sent to ${speakablePaymentMethod(order.paymentMethod)}.`,
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
      text: `${order.orderId} is outside the ${order.refundWindowDays}-day auto-refund window. I opened senior review ${speakableReference(order.refundReference)}.`,
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
      text: `I found ${order.orderId}: ${order.item}, paid by ${speakablePaymentMethod(order.paymentMethod)}. Is that right?`,
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "confirm_order",
    };
  }

  if (!confirmed && !reason) {
    return {
      text: "Please confirm the order. Then I can check refund eligibility.",
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "confirm_order",
    };
  }

  if (!reason && !askedForReason) {
    return {
      text: "Thanks. What is the reason: duplicate charge, damage, wrong item, or cancellation?",
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "ask_reason",
    };
  }

  if (!reason) {
    return {
      text: "I still need the reason: duplicate charge, damage, wrong item, delivery issue, or cancellation?",
      intent: "refund",
      tensionLevel,
      status: "active",
      orderId: order.orderId,
      action: "ask_reason",
    };
  }

  if (alreadyCompleted) {
    return {
      text: `Refund ${speakableReference(order.refundReference)} is already started. It should reach ${speakablePaymentMethod(order.paymentMethod)} in 3 to 5 days.`,
      intent: "refund_status",
      tensionLevel,
      status: "resolved",
      resolution: `refund_already_initiated:${order.orderId}:${order.refundReference}`,
      orderId: order.orderId,
      action: "refund_status",
    };
  }

  return {
    text: `Refund approved. Reference ${speakableReference(order.refundReference)}. It should reach ${speakablePaymentMethod(order.paymentMethod)} in 3 to 5 days.`,
    intent: "refund",
    tensionLevel,
    status: "resolved",
    resolution: `refund_initiated:${order.orderId}:${order.refundReference}`,
    orderId: order.orderId,
    action: "refund_initiated",
  };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function inferTensionLevel(
  messages: DemoChatMessage[],
  reply: DemoVoiceReplyCore,
  currentTension: number
): number {
  const userText = allUserText(messages);
  const lastUser = lastUserMessage(messages);
  let score = Math.max(currentTension, reply.tensionLevel);

  if (isRefundIntent(userText)) score = Math.max(score, 3);
  if (/\b(angry|furious|mad|terrible|horrible|useless|worst|complaint|manager|legal|court)\b/i.test(userText)) score += 3;
  if (/\b(fraud|scam|cheated|stolen|social media|twitter|x.com|consumer court)\b/i.test(userText)) score += 4;
  if (/\b(damaged|broken|defective|wrong item|charged twice|duplicate charge|not working|never arrived)\b/i.test(userText)) score += 1;
  if (/[!]{2,}/.test(lastUser)) score += 1;
  if (lastUser.length > 12 && lastUser === lastUser.toUpperCase()) score += 1;
  if (/\b(thanks|thank you|great|perfect|okay|ok|fine|yes)\b/i.test(lastUser)) score -= 1;
  if (reply.action === "manual_review") score = Math.max(score, 6);
  if (reply.status === "resolved") score -= 1;

  return clampInt(score, 0, 10);
}

function selectVoiceState(
  reply: DemoVoiceReplyCore,
  tensionLevel: number,
  userText: string
): Pick<DemoVoiceReply, "silkTone" | "emotion" | "arousal" | "valence" | "voiceScore"> {
  let silkTone: SilkTone = "neutral";
  let emotion: DemoVoiceEmotion = "focused_lookup";
  let arousal = 4;
  let valence = 5;

  if (reply.action === "ask_issue" && !isRefundIntent(userText) && tensionLevel <= 2) {
    silkTone = "happy";
    emotion = "welcoming";
    arousal = 4;
    valence = 8;
  } else if (reply.action === "refund_initiated") {
    silkTone = "excited";
    emotion = "confident_resolution";
    arousal = 6;
    valence = 9;
  } else if (reply.action === "refund_status") {
    silkTone = "happy";
    emotion = "status_reassurance";
    arousal = 4;
    valence = 8;
  } else if (reply.action === "manual_review" || reply.status === "escalated") {
    silkTone = "sad";
    emotion = "concerned_review";
    arousal = 3;
    valence = 3;
  } else if (tensionLevel >= 8) {
    silkTone = "whisper";
    emotion = "de_escalating";
    arousal = 2;
    valence = 3;
  } else if (tensionLevel >= 6) {
    silkTone = "sad";
    emotion = "empathetic";
    arousal = 3;
    valence = 4;
  } else if (reply.action === "confirm_order" || reply.action === "ask_order" || reply.action === "ask_reason") {
    silkTone = "neutral";
    emotion = "focused_lookup";
    arousal = 4;
    valence = 6;
  }

  const voiceScore = clampInt((10 - tensionLevel) * 7 + valence * 3 + arousal * 2, 0, 100);
  return { silkTone, emotion, arousal, valence, voiceScore };
}

export function buildDemoVoiceReply(messages: DemoChatMessage[], currentTension = 0): DemoVoiceReply {
  const core = buildDemoVoiceReplyCore(messages, currentTension);
  const userText = allUserText(messages);
  const tensionLevel = inferTensionLevel(messages, core, currentTension);
  const voice = selectVoiceState(core, tensionLevel, userText);

  return {
    ...core,
    ...voice,
    tensionLevel,
    voiceVariables: {
      customerIntent: core.intent,
      action: core.action ?? "respond",
      orderId: core.orderId ?? null,
      resolution: core.resolution ?? null,
      tensionLevel,
      silkTone: voice.silkTone,
      emotion: voice.emotion,
      arousal: voice.arousal,
      valence: voice.valence,
      voiceScore: voice.voiceScore,
      model: "muga",
    },
  };
}
