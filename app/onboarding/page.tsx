"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";
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
type GenState = "idle" | "generating" | "done" | "error";

const BG = "#e8dece";
const DOTS = "radial-gradient(rgba(0,0,0,0.12) 1px, transparent 1px)";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [genState, setGenState] = useState<GenState>("idle");
  const [genStep, setGenStep] = useState("");
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [genError, setGenError] = useState("");

  const [company, setCompany] = useState({ name: "", website: "", about: "", teamSize: "" });
  const [useCase, setUseCase] = useState("");
  const [agent, setAgent] = useState({ name: "", vibe: "", language: "" });

  const setCompanyField = (k: keyof typeof company) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setCompany((c) => ({ ...c, [k]: e.target.value }));

  async function generateAndLaunch() {
    setGenState("generating");
    setGenError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not authenticated");

      // Update tenant name
      setGenStep("provisioning your workspace...");
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).single();
      if (profile?.tenant_id && company.name) {
        await supabase.from("tenants").update({ name: company.name }).eq("id", profile.tenant_id);
      }

      // Create agent via API
      setGenStep("creating your agent...");
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agent.name,
          client: company.name,
          status: "draft",
          pillars: ["PEEK", "MESH", "SILK"],
          description: `${agent.vibe} agent for ${useCase} resolution.`,
        }),
      });

      if (!agentRes.ok) throw new Error("failed to create agent");
      const agentData = await agentRes.json();
      const agentId = agentData.id;

      // Generate script with AI
      setGenStep("generating script with AI...");
      const aiRes = await fetch("/api/ai/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: company.name,
          industry: useCase,
          useCase: `${useCase} customer support and resolution`,
          agentName: agent.name,
          vibe: agent.vibe,
          language: agent.language,
          about: company.about,
        }),
      });

      let scriptConfig: Record<string, unknown> = {
        systemPrompt: `You are ${agent.name}, a ${agent.vibe} AI agent for ${company.name}. Your goal is to resolve customer issues with empathy and efficiency.`,
        companionVibe: agent.vibe,
        language: agent.language,
        preferredAddress: "Sir/Ma'am",
        linguisticNotes: "Be empathetic and clear. Escalate when tension is high.",
        tools: [
          { id: "bt-001", name: "escalate_to_human", description: "Transfer to human agent", source: "builtin", enabled: true, params: ["reason", "priority"] },
          { id: "bt-002", name: "send_confirmation", description: "Send confirmation to customer", source: "builtin", enabled: true, params: ["customer_id", "message"] },
          { id: "bt-004", name: "log_complaint", description: "Log formal complaint", source: "builtin", enabled: true, params: ["customer_id", "description", "category"] },
        ],
        escalationRules: [
          { id: "er-001", trigger: "sentiment_drop", condition: "tension_level >= 8 for 2+ turns", action: "escalate_human" },
          { id: "er-002", trigger: "legal_threat", condition: "customer mentions legal action", action: "escalate_human" },
        ],
        noGoTopics: ["competitor pricing", "internal processes"],
      };

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        if (aiData.systemPrompt) scriptConfig = { ...scriptConfig, ...aiData };
      }

      // Save script to DB
      setGenStep("saving your script...");
      const scriptRes = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          agentName: agent.name,
          name: `${agent.name} — ${useCase} script`,
          version: 1,
          status: "draft",
          ...scriptConfig,
        }),
      });

      if (!scriptRes.ok) throw new Error("failed to save script");
      const scriptData = await scriptRes.json();
      setScriptId(scriptData.id);
      setGenState("done");
    } catch (err) {
      console.error(err);
      setGenError(err instanceof Error ? err.message : "something went wrong");
      setGenState("error");
    }
  }

  const stepLabel = ["company info", "use case", "first agent", "go live"];
  const canProceed = [
    company.name && company.about,
    !!useCase,
    agent.name && agent.vibe && agent.language,
    true,
  ][step - 1];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: BG, backgroundImage: DOTS, backgroundSize: "22px 22px" }}>
      {/* Top bar */}
      <div className="border-b border-black px-8 py-4 flex items-center justify-between" style={{ backgroundColor: BG }}>
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">✳</span>
          <span className="font-bold text-sm tracking-tight">silk resolve</span>
        </div>
        <div className="flex items-center gap-1">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`flex items-center justify-center w-6 h-6 border text-[10px] font-mono transition-all ${
                s < step ? "bg-black text-[#e8dece] border-black" : s === step ? "border-black font-bold" : "border-black/20 opacity-30"
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
              <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)] p-6 space-y-4" style={{ backgroundColor: BG }}>
                {(["name", "website"] as const).map((k) => (
                  <div key={k}>
                    <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">{k === "name" ? "company name" : "website"}</label>
                    <input value={company[k]} onChange={setCompanyField(k)}
                      placeholder={k === "name" ? "Apollo Healthcare" : "https://apollo.com"}
                      className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)]" />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">what does your company do?</label>
                  <textarea value={company.about} onChange={setCompanyField("about")}
                    placeholder="We are a multi-specialty hospital network. Our Tier-1 support handles billing, reports, and appointment queries..."
                    rows={3} className="w-full border border-black bg-transparent px-3 py-2.5 text-sm font-mono placeholder:opacity-25 focus:outline-none focus:shadow-[1px_1px_0px_rgba(0,0,0,0.85)] resize-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">support team size</label>
                  <select value={company.teamSize} onChange={setCompanyField("teamSize")}
                    className="w-full border border-black px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none" style={{ backgroundColor: BG }}>
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
                <p className="text-sm opacity-40 mt-1">Give your agent a name and personality. AI will write the full script next.</p>
              </div>
              <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)] p-6 space-y-5" style={{ backgroundColor: BG }}>
                <div>
                  <label className="block text-[10px] font-mono opacity-50 mb-1.5 uppercase tracking-widest">agent name</label>
                  <input value={agent.name} onChange={(e) => setAgent((a) => ({ ...a, name: e.target.value }))}
                    placeholder="e.g. MedCore Billing, FlightCare Pro"
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
                    className="w-full border border-black px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none" style={{ backgroundColor: BG }}>
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
                <h1 className="text-3xl font-bold tracking-tight">generate your script.</h1>
                <p className="text-sm opacity-40 mt-1">
                  AI will write a production-ready script for <span className="opacity-70 font-semibold">{agent.name}</span> — system prompt, escalation rules, identity, and tools.
                </p>
              </div>

              {genState === "idle" && (
                <div className="border border-black shadow-[3px_3px_0px_rgba(0,0,0,0.85)]">
                  {[
                    { num: "01", title: "AI writes your script", desc: `Claude generates a full system prompt, identity config, escalation rules, and tool setup tailored to ${company.name || "your company"} and the ${useCase} use case.` },
                    { num: "02", title: "Edit in the script editor", desc: "Once generated, you'll land directly in the script editor. Every tab — Prompt, Identity, Tools, Rules — is pre-filled and ready to refine." },
                    { num: "03", title: "Connect your data", desc: "Go to Integrations to add your CRM or internal API. Your agent will call these tools mid-call to look up real customer data." },
                    { num: "04", title: "Activate and go live", desc: "Hit Activate in the script editor. Your agent is immediately live and will start processing inbound calls." },
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
              )}

              {genState === "generating" && (
                <div className="border border-black p-8 flex flex-col items-center gap-5">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="opacity-60" />
                    <span className="font-mono text-sm opacity-60">silk ai is working...</span>
                  </div>
                  <div className="w-full bg-black/5 border border-black/10">
                    <div className="h-1 bg-black/40 animate-pulse" style={{ width: "60%" }} />
                  </div>
                  <p className="text-xs font-mono opacity-40 text-center">{genStep}</p>
                </div>
              )}

              {genState === "done" && scriptId && (
                <div className="border border-black p-8 flex flex-col items-center gap-5 text-center">
                  <div className="w-10 h-10 border border-black flex items-center justify-center">
                    <Check size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-1">your agent is ready.</p>
                    <p className="text-xs opacity-40 font-mono">script generated · saved to dashboard · ready to edit</p>
                  </div>
                  <button onClick={() => router.push(`/scripts/${scriptId}`)}
                    className="flex items-center gap-2 bg-black text-[#e8dece] px-8 py-3 rounded-full text-sm font-medium hover:bg-black/80 transition-colors">
                    open script editor <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {genState === "error" && (
                <div className="border border-black/30 p-6 space-y-4">
                  <p className="text-sm font-mono text-red-700">{genError || "generation failed"}</p>
                  <button onClick={() => setGenState("idle")} className="text-xs font-mono underline opacity-50 hover:opacity-100">try again</button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 && genState === "idle" ? (
              <button onClick={() => setStep((s) => (s - 1) as Step)} className="flex items-center gap-2 text-sm font-mono opacity-40 hover:opacity-80 transition-opacity">
                <ArrowLeft size={13} /> back
              </button>
            ) : <div />}

            {step < 4 ? (
              <button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed}
                className="flex items-center gap-2 bg-black text-[#e8dece] px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-30">
                continue <ArrowRight size={13} />
              </button>
            ) : genState === "idle" ? (
              <button onClick={generateAndLaunch}
                className="flex items-center gap-2 bg-black text-[#e8dece] px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-colors">
                <Sparkles size={13} /> generate with ai <ArrowRight size={13} />
              </button>
            ) : genState === "generating" ? (
              <button disabled className="flex items-center gap-2 bg-black/40 text-[#e8dece] px-6 py-2.5 rounded-full text-sm font-medium cursor-not-allowed">
                <Loader2 size={13} className="animate-spin" /> generating...
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
