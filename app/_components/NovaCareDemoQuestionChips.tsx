import {
  NOVACARE_DEMO_CATEGORIES,
  demoQuestionForceBrain,
  type NovaCareDemoQuestion,
} from "@/lib/novacare-demo-questions";

type NovaCareDemoQuestionChipsProps = {
  disabled?: boolean;
  active?: boolean;
  accentColor?: string;
  variant?: "light" | "dark";
  onSelect: (question: NovaCareDemoQuestion) => void;
};

const categoryAccent: Record<string, { light: string; dark: string }> = {
  cached: { light: "border-emerald-200 text-emerald-700 bg-emerald-50", dark: "border-emerald-400/35 text-emerald-200 bg-emerald-400/10" },
  gemini: { light: "border-violet-200 text-violet-700 bg-violet-50", dark: "border-violet-400/35 text-violet-200 bg-violet-400/10" },
  "gemini-advisory": { light: "border-amber-200 text-amber-800 bg-amber-50", dark: "border-amber-400/35 text-amber-200 bg-amber-400/10" },
};

export default function NovaCareDemoQuestionChips({
  disabled = false,
  active = true,
  variant = "light",
  onSelect,
}: NovaCareDemoQuestionChipsProps) {
  const inactive = disabled || !active;

  return (
    <div className="space-y-3">
      {NOVACARE_DEMO_CATEGORIES.map((category) => (
        <div key={category.id}>
          <div className="flex items-baseline gap-2 mb-1.5">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                variant === "dark" ? "text-[#f0ebe0]/45" : "text-gray-400"
              }`}
            >
              {category.title}
            </p>
            <p className={`text-[10px] ${variant === "dark" ? "text-[#f0ebe0]/30" : "text-gray-400"}`}>
              {category.hint}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {category.questions.map((question) => {
              const accent = categoryAccent[category.id][variant];
              const forceBrain = demoQuestionForceBrain(question);
              return (
                <button
                  key={question.text}
                  type="button"
                  disabled={inactive}
                  title={question.text}
                  onClick={() => onSelect({ ...question })}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-opacity disabled:opacity-35 ${accent}`}
                >
                  {question.label}
                  {forceBrain ? " · Gemini" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}