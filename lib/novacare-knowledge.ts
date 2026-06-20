export const NOVACARE_AGENT_ID = "agt-856e6f5e-1851-4041-a4f5-9f5ee62c0793";

export const NOVACARE_FIRST_MESSAGE =
  "Hi! I'm Priya, your NovaCare support agent. I can help with plan prices, coverage, claims, reimbursement, and network hospitals. What would you like to check?";

export function isNovaCareAgentId(id: string): boolean {
  return id === NOVACARE_AGENT_ID;
}

export const NOVACARE_PLANS = [
  {
    name: "NovaCare Basic",
    spokenPrice: "four hundred ninety nine rupees per month",
    displayPrice: "Rs 499/month",
    sumInsured: "three lakh rupees",
    displaySumInsured: "Rs 3 lakh",
    audience: "one adult",
    highlights: [
      "cashless hospitalization",
      "I C U cover",
      "road ambulance up to two thousand rupees per claim",
      "one free annual health check",
    ],
    waiting: "thirty day general waiting period",
  },
  {
    name: "NovaCare Standard",
    spokenPrice: "eight hundred ninety nine rupees per month",
    displayPrice: "Rs 899/month",
    sumInsured: "five lakh rupees",
    displaySumInsured: "Rs 5 lakh",
    audience: "two adults and two children",
    highlights: [
      "cashless hospitalization",
      "O P D cover up to ten thousand rupees per year",
      "maternity add-on available",
      "free tele-consultations",
    ],
    waiting: "thirty day general waiting period",
  },
  {
    name: "NovaCare Premium",
    spokenPrice: "one thousand four hundred ninety nine rupees per month",
    displayPrice: "Rs 1,499/month",
    sumInsured: "ten lakh rupees",
    displaySumInsured: "Rs 10 lakh",
    audience: "full family",
    highlights: [
      "O P D cover up to twenty five thousand rupees per year",
      "critical illness rider included",
      "international emergency support",
      "room rent covered up to a private room",
    ],
    waiting: "thirty day general waiting period",
  },
] as const;

export const NOVACARE_FACTS = {
  about:
    "NovaCare is an IRDAI registered health insurer founded in twenty eighteen in Mumbai. It serves two point four million active policyholders across India.",
  claimRate:
    "NovaCare has a ninety eight point two percent claim settlement rate, with most simple support requests resolved in under four minutes.",
  hospitals:
    "NovaCare has over ten thousand cashless network hospitals across India, including Apollo, Fortis, Max, Manipal, Narayana Health, Medanta, and Aster partner hospitals in major cities.",
  cashless:
    "For a cashless claim, go to a network hospital, show the NovaCare e-card, and the hospital sends pre-auth to NovaCare. Normal pre-auth target time is thirty minutes.",
  reimbursement:
    "For reimbursement, pay the hospital, upload bills, the discharge summary, prescriptions, and bank details in the NovaCare app. Approved claims are usually paid within seven working days.",
  emergency:
    "For emergency admission, call one eight zero zero, six six eight, two two seven three. That is NovaCare's twenty four seven support line.",
  waiting:
    "All plans have a thirty day general waiting period. Pre-existing conditions are covered after two years of continuous NovaCare coverage.",
  exclusions:
    "Cosmetic treatment, non-prescribed supplements, self-inflicted injury, and unapproved experimental treatment are not covered.",
  maternity:
    "Maternity cover is available as an add-on for Standard and Premium at one hundred ninety nine rupees per month. It has a two year waiting period.",
  renewals:
    "Auto-renew is on by default. Customers receive an S M S and app notification thirty days before renewal.",
  support:
    "NovaCare support is available twenty four seven by phone, app chat, email at support at novacare dot in, and the customer app.",
} as const;

export const MUGA_CACHED_AUDIO = [
  {
    id: "lead-got-it",
    text: "Got it.",
    audioFile: "muga-got-it-24k.pcm",
  },
  {
    id: "lead-check",
    text: "Let me check that.",
    audioFile: "muga-let-me-check-that-24k.pcm",
  },
  {
    id: "lead-empathy",
    text: "I understand.",
    audioFile: "muga-i-understand-24k.pcm",
  },
  {
    id: "script-missing",
    text:
      "I don't have the answer to this question from my support script, so I cannot help you with that.",
    audioFile: "silk-script-missing-24k.pcm",
  },
  {
    id: "greeting",
    text:
      "Hi! I'm Priya, your NovaCare support agent. I can help with plan prices, coverage, claims, reimbursement, and network hospitals. What would you like to check?",
    audioFile: "novacare-greeting-24k.pcm",
  },
  {
    id: "plans",
    text:
      "For NovaCare, Basic is four hundred ninety nine rupees per month for one adult. Standard is eight hundred ninety nine rupees for two adults and two children. Premium is one thousand four hundred ninety nine rupees for a full family. For most families, Standard is the practical starting point.",
    audioFile: "novacare-plans-24k.pcm",
  },
  {
    id: "plan-basic",
    text:
      "NovaCare Basic is four hundred ninety nine rupees per month, with three lakh rupees sum insured for one adult. It includes cashless hospitalization, I C U cover, road ambulance up to two thousand rupees per claim, and one free annual health check.",
    audioFile: "novacare-plan-basic-24k.pcm",
  },
  {
    id: "plan-standard",
    text:
      "NovaCare Standard is eight hundred ninety nine rupees per month, with five lakh rupees sum insured for two adults and two children. It includes cashless hospitalization, O P D cover up to ten thousand rupees per year, maternity add-on eligibility, and free tele-consultations.",
    audioFile: "novacare-plan-standard-24k.pcm",
  },
  {
    id: "plan-premium",
    text:
      "NovaCare Premium is one thousand four hundred ninety nine rupees per month, with ten lakh rupees sum insured for a full family. It includes O P D cover up to twenty five thousand rupees per year, a critical illness rider, international emergency support, and private-room eligibility.",
    audioFile: "novacare-plan-premium-24k.pcm",
  },
  {
    id: "coverage",
    text:
      "Basic covers three lakh rupees, Standard covers five lakh rupees, and Premium covers ten lakh rupees. Hospitalization, I C U, ambulance, and annual health check are included across all plans.",
    audioFile: "novacare-coverage-24k.pcm",
  },
  {
    id: "claims",
    text:
      "For a cashless claim, go to a network hospital and show your NovaCare e-card. The hospital sends pre-auth to NovaCare, and the normal target time is thirty minutes. Keep your policy ID, e-card, government ID, diagnosis note, and admission request ready.",
    audioFile: "novacare-claims-24k.pcm",
  },
  {
    id: "network-hospitals",
    text:
      "NovaCare has over ten thousand cashless network hospitals across India, including Apollo, Fortis, Max, Manipal, Narayana Health, Medanta, and Aster partner hospitals.",
    audioFile: "novacare-network-hospitals-24k.pcm",
  },
  {
    id: "relocation",
    text:
      "Yes, your NovaCare policy stays active across India. Before treatment in a new city, check the NovaCare app for cashless network hospitals there.",
    audioFile: "novacare-relocation-24k.pcm",
  },
  {
    id: "reimbursement",
    text:
      "For reimbursement, pay the hospital, then upload bills, the discharge summary, prescriptions, and bank details in the NovaCare app. Approved claims are usually paid within seven working days.",
    audioFile: "novacare-reimbursement-24k.pcm",
  },
  {
    id: "waiting",
    text:
      "All plans have a thirty day general waiting period. Pre-existing conditions are covered after two years of continuous NovaCare coverage. Maternity cover is available on Standard and Premium with a two year waiting period.",
    audioFile: "novacare-waiting-24k.pcm",
  },
  {
    id: "support",
    text:
      "For emergency admission, call one eight zero zero, six six eight, two two seven three. You can also use app chat or email support at support at novacare dot in.",
    audioFile: "novacare-support-24k.pcm",
  },
  {
    id: "add-dependents",
    text:
      "You can add a family member in the NovaCare app. Open My Policy, choose Add Dependents, and follow the steps. For parent or spouse additions, the app will show any underwriting or premium change before confirmation.",
    audioFile: "novacare-add-dependents-24k.pcm",
  },
  {
    id: "renewals",
    text:
      "Auto-renew is on by default. NovaCare sends an S M S and app notification thirty days before renewal. You can review or change renewal settings in the NovaCare app.",
    audioFile: "novacare-renewals-24k.pcm",
  },
  {
    id: "exclusions",
    text:
      "Cosmetic treatment, non-prescribed supplements, self-inflicted injury, and unapproved experimental treatment are not covered.",
    audioFile: "novacare-exclusions-24k.pcm",
  },
  {
    id: "account-specific",
    text:
      "For account-specific claim status, share your policy ID or claim ID. A specialist can verify the exact account data and follow up with you.",
    audioFile: "novacare-account-specific-24k.pcm",
  },
  {
    id: "out-of-scope",
    text:
      "I don't have that information in this support script. I can help with NovaCare plans, claims, coverage, support, or network hospitals.",
    audioFile: "novacare-out-of-scope-24k.pcm",
  },
  {
    id: "about",
    text:
      "NovaCare is an I R D A I registered health insurer founded in twenty eighteen in Mumbai. It serves two point four million active policyholders across India and has a ninety eight point two percent claim settlement rate.",
    audioFile: "novacare-about-24k.pcm",
  },
  {
    id: "opd",
    text:
      "This support script does not define O P D. It only says NovaCare Standard includes O P D up to ten thousand rupees per year, and Premium includes O P D up to twenty five thousand rupees per year.",
    audioFile: "novacare-opd-24k.pcm",
  },
  {
    id: "critical-illness",
    text:
      "This support script does not define the critical illness rider or list the illnesses. It only says NovaCare Premium includes a critical illness rider.",
    audioFile: "novacare-critical-illness-24k.pcm",
  },
  {
    id: "private-room",
    text:
      "This support script does not define private-room eligibility or room rent rules. It only says NovaCare Premium includes private-room eligibility.",
    audioFile: "novacare-private-room-24k.pcm",
  },
  {
    id: "mobile-app",
    text:
      "Yes. The support script says the NovaCare app is available on i O S and Android. It also says the app supports reimbursement uploads, renewal settings, and adding dependents.",
    audioFile: "novacare-mobile-app-24k.pcm",
  },
  {
    id: "admission-delays",
    text:
      "To reduce admission delays, use a NovaCare network hospital, show your e-card early, and keep your policy ID, government ID, diagnosis note, and admission request ready. The normal cashless pre-auth target is thirty minutes after the hospital sends the request.",
    audioFile: "novacare-admission-delays-24k.pcm",
  },
  {
    id: "hospital-prep",
    text:
      "Before a hospital visit, keep your NovaCare policy ID, e-card, government ID, diagnosis note, and admission request ready. For cashless treatment, confirm the hospital is in the NovaCare network in the app.",
    audioFile: "novacare-hospital-prep-24k.pcm",
  },
] as const;

export const NOVACARE_SAMPLE_CUSTOMERS = [
  {
    name: "Aarav Mehta",
    policyId: "NVC-2048-7731",
    plan: "NovaCare Standard",
    city: "Mumbai",
    hospital: "Fortis Mulund",
    status: "cashless pre-auth approved",
  },
  {
    name: "Priya Nair",
    policyId: "NVC-1039-8842",
    plan: "NovaCare Premium",
    city: "Bengaluru",
    hospital: "Manipal Old Airport Road",
    status: "reimbursement documents pending discharge summary",
  },
] as const;

export const NOVACARE_AGENT_VARIABLES = [
  { name: "policy_id", description: "Customer policy number, for example NVC-2048-7731", source: "MESH" },
  { name: "customer_plan", description: "Current NovaCare plan: Basic, Standard, or Premium", source: "MESH" },
  { name: "city", description: "Customer city used for network hospital lookup", source: "MESH" },
  { name: "hospital_name", description: "Hospital name mentioned by the customer", source: "call" },
  { name: "claim_type", description: "cashless, reimbursement, emergency, or status check", source: "call" },
  { name: "tension_level", description: "Current caller frustration score from zero to ten", source: "PEEK" },
] as const;

type MugaCachedAudioId = typeof MUGA_CACHED_AUDIO[number]["id"];

export const NOVACARE_PROMPT = `You are Priya, the AI support agent for NovaCare, an IRDAI registered health insurance provider in India.

ABOUT NOVACARE:
- Founded in 2018 in Mumbai.
- 2.4 million active policies across India.
- 98.2 percent claim settlement rate.
- Over 10,000 cashless network hospitals.
- 24/7 AI and human support.

PLANS:
- NovaCare Basic: Rs 499 per month. Sum insured: Rs 3 lakh. Covers one adult. Includes hospitalization, ICU, road ambulance up to Rs 2,000 per claim, and one free annual health check.
- NovaCare Standard: Rs 899 per month. Sum insured: Rs 5 lakh. Covers two adults and two children. Includes hospitalization, ICU, OPD up to Rs 10,000 per year, free tele-consultations, and maternity add-on eligibility.
- NovaCare Premium: Rs 1,499 per month. Sum insured: Rs 10 lakh. Covers the full family. Includes OPD up to Rs 25,000 per year, critical illness rider, international emergency support, and private-room eligibility.
- All plans have a 30-day general waiting period.
- Pre-existing conditions are covered after 2 years of continuous NovaCare coverage.
- Maternity add-on costs Rs 199 per month for Standard and Premium and has a 2-year waiting period.

CASHLESS CLAIMS:
- Customer goes to a network hospital and shows the NovaCare e-card.
- Hospital sends pre-auth to NovaCare.
- Normal pre-auth target time is 30 minutes.
- Customer should keep policy ID, e-card, government ID, diagnosis note, and admission request ready.

REIMBURSEMENT CLAIMS:
- Customer pays the hospital first.
- Customer uploads bills, discharge summary, prescriptions, and bank details in the NovaCare app.
- Approved reimbursement is usually paid within 7 working days.

NETWORK HOSPITALS:
- NovaCare has over 10,000 cashless network hospitals across India.
- Example partner groups: Apollo, Fortis, Max, Manipal, Narayana Health, Medanta, and Aster.
- If the caller gives a city or hospital name, explain that Priya can check network availability and guide them to the app confirmation.

SUPPORT:
- Emergency helpline: 1800-668-2273, available 24/7.
- Email: support@novacare.in.
- App: NovaCare app on iOS and Android.
- Live chat: novacare.in/chat.

COMMON ANSWERS:
- Add family member: open the app, go to My Policy, then Add Dependents.
- Renew policy: auto-renew is on by default, with SMS and app reminder 30 days before renewal.
- Coverage limit: Basic has Rs 3 lakh, Standard has Rs 5 lakh, Premium has Rs 10 lakh.
- Exclusions: cosmetic treatment, non-prescribed supplements, self-inflicted injury, and unapproved experimental treatment are not covered.
- Account-specific claims: ask for policy ID or claim ID, then say a specialist can verify exact account data.

VOICE STYLE:
- Speak like a calm human support agent, not a script reader.
- Keep answers short: one to three spoken sentences.
- Use spoken numbers in voice when possible, such as "four hundred ninety nine rupees per month".
- If the caller sounds frustrated, acknowledge it first and then solve.
- Never invent account-specific claim amounts or approvals.
- Never end the call unless the caller clearly says goodbye.`;

/** Built-in NovaCare agent used when the public demo DB row is missing. */
export function getNovaCareFallbackAgent() {
  return {
    id: NOVACARE_AGENT_ID,
    name: "Priya — NovaCare Support",
    status: "live",
    client: "NovaCare",
    description:
      "Handles NovaCare health insurance plan pricing, coverage, cashless claims, reimbursement, waiting periods, renewals, and network hospital support.",
    system_prompt: NOVACARE_PROMPT,
    first_message: NOVACARE_FIRST_MESSAGE,
    llm_model: "gemini-2.5-flash-lite",
  };
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function planByText(text: string) {
  const t = text.toLowerCase();
  if (/\b(better|best|versus|vs\.?|compare|recommend|suggest|downgrade|upgrade|switch|or\s+(?:basic|standard|premium))\b/.test(t)) {
    return null;
  }
  if (/\b(basic|standard|premium)\s+(?:plan|tier|package)\b/.test(t) || /\bnovacare\s+(basic|standard|premium)\b/.test(t)) {
    if (t.includes("basic")) return NOVACARE_PLANS[0];
    if (t.includes("standard")) return NOVACARE_PLANS[1];
    if (t.includes("premium")) return NOVACARE_PLANS[2];
  }
  if (/\b(?:about|explain|describe|details?\s+on|tell\s+me\s+about)\s+(?:the\s+)?(basic|standard|premium)\b/.test(t)) {
    if (t.includes("basic")) return NOVACARE_PLANS[0];
    if (t.includes("standard")) return NOVACARE_PLANS[1];
    if (t.includes("premium")) return NOVACARE_PLANS[2];
  }
  return null;
}

/** Compound or advisory phrasing — never serve a single FAQ clip. */
function isCompoundOrAdvisoryQuestion(text: string): boolean {
  const t = text.toLowerCase();
  if (needsNovaCareBrain(t)) return true;
  return (
    /\b(and also|also\s|as well as|plus\s|before\s+renewal|after\s+renewal|downgrade|upgrade|switch(?:ing)?|versus|vs\.?)\b/.test(t) ||
    /\b(which|what)\s+(?:plan|one)\s+(?:is\s+)?(?:better|best)\b/.test(t) ||
    (/\b(father|mother|parent|child|family)\b/.test(t) && /\b(surgery|operation|procedure|treatment|hospital)\b/.test(t))
  );
}

/**
 * Questions that need Gemini reasoning — not a canned FAQ clip.
 * Compare/advise, medical scenarios, conditionals, and multi-step NovaCare help.
 */
export function needsNovaCareBrain(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;

  if (
    /\b(which|what)\s+(plan|option|one)\s+(is\s+)?(better|best|right|suitable|recommended|worth)\b/.test(t) ||
    /\b(better|best|recommend|suggest|advise|should i|ought to|help me (?:choose|pick|decide|select))\b/.test(t) ||
    /\b(compare|comparison|versus|vs\.?)\b/.test(t) ||
    /\b(difference|differ|different)\s+between\b/.test(t) ||
    /\b(basic|standard|premium)\s+or\s+(basic|standard|premium)\b/.test(t) ||
    /\b(downgrade|upgrade|switch(?:ing)?)\s+(?:from|to)\b/.test(t)
  ) {
    return true;
  }

  if (
    /\b(surgery|operation|procedure|treatment|diagnosis|condition|disease|illness|injury|fracture|pregnant|pregnancy|maternity|cancer|cardiac|heart|knee|hip|dental|hospitalization)\b/.test(t) &&
    /\b(plan|cover|coverage|need|which|better|enough|afford|choose|recommend|suitable|sum insured|limit)\b/.test(t)
  ) {
    return true;
  }

  if (/\b(if\s+(?:i|we|my)|before\s+renewal|mid[- ]?year|while\s+(?:i'm|im|abroad)|what\s+if)\b/.test(t)) {
    return true;
  }

  if (
    /\b(frustrated|angry|upset|annoyed|pending|still waiting)\b/.test(t) &&
    /\b(claim|policy|what should|what do i|help me)\b/.test(t)
  ) {
    return true;
  }

  if (/\bwhy\s+(?:should|would|is|are|not|can't|cant)\b/.test(t)) return true;
  if (/\bhow\s+(?:do i decide|should i choose|would i know|can i tell)\b/.test(t)) return true;
  if (/\bwhat\s+(?:can|do)\s+you\s+(?:do|help(?:\s+with)?)\b/.test(t)) return true;
  if (/\bwhat\s+are\s+you\s+(?:able|capable)\s+to\b/.test(t)) return true;

  if (
    /\b(surgery|operation|procedure|knee|hip|fracture|hospitalization|treatment)\b/.test(t) &&
    /\b(father|mother|parent|child|children|family|needs?|requires?|which|better|standard|premium|basic)\b/.test(t)
  ) {
    return true;
  }

  if (
    /\b(abroad|overseas|international|foreign country|travel(?:ing)?)\b/.test(t) &&
    /\b(plan|cover|coverage|work|valid|better|which|need|often|frequently)\b/.test(t)
  ) {
    return true;
  }

  return false;
}

function planLine(plan: typeof NOVACARE_PLANS[number]): string {
  return `${plan.name} is ${plan.spokenPrice}, with ${plan.sumInsured} sum insured for ${plan.audience}.`;
}

export function isClearlyOutOfScope(text: string): boolean {
  return hasAny(text, [
    "moon",
    "mars",
    "space",
    "alien",
    "cook",
    "cooking",
    "recipe",
    "pasta",
    "pizza",
    "restaurant",
    "car insurance",
    "bike insurance",
    "vehicle insurance",
    "life insurance",
    "stock",
    "crypto",
    "weather",
    "flight",
    "hotel",
    "movie",
    "song",
    "cricket",
    "football",
    "javascript",
    "python",
    "coding",
    "homework",
    "capital of",
    "loan",
    "bank account",
  ]);
}

function isLikelyNovaCareSupportIntent(text: string): boolean {
  return hasAny(text, [
    "novacare",
    "health",
    "insurance",
    "insurer",
    "policy",
    "plan",
    "premium",
    "price",
    "pricing",
    "cost",
    "monthly",
    "coverage",
    "cover",
    "covered",
    "insured",
    "benefit",
    "claim",
    "preauth",
    "pre-auth",
    "pre auth",
    "cashless",
    "reimburse",
    "reimbursement",
    "hospital",
    "network",
    "icu",
    "opd",
    "ambulance",
    "maternity",
    "waiting",
    "pre existing",
    "pre-existing",
    "existing disease",
    "dental",
    "doctor",
    "medicine",
    "surgery",
    "treatment",
    "emergency",
    "support",
    "contact",
    "helpline",
    "email",
    "phone",
    "app",
    "customer",
    "service",
    "add family",
    "family member",
    "dependent",
    "dependents",
    "mother",
    "father",
    "parent",
    "spouse",
    "wife",
    "husband",
    "child",
    "children",
    "renew",
    "renewal",
    "expire",
    "exclude",
    "excluded",
    "not covered",
    "cosmetic",
    "status",
    "account",
    "move",
    "moving",
    "relocate",
    "relocating",
    "shift",
    "shifting",
    "city",
    "pune",
    "chennai",
    "bangalore",
    "bengaluru",
    "mumbai",
    "delhi",
    "hyderabad",
    "valid",
    "active",
    "who are you",
    "what do you",
    "what can you",
    "help",
    "company",
    "about",
  ]);
}

function isSmallTalk(text: string): boolean {
  return /^(hi|hello|hey|thanks|thank you|bye|goodbye)[\s.!?]*$/i.test(text.trim());
}

function isAccountSpecificIntent(text: string): boolean {
  return (
    hasAny(text, ["claim status", "policy id", "claim id", "account", "my claim"]) ||
    /\bmy policy\b.*\b(status|number|id|details|claim|account)\b/i.test(text) ||
    /\b(status|number|id|details)\b.*\b(my policy|my claim|claim|policy)\b/i.test(text)
  );
}

function isRelocationIntent(text: string): boolean {
  const hasMobility = hasAny(text, [
    "move",
    "moving",
    "relocate",
    "relocating",
    "relocated",
    "shift",
    "shifting",
    "transfer",
    "transferred",
    "change city",
    "changed city",
    "new city",
    "different city",
    "another city",
  ]);

  const hasCity = hasAny(text, [
    "pune",
    "chennai",
    "bangalore",
    "bengaluru",
    "mumbai",
    "delhi",
    "hyderabad",
    "kolkata",
    "ahmedabad",
    "jaipur",
    "city",
  ]);

  const hasPolicyContext = hasAny(text, [
    "policy",
    "coverage",
    "cover",
    "covered",
    "network",
    "hospital",
    "cashless",
    "work",
    "valid",
    "active",
  ]);

  const hasValidityQuestion = hasAny(text, ["policy", "coverage", "cover", "covered", "work", "valid", "active"]);

  return (
    (hasMobility && hasPolicyContext) ||
    (hasCity && hasValidityQuestion && /\b(from|to|move|moving|relocate|relocating|shift|new city|different city|another city)\b/i.test(text))
  );
}

function isPlanListIntent(text: string): boolean {
  if (needsNovaCareBrain(text)) return false;
  if (isCompoundOrAdvisoryQuestion(text)) return false;
  if (/\bwhat plans?\b/i.test(text) || /\bplans? do you (offer|have|sell)\b/i.test(text)) return true;
  return (
    hasAny(text, ["plan", "plans", "price", "pricing", "cost", "monthly"]) &&
    hasAny(text, ["offer", "have", "available", "list", "tell", "explain", "what"]) &&
    !/\b(better|best|which|versus|vs|compare|recommend|suggest|downgrade|upgrade|abroad|travel)\b/i.test(text)
  );
}

function isCoverageIntent(text: string): boolean {
  return (
    hasAny(text, ["coverage", "covered", "insured", "limit", "policy limit", "sum insured", "benefit", "benefits"]) ||
    /\bwhat(?:'s| is)?\s+(?:covered|included)\b/i.test(text) ||
    /\bdoes .* cover\b/i.test(text)
  );
}

function isNetworkHospitalIntent(text: string): boolean {
  return (
    hasAny(text, ["network hospital", "network hospitals", "hospital network", "cashless hospital", "cashless hospitals"]) ||
    hasAny(text, ["fortis", "apollo", "max", "manipal", "medanta", "narayana", "aster"]) ||
    /\b(hospital|hospitals|network)\b.*\b(pune|chennai|bangalore|bengaluru|mumbai|delhi|hyderabad|kolkata|ahmedabad|jaipur)\b/i.test(text) ||
    /\b(pune|chennai|bangalore|bengaluru|mumbai|delhi|hyderabad|kolkata|ahmedabad|jaipur)\b.*\b(hospital|hospitals|network)\b/i.test(text) ||
    (hasAny(text, ["hospital", "hospitals", "network"]) && !hasAny(text, ["claim", "claims", "preauth", "pre-auth", "pre auth", "reimburse", "reimbursement"]))
  );
}

function isClaimProcessIntent(text: string): boolean {
  return (
    hasAny(text, ["claim", "claims", "preauth", "pre-auth", "pre auth", "cashless claim", "cashless claims"]) ||
    /\b(hospital|admission|admit)\b.*\b(approval|preauth|claim)\b/i.test(text)
  ) && !isAccountSpecificIntent(text);
}

function isReimbursementIntent(text: string): boolean {
  return hasAny(text, ["reimburse", "reimbursement", "paid back", "pay first", "paid first", "upload", "bills", "discharge summary", "bank details"]);
}

function isDependentIntent(text: string): boolean {
  return hasAny(text, ["add family", "family member", "dependent", "dependents", "mother", "father", "parent", "spouse", "wife", "husband", "child", "children"]);
}

function isRenewalIntent(text: string): boolean {
  if (needsNovaCareBrain(text)) return false;
  return (
    hasAny(text, ["renew", "renewal", "auto renew", "auto-renew", "expire", "expiry"]) &&
    !/\b(before|after|if|can i|should i|downgrade|upgrade|switch|versus|vs)\b/i.test(text)
  );
}

function isWaitingIntent(text: string): boolean {
  return hasAny(text, ["waiting", "pre existing", "pre-existing", "existing disease", "maternity"]);
}

function isExclusionIntent(text: string): boolean {
  return hasAny(text, ["exclude", "excluded", "exclusion", "exclusions", "not covered", "cosmetic"]);
}

function isSupportIntent(text: string): boolean {
  return hasAny(text, ["phone", "email", "support", "contact", "emergency", "helpline", "number", "chat"]);
}

function isAboutIntent(text: string): boolean {
  return hasAny(text, ["who are you", "about", "company", "novacare"]);
}

export function cachedAudioText(id: MugaCachedAudioId): string {
  return MUGA_CACHED_AUDIO.find((item) => item.id === id)?.text ?? "";
}

/** FAQ clips used for instant Mulberry/MUGA playback (excludes short bridge leads). */
export const NOVACARE_FAQ_AUDIO = MUGA_CACHED_AUDIO.filter(
  (item) => !item.id.startsWith("lead-")
);

export function mulberryFaqAudioFile(id: string): string {
  return `mulberry-${id}-24k.pcm`;
}

function cachedIntentIdForQuestion(text: string): MugaCachedAudioId | null {
  if (needsNovaCareBrain(text)) return null;
  if (isCompoundOrAdvisoryQuestion(text)) return null;

  const selectedPlan = planByText(text);
  if (selectedPlan && hasAny(text, ["price", "cost", "coverage", "cover", "insured", "benefit", "include", "plan", "about", "explain", "describe"])) {
    if (selectedPlan.name.endsWith("Basic")) return "plan-basic";
    if (selectedPlan.name.endsWith("Standard")) return "plan-standard";
    if (selectedPlan.name.endsWith("Premium")) return "plan-premium";
  }

  if (/\b(opd|outpatient)\b/.test(text) && !/\b(and|also|abroad|travel|versus|vs|better|which|surgery|downgrade|upgrade)\b/.test(text)) {
    return "opd";
  }
  if (/\bcritical illness|critical rider|illness rider|rider\b/.test(text)) return "critical-illness";
  if (/\b(room eligibility|private room|room eligible|room rent|private-room)\b/.test(text)) return "private-room";
  if (/\b(android|ios|iphone|app)\b/.test(text) && /\b(use|available|download|phone|mobile|install|login|access)\b/.test(text)) {
    return "mobile-app";
  }
  if (
    /\b(delay|delays|faster|fast|speed|reduce|avoid)\b/.test(text) &&
    /\b(admission|preauth|pre-auth|cashless|hospital)\b/.test(text)
  ) {
    return "admission-delays";
  }
  if (/\b(prepare|ready|carry|keep)\b/.test(text) && /\b(doctor|admission|hospital|visit)\b/.test(text)) {
    return "hospital-prep";
  }
  if (isRelocationIntent(text)) return "relocation";
  if (hasAny(text, ["again", "repeat", "say that", "one more time"])) return "plans";
  if (isAccountSpecificIntent(text)) return "account-specific";
  if (isReimbursementIntent(text)) return "reimbursement";
  if (isClaimProcessIntent(text)) return "claims";
  if (isNetworkHospitalIntent(text)) return "network-hospitals";
  if (isPlanListIntent(text)) return "plans";
  if (isDependentIntent(text)) return "add-dependents";
  if (isRenewalIntent(text)) return "renewals";
  if (isWaitingIntent(text)) return "waiting";
  if (isExclusionIntent(text)) return "exclusions";
  if (isCoverageIntent(text)) return "coverage";
  if (isSupportIntent(text)) return "support";
  if (isAboutIntent(text)) return "about";

  return null;
}

export function normalizeMugaCacheText(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\s*\[\[voice:[^\]]+\]\]\s*/i, "")
    .replace(/^\s*\[(neutral|happy|sad|excited|angry|whisper)\]\s*/i, "")
    .replace(/<(laugh|sigh|hmm|pause|breathe)>/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cachedMugaAudioForText(text: string): typeof MUGA_CACHED_AUDIO[number] | null {
  const key = normalizeMugaCacheText(text);
  return MUGA_CACHED_AUDIO.find((item) => normalizeMugaCacheText(item.text) === key) ?? null;
}

/** Exact canned FAQ clip only — never the generic out-of-scope fallback. */
export function novaCareFaqCacheAnswer(userText: string): string {
  const text = userText.toLowerCase();
  if (!text.trim()) return "";
  if (needsNovaCareBrain(text)) return "";
  const intentId = cachedIntentIdForQuestion(text);
  return intentId ? cachedAudioText(intentId) : "";
}

export function answerNovaCareQuestion(userText: string): string {
  const text = userText.toLowerCase();
  if (!text.trim()) return "";
  if (isClearlyOutOfScope(text)) return cachedAudioText("out-of-scope");
  if (needsNovaCareBrain(text)) return "";
  return novaCareFaqCacheAnswer(userText);
}

/** Instant spoken reply for greetings — no FAQ clip, no Gemini wait. */
export function novaCareConversationalReply(userText: string): string {
  const t = userText.trim();
  if (/^(hi|hello|hey|good morning|good evening)[\s.!?]*$/i.test(t)) {
    return "Hi! What would you like to check — plans, claims, coverage, or network hospitals?";
  }
  if (/^(thanks|thank you)[\s.!?]*$/i.test(t)) {
    return "Glad to help. What else would you like me to check?";
  }
  if (/^(bye|goodbye|see you)[\s.!?]*$/i.test(t)) {
    return "Take care. Reach out anytime if you need NovaCare support.";
  }
  return "";
}

/** Route to Gemini when there is no exact canned FAQ clip to play. */
export function shouldRouteNovaCareToGemini(userText: string): boolean {
  const text = userText.toLowerCase().trim();
  if (!text) return false;
  if (isClearlyOutOfScope(text)) return false;
  if (novaCareConversationalReply(userText)) return false;
  if (needsNovaCareBrain(text)) return true;
  if (novaCareFaqCacheAnswer(userText)) return false;
  return true;
}
