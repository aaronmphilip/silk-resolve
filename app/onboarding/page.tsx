"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const USE_CASES = [
  { id: "healthcare", label: "Healthcare", sub: "Billing disputes, report delays, appointment support" },
  { id: "aviation", label: "Aviation & Travel", sub: "Rebooking, refunds, compensation claims" },
  { id: "banking", label: "Banking & Finance", sub: "Fee waivers, balance queries, fraud checks" },
  { id: "ecommerce", label: "E-commerce", sub: "Returns, refunds, delivery issues" },
  { id: "telecom", label: "Telecom", sub: "Plan changes, billing, network complaints" },
  { id: "custom", label: "Custom", sub: "Define your own resolution workflows" },
];

const VIBES = [
  { id: "protective", label: "Protective", desc: "Warm, empathetic. Prioritises emotional comfort. Hinglish-capable." },
  { id: "professional", label: "Professional", desc: "Formal, precise. Respects time. Minimal small talk." },
  { id: "casual", label: "Casual", desc: "Friendly, light. Uses humour when tension is low." },
];

const LANGUAGES = ["Hinglish (hi-IN / en-IN)", "Hindi (hi-IN)", "English (en-IN)", "Tamil (ta-IN)", "Telugu (te-IN)", "Marathi (mr-IN)"];

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [company, setCompany] = useState({ name: "", website: "", about: "", teamSize: "" });
  // Step 2
  const [useCase, setUseCase] = useState("");
  // Step 3
  const [agent, setAgent] = useState({ name: "", vibe: "", language: "" });

  const setCompanyField = (k: keyof typeof company) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCompany((c) => ({ ...c, [k]: e.target.value }));

  async function finish() {
    setLoading(true);
    const supabase = createClient();

    // Get current user + their tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (profile?.tenant_id) {
        // Update tenant with company info from onboarding
        await supabase.from("tenants").update({
          name: company.name || undefined,
        }).eq("id", profile.tenant_id);

        // Create first agent if agent name was set
        if (agent.name) {
          await supabase.from("agents").insert({
            tenant_id: profile.tenant_id,
            name: agent.name,
            client: company.name,
            status: "draft",
            node_count: 0,
            pillars: ["PEEK", "MESH", "SILK"],
            description: `${agent.vibe} agent for ${useCase} resolution.`,
            total_calls: 0,
            calls_today: 0,
            empathy_score: 0,
            avg_handle_time: "—",
            resolved_rate: 0,
            last_active: "never",
          });
        }
      }
    }

    setLoading(false);
    router.push("/");
  }

  const stepLabel = ["company info", "use case", "first agent", "go live"];
  const canProceed = [
    company.name && company.about,
    !!useCase,
    agent.name && agent.vibe && agent.language,
    true,
  ][step - 1];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f0ebe0", backgroundImage: "radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)", backgroundSize: "22px 22px" }}>
      {/* Top bar */}
      <div className="border-b border-black px-8 py-4 flex items-center justify-between bg-[#f0ebe0]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 border border-black rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold font-mono">SR</span>
          </div>
          <span className="font-bold text-sm">silk resolver</span>
        </div>
        <div className="flex items-center gap-1">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`flex items-center justify-center w-6 h-6 border text-[10px] font-mono transition-all ${
                s < step ? "bg-black text-[#f0ebe0] border-black" : s === step ? "border-black font-bold" : "border-black/20 opacity-30"
              }`}>
                {s < step ? <Check size={10} /> : s}
              </div>
              {s < 4 && <div className={`w-8 h-px ${s < step ? "bg-black" : "bg-black/15"}`} />}
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest">{stepLabel[step - 1]}</p>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-16 pb-8">
        <div className="w-full max-w-xl">

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div className="mb-8">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">step 1 / 4</p>
                <h1 className="text-3xl font-bold tracking-tight">tell us about your company.</h1>
                <p className="text-sm opacity-40 mt-1">This shapes how your agents communicate and what they know.</p>
              </div>
              <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)] p-6 space-y-4">
                {[
                  { key: "name", label: "company name", type: "input", placeholder: "Apollo Healthcare" },
                  { key: "website", label: "website", type: "input", placeholder: "https://apollo.com" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">{label}</label>
                    <input value={company[key as keyof typeof company]} onChange={setCompanyField(key as keyof typeof company)} placeholder={placeholder}
                      className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">what does your company do?</label>
                  <textarea value={company.about} onChange={setCompanyField("about")} placeholder="We are a multi-specialty hospital network. Our Tier-1 support handles billing, reports, and appointment queries..."
                    rows={3} className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">support team size</label>
                  <select value={company.teamSize} onChange={setCompanyField("teamSize")}
                    className="w-full border border-black bg-[#f0ebe0] px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none">
                    <option value="">select range</option>
                    {["1–10", "10–50", "50–200", "200–1000", "1000+"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div className="mb-8">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">step 2 / 4</p>
                <h1 className="text-3xl font-bold tracking-tight">what are you resolving?</h1>
                <p className="text-sm opacity-40 mt-1">Pick your primary use case. You can add more later.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {USE_CASES.map((uc) => (
                  <button key={uc.id} onClick={() => setUseCase(uc.id)}
                    className={`text-left border p-4 transition-all ${useCase === uc.id ? "border-black bg-black/5 shadow-[2px_2px_0px_rgba(0,0,0,0.85)]" : "border-black/30 hover:border-black"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-bold">{uc.label}</p>
                      {useCase === uc.id && <Check size={12} />}
                    </div>
                    <p className="text-[11px] opacity-45 leading-snug">{uc.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <div className="mb-8">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">step 3 / 4</p>
                <h1 className="text-3xl font-bold tracking-tight">create your first agent.</h1>
                <p className="text-sm opacity-40 mt-1">You'll write the full script in the dashboard. First, give it an identity.</p>
              </div>
              <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)] p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">agent name</label>
                  <input value={agent.name} onChange={(e) => setAgent((a) => ({ ...a, name: e.target.value }))} placeholder="e.g. MedCore Billing, FlightCare Pro"
                    className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-2 uppercase tracking-widest">companion vibe</label>
                  <div className="space-y-2">
                    {VIBES.map((v) => (
                      <button key={v.id} onClick={() => setAgent((a) => ({ ...a, vibe: v.id }))}
                        className={`w-full text-left border p-3.5 transition-all flex items-start justify-between gap-3 ${agent.vibe === v.id ? "border-black bg-black/5" : "border-black/25 hover:border-black"}`}>
                        <div>
                          <p className="text-sm font-bold mb-0.5">{v.label}</p>
                          <p className="text-[11px] opacity-45">{v.desc}</p>
                        </div>
                        {agent.vibe === v.id && <Check size={12} className="flex-shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">primary language</label>
                  <select value={agent.language} onChange={(e) => setAgent((a) => ({ ...a, language: e.target.value }))}
                    className="w-full border border-black bg-[#f0ebe0] px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none">
                    <option value="">select language</option>
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <div className="mb-8">
                <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">step 4 / 4</p>
                <h1 className="text-3xl font-bold tracking-tight">you're ready.</h1>
                <p className="text-sm opacity-40 mt-1">Your agent infrastructure is provisioned. Here's what happens next.</p>
              </div>
              <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)]">
                {[
                  { num: "01", title: "Write your script", desc: "Go to Scripts → build your agent's system prompt, tools, and escalation rules. This is what your agent knows and does." },
                  { num: "02", title: "Connect your database", desc: "Go to Integrations → add your CRM or internal API. Your agent will call these tools mid-conversation to look up real customer data." },
                  { num: "03", title: "Activate your agent", desc: "Once your script is ready, hit Activate. Your agent goes live on the phone number assigned to your account." },
                  { num: "04", title: "Watch it work", desc: "Open Observer to watch live calls. Every PEEK, MESH, and SILK event fires in real time. Every call logged to dashboard." },
                ].map((item, i, arr) => (
                  <div key={item.num} className={`px-6 py-5 flex gap-5 ${i < arr.length - 1 ? "border-b border-black" : ""}`}>
                    <span className="text-2xl font-bold font-mono opacity-15 flex-shrink-0 w-8">{item.num}</span>
                    <div>
                      <p className="font-bold text-sm mb-1">{item.title}</p>
                      <p className="text-xs opacity-50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button onClick={() => setStep((s) => (s - 1) as Step)} className="flex items-center gap-2 text-sm font-mono opacity-40 hover:opacity-80 transition-opacity">
                <ArrowLeft size={13} /> back
              </button>
            ) : <div />}
            {step < 4 ? (
              <button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed}
                className="flex items-center gap-2 bg-black text-[#f0ebe0] px-6 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-30">
                continue <ArrowRight size={13} />
              </button>
            ) : (
              <button onClick={finish} disabled={loading}
                className="flex items-center gap-2 bg-black text-[#f0ebe0] px-6 py-2.5 text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50">
                {loading ? <span className="font-mono text-xs animate-pulse">setting up...</span> : <><span>open dashboard</span><ArrowRight size={13} /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
