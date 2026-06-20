export type NovaCareDemoRoute = "cached" | "gemini" | "gemini-advisory";

export type NovaCareDemoQuestion = {
  label: string;
  text: string;
  route: NovaCareDemoRoute;
};

/** Cached Mulberry/MUGA clips — target sub-100ms first audio. */
export const NOVACARE_CACHED_DEMO_QUESTIONS: NovaCareDemoQuestion[] = [
  { label: "Plans", text: "What plans do you offer?", route: "cached" },
  { label: "OPD", text: "Does NovaCare cover OPD?", route: "cached" },
  { label: "Claims", text: "How do cashless claims work?", route: "cached" },
];

/** Cold-start Gemini — no FAQ clip, no contextual shortcut. */
export const NOVACARE_GEMINI_DEMO_QUESTIONS: NovaCareDemoQuestion[] = [
  { label: "Compare plans", text: "Compare Basic and Premium for a family of four.", route: "gemini" },
  { label: "Best for couple", text: "Which plan is better for a couple with one child?", route: "gemini" },
  { label: "Difference", text: "What's the difference between Standard and Premium?", route: "gemini" },
  { label: "Why Premium", text: "Why should I choose Premium over Standard?", route: "gemini" },
  { label: "How to choose", text: "How should I choose between the three plans?", route: "gemini" },
  { label: "Self-employed", text: "Recommend a plan for a self-employed person with no dependents.", route: "gemini" },
  {
    label: "Frustrated claim",
    text: "I'm frustrated — my reimbursement claim is still pending. What should I do?",
    route: "gemini",
  },
];

/**
 * Advisory phrasing that can be answered locally when spoken naturally.
 * Demo buttons force Gemini so you can compare uncached brain latency/quality.
 */
export const NOVACARE_GEMINI_ADVISORY_DEMO_QUESTIONS: NovaCareDemoQuestion[] = [
  { label: "Abroad", text: "I'm going abroad, which plan will be great?", route: "gemini-advisory" },
  { label: "Downgrade", text: "Can I downgrade from Premium to Basic before renewal?", route: "gemini-advisory" },
  { label: "Knee surgery", text: "My father needs knee surgery — which plan is enough?", route: "gemini-advisory" },
  { label: "What can you do", text: "What can you help me with?", route: "gemini-advisory" },
];

export const NOVACARE_DEMO_CATEGORIES = [
  { id: "cached" as const, title: "Cached", hint: "instant FAQ clip", questions: NOVACARE_CACHED_DEMO_QUESTIONS },
  { id: "gemini" as const, title: "Gemini uncached", hint: "live brain", questions: NOVACARE_GEMINI_DEMO_QUESTIONS },
  {
    id: "gemini-advisory" as const,
    title: "Gemini advisory",
    hint: "forces brain (not local shortcut)",
    questions: NOVACARE_GEMINI_ADVISORY_DEMO_QUESTIONS,
  },
];

export const NOVACARE_DEMO_QUESTIONS: NovaCareDemoQuestion[] = [
  ...NOVACARE_CACHED_DEMO_QUESTIONS,
  ...NOVACARE_GEMINI_DEMO_QUESTIONS,
  ...NOVACARE_GEMINI_ADVISORY_DEMO_QUESTIONS,
];

/** @deprecated Use NOVACARE_DEMO_CATEGORIES — kept for imports that expect the old shape. */
export const MUGA_DEMO_QUESTIONS = [
  { label: "Plans (cached)", text: "What plans do you offer?" },
  { label: "OPD (cached)", text: "Does NovaCare cover OPD?" },
  { label: "Compare (Gemini)", text: "Compare Basic and Premium for a family of four." },
] as const;

export function demoQuestionForceBrain(question: NovaCareDemoQuestion): boolean {
  return question.route === "gemini" || question.route === "gemini-advisory";
}