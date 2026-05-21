"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

const VIBES = [
  { id: "protective", label: "Protective", desc: "Warm, empathetic. Uses Hinglish. Holds space for emotion." },
  { id: "professional", label: "Professional", desc: "Formal, precise. Respects time. Minimal warmth." },
  { id: "casual", label: "Casual", desc: "Friendly, light. Humour when tension drops." },
];
const LANGUAGES = ["Hinglish (hi-IN / en-IN)", "Hindi (hi-IN)", "English (en-IN)", "Tamil (ta-IN)", "Telugu (te-IN)"];
const PILLARS = ["PEEK", "MESH", "SILK"] as const;

export default function NewAgentPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    vibe: "",
    language: "Hinglish (hi-IN / en-IN)",
    pillars: ["PEEK", "MESH", "SILK"] as string[],
    generateScript: true,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function togglePillar(p: string) {
    setForm((f) => ({
      ...f,
      pillars: f.pillars.includes(p) ? f.pillars.filter((x) => x !== p) : [...f.pillars, p],
    }));
  }

  async function create() {
    if (!form.name) { setError("agent name is required"); return; }
    setCreating(true); setError("");

    try {
      // 1. Create agent
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          pillars: form.pillars,
          status: "draft",
        }),
      });
      if (!agentRes.ok) {
        const d = await agentRes.json();
        throw new Error(d.error ?? "failed to create agent");
      }
      const agent = await agentRes.json();

      if (form.generateScript) {
        // 2. Generate script with AI
        const aiRes = await fetch("/api/ai/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentName: form.name,
            vibe: form.vibe || "professional",
            language: form.language,
            industry: "enterprise",
            useCase: form.description || "general customer support",
            company: "",
          }),
        });
        const scriptConfig = aiRes.ok ? await aiRes.json() : {};

        // 3. Create script
        const scriptRes = await fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent.id,
            agentName: form.name,
            name: `${form.name} — default script`,
            version: 1,
            status: "draft",
            systemPrompt: scriptConfig.systemPrompt ?? "",
            companionVibe: scriptConfig.companionVibe ?? form.vibe ?? "professional",
            language: scriptConfig.language ?? form.language,
            preferredAddress: scriptConfig.preferredAddress ?? "Sir/Ma'am",
            linguisticNotes: scriptConfig.linguisticNotes ?? "",
            tools: scriptConfig.tools ?? [],
            escalationRules: scriptConfig.escalationRules ?? [],
            noGoTopics: scriptConfig.noGoTopics ?? [],
          }),
        });

        if (scriptRes.ok) {
          const script = await scriptRes.json();
          router.push(`/scripts/${script.id}`);
          return;
        }
      }

      router.push(`/agents`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-black px-8 py-5">
        <Link href="/agents" className="flex items-center gap-2 text-xs font-mono opacity-40 hover:opacity-100 transition-opacity mb-4">
          <ArrowLeft size={11} /> back to agents
        </Link>
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1">/ new agent /</p>
        <h1 className="text-2xl font-bold tracking-tight">create agent.</h1>
      </div>

      <div className="px-8 py-8 max-w-xl space-y-6">
        {/* Name */}
        <div className="border border-black">
          <div className="px-5 py-4 border-b border-black">
            <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">agent name *</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. MedCore Billing, FlightCare Pro"
              className="w-full bg-transparent text-sm font-mono focus:outline-none border-b border-transparent focus:border-black" />
          </div>
          <div className="px-5 py-4">
            <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">description / use case</label>
            <input value={form.description} onChange={(e) => set("description", e.target.value)}
              placeholder="handles billing disputes and report delays for healthcare clients"
              className="w-full bg-transparent text-sm font-mono focus:outline-none border-b border-transparent focus:border-black" />
          </div>
        </div>

        {/* Pillars */}
        <div>
          <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-3">active pillars</p>
          <div className="flex gap-2">
            {PILLARS.map((p) => (
              <button key={p} onClick={() => togglePillar(p)}
                className={`flex-1 border py-2.5 text-xs font-mono transition-all ${form.pillars.includes(p) ? "border-black bg-black text-[#f0ebe0]" : "border-black/25 opacity-40 hover:border-black hover:opacity-80"}`}>
                {p}
              </button>
            ))}
          </div>
          <p className="text-[9px] font-mono opacity-25 mt-1.5">PEEK=intent · MESH=memory · SILK=voice</p>
        </div>

        {/* AI Script Generation toggle */}
        <div className="border border-black p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={12} />
                <p className="text-sm font-bold">generate script with AI</p>
              </div>
              <p className="text-xs opacity-40 leading-relaxed">
                AI writes a full system prompt, identity config, escalation rules, and tools based on your agent name and description. You'll land directly in the script editor.
              </p>
            </div>
            <button onClick={() => set("generateScript", !form.generateScript)}
              className={`flex-shrink-0 w-10 h-5 border transition-all relative ${form.generateScript ? "bg-black border-black" : "border-black/30"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white border border-black/20 transition-all ${form.generateScript ? "left-5" : "left-0.5"}`} />
            </button>
          </div>

          {form.generateScript && (
            <div className="mt-4 pt-4 border-t border-black/10 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">companion vibe</label>
                <div className="space-y-1.5">
                  {VIBES.map((v) => (
                    <button key={v.id} onClick={() => set("vibe", v.id)}
                      className={`w-full text-left px-3 py-2 border text-xs font-mono transition-all ${form.vibe === v.id ? "border-black bg-black/5" : "border-black/20 hover:border-black"}`}>
                      <span className="font-bold">{v.label}</span>
                      <span className="opacity-40 ml-2 text-[10px]">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono opacity-40 mb-1.5 uppercase tracking-widest">language</label>
                <div className="space-y-1.5">
                  {LANGUAGES.map((l) => (
                    <button key={l} onClick={() => set("language", l)}
                      className={`w-full text-left px-3 py-2 border text-xs font-mono transition-all ${form.language === l ? "border-black bg-black/5" : "border-black/20 hover:border-black"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs font-mono text-red-700 border border-red-300 px-3 py-2 bg-red-50">{error}</p>}

        <button onClick={create} disabled={creating || !form.name}
          className="flex items-center gap-2 bg-black text-[#f0ebe0] px-7 py-3 rounded-full text-sm font-medium hover:bg-black/80 transition-colors disabled:opacity-40">
          {creating ? (
            <><Loader2 size={13} className="animate-spin" /> {form.generateScript ? "generating script..." : "creating agent..."}</>
          ) : (
            <>{form.generateScript ? <Sparkles size={13} /> : null} create agent {form.generateScript ? "+ script" : ""} <ArrowRight size={13} /></>
          )}
        </button>
      </div>
    </div>
  );
}
