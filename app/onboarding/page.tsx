"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const INDUSTRIES = [
  { id: "healthcare",  label: "Healthcare",        sub: "Billing, reports, appointments" },
  { id: "ecommerce",   label: "E-commerce",         sub: "Orders, returns, refunds" },
  { id: "banking",     label: "Banking & Finance",  sub: "Fees, fraud, account queries" },
  { id: "telecom",     label: "Telecom",            sub: "Plans, billing, complaints" },
  { id: "aviation",    label: "Travel & Aviation",  sub: "Rebooking, refunds, claims" },
  { id: "other",       label: "Other",              sub: "Custom workflows" },
];

const LANGUAGES = [
  { id: "Hinglish (hi-IN / en-IN)", label: "Hinglish", sub: "Hindi + English code-switch" },
  { id: "Hindi (hi-IN)",            label: "Hindi",    sub: "Full Hindi" },
  { id: "English (en-IN)",          label: "English",  sub: "Indian English" },
  { id: "Tamil (ta-IN)",            label: "Tamil",    sub: "" },
  { id: "Telugu (te-IN)",           label: "Telugu",   sub: "" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [company, setCompany] = useState({ name: "", about: "", industry: "", language: "English (en-IN)" });

  const canContinue = company.name.trim() && company.industry;

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profile?.tenant_id) {
        await supabase
          .from("tenants")
          .update({
            name: company.name.trim(),
            industry: company.industry,
            default_language: company.language,
          })
          .eq("id", profile.tenant_id);
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#e8dece] flex flex-col" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>

      {/* Top bar */}
      <div className="border-b-2 border-black px-6 py-4 bg-[#e8dece] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">✳</span>
          <span className="font-bold text-sm tracking-tight">silk resolve</span>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {[1, 2].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${s <= step ? "bg-black" : "bg-black/20"}`} />
          ))}
        </div>
        <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest">
          {step === 1 ? "your company" : "you're set"}
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-12">
        <div className="w-full max-w-lg">

          {/* ── Step 1: Company setup ── */}
          {step === 1 && (
            <div>
              <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-2">1 / 2</p>
              <h1 className="text-3xl font-bold tracking-tight mb-1">tell us about your company.</h1>
              <p className="text-sm text-black/50 mb-8">This is used to personalise your agents. You won&apos;t be asked again.</p>

              <div className="space-y-5">
                {/* Company name */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">Company name <span className="text-red-500">*</span></label>
                  <input
                    value={company.name}
                    onChange={e => setCompany(c => ({ ...c, name: e.target.value }))}
                    placeholder="e.g. Apollo Healthcare, Meesho, IndiGo"
                    className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-mono placeholder:text-black/30 focus:outline-none focus:shadow-[3px_3px_0px_rgba(0,0,0,0.85)]"
                  />
                </div>

                {/* What do you do */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-1.5">What does your support team handle? <span className="text-black/30">(optional)</span></label>
                  <textarea
                    value={company.about}
                    onChange={e => setCompany(c => ({ ...c, about: e.target.value }))}
                    placeholder="e.g. Billing disputes, refund requests, delivery issues — mostly inbound from mobile app users..."
                    rows={3}
                    className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-mono placeholder:text-black/30 focus:outline-none focus:shadow-[3px_3px_0px_rgba(0,0,0,0.85)] resize-none"
                  />
                  <p className="text-[10px] text-black/40 mt-1">AI uses this to write your agent&apos;s first system prompt.</p>
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-2">Industry <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INDUSTRIES.map(ind => (
                      <button
                        key={ind.id}
                        type="button"
                        onClick={() => setCompany(c => ({ ...c, industry: ind.id }))}
                        className={`text-left border-2 px-3 py-3 transition-all ${company.industry === ind.id ? "border-black bg-black text-[#e8dece]" : "border-black/25 bg-white hover:border-black"}`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-xs font-bold ${company.industry === ind.id ? "text-[#e8dece]" : "text-black"}`}>{ind.label}</p>
                          {company.industry === ind.id && <Check size={11} className="text-[#e8dece]" />}
                        </div>
                        <p className={`text-[10px] leading-snug ${company.industry === ind.id ? "text-[#e8dece]/60" : "text-black/40"}`}>{ind.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-xs font-semibold text-black mb-2">Default call language</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setCompany(c => ({ ...c, language: lang.id }))}
                        className={`border-2 px-3 py-2 text-xs font-mono transition-all ${company.language === lang.id ? "border-black bg-black text-[#e8dece]" : "border-black/25 bg-white hover:border-black"}`}
                      >
                        {lang.label}
                        {lang.sub && <span className={`ml-1.5 text-[10px] ${company.language === lang.id ? "text-[#e8dece]/60" : "text-black/40"}`}>{lang.sub}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canContinue}
                className="mt-8 flex items-center gap-2 bg-black text-[#e8dece] px-8 py-3.5 text-sm font-bold hover:bg-black/80 transition-colors disabled:opacity-30"
              >
                continue <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* ── Step 2: Done ── */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-black bg-black flex items-center justify-center mx-auto mb-6">
                <Check size={28} className="text-[#e8dece]" />
              </div>
              <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-2">2 / 2</p>
              <h1 className="text-3xl font-bold tracking-tight mb-2">you&apos;re all set.</h1>
              <p className="text-sm text-black/50 mb-10 max-w-sm mx-auto">
                Your workspace is ready. Head to the dashboard and create your first agent — it takes under 2 minutes.
              </p>

              <div className="border-2 border-black bg-white text-left mb-8 divide-y-2 divide-black">
                {[
                  { done: true,  label: "Company profile",         hint: company.name },
                  { done: false, label: "Create your first agent", hint: "2 min → AI writes the prompt" },
                  { done: false, label: "Add API keys",            hint: "VAPI_PRIVATE_KEY + GEMINI_API_KEY in Vercel env vars" },
                  { done: false, label: "Test with Talk button",   hint: "Browser call, no phone needed" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 ${item.done ? "bg-black border-black" : "border-black/30"}`}>
                      {item.done && <Check size={11} className="text-[#e8dece]" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${item.done ? "line-through text-black/40" : "text-black"}`}>{item.label}</p>
                      <p className="text-[11px] text-black/40 mt-0.5">{item.hint}</p>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs font-mono text-red-700 mb-4">{error}</p>}

              <button
                onClick={finish}
                disabled={saving}
                className="flex items-center gap-2 bg-black text-[#e8dece] px-10 py-4 text-sm font-bold hover:bg-black/80 transition-colors disabled:opacity-50 mx-auto"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "setting up..." : "go to dashboard"} {!saving && <ArrowRight size={14} />}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
