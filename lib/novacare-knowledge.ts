export const NOVACARE_AGENT_ID = "agt-856e6f5e-1851-4041-a4f5-9f5ee62c0793";

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

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function planByText(text: string) {
  if (text.includes("basic")) return NOVACARE_PLANS[0];
  if (text.includes("standard")) return NOVACARE_PLANS[1];
  if (text.includes("premium")) return NOVACARE_PLANS[2];
  return null;
}

function planLine(plan: typeof NOVACARE_PLANS[number]): string {
  return `${plan.name} is ${plan.spokenPrice}, with ${plan.sumInsured} sum insured for ${plan.audience}.`;
}

export function answerNovaCareQuestion(userText: string): string {
  const text = userText.toLowerCase();
  if (!text.trim()) return "";

  const selectedPlan = planByText(text);
  if (selectedPlan && hasAny(text, ["price", "cost", "premium", "coverage", "cover", "insured", "benefit", "include", "plan"])) {
    return `${planLine(selectedPlan)} It includes ${selectedPlan.highlights.slice(0, 3).join(", ")}.`;
  }

  if (hasAny(text, ["again", "repeat", "say that", "one more time"])) {
    return `Sure. Basic is ${NOVACARE_PLANS[0].spokenPrice}, Standard is ${NOVACARE_PLANS[1].spokenPrice}, and Premium is ${NOVACARE_PLANS[2].spokenPrice}.`;
  }

  if (hasAny(text, ["plan", "plans", "price", "pricing", "cost", "premium", "monthly", "compare"])) {
    return `${planLine(NOVACARE_PLANS[0])} ${planLine(NOVACARE_PLANS[1])} ${planLine(NOVACARE_PLANS[2])} For most families, Standard is the practical starting point.`;
  }

  if (hasAny(text, ["coverage", "cover", "covered", "insured", "limit", "policy limit", "sum insured"])) {
    return `Basic covers ${NOVACARE_PLANS[0].sumInsured}, Standard covers ${NOVACARE_PLANS[1].sumInsured}, and Premium covers ${NOVACARE_PLANS[2].sumInsured}. Hospitalization, I C U, ambulance, and annual health check are included across all plans.`;
  }

  if (hasAny(text, ["network", "hospital", "cashless", "fortis", "apollo", "max", "manipal", "medanta", "narayana", "aster"])) {
    return `${NOVACARE_FACTS.hospitals} For a cashless claim, show your NovaCare e-card and the hospital sends pre-auth to NovaCare.`;
  }

  if (hasAny(text, ["claim", "claims", "preauth", "pre-auth", "pre auth", "cashless"])) {
    return `${NOVACARE_FACTS.cashless} Keep the policy ID, e-card, government ID, diagnosis note, and admission request ready.`;
  }

  if (hasAny(text, ["reimburse", "reimbursement", "paid back", "upload", "bills"])) {
    return NOVACARE_FACTS.reimbursement;
  }

  if (hasAny(text, ["waiting", "pre existing", "pre-existing", "existing disease", "maternity"])) {
    return `${NOVACARE_FACTS.waiting} ${NOVACARE_FACTS.maternity}`;
  }

  if (hasAny(text, ["exclude", "excluded", "not covered", "cosmetic"])) {
    return NOVACARE_FACTS.exclusions;
  }

  if (hasAny(text, ["renew", "renewal", "auto renew", "expire"])) {
    return NOVACARE_FACTS.renewals;
  }

  if (hasAny(text, ["phone", "email", "support", "contact", "emergency", "helpline", "number"])) {
    return `${NOVACARE_FACTS.emergency} You can also use app chat or email support at support at novacare dot in.`;
  }

  if (hasAny(text, ["who are you", "about", "company", "novacare"])) {
    return `${NOVACARE_FACTS.about} ${NOVACARE_FACTS.claimRate}`;
  }

  return "";
}
