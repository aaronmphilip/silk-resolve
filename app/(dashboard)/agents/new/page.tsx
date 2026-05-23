"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

const LANGUAGES = [
  "English (en-IN)",
  "Hinglish (hi-IN / en-IN)",
  "Hindi (hi-IN)",
  "Tamil (ta-IN)",
  "Telugu (te-IN)",
  "Marathi (mr-IN)",
];

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handles, setHandles] = useState("");
  const [language, setLanguage] = useState("English (en-IN)");
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"idle" | "agent" | "prompt" | "done">("idle");
  const [error, setError] = useState("");

  async function create() {
    if (!name.trim()) { setError("Give your agent a name"); return; }
    setCreating(true);
    setError("");

    try {
      // 1. Create agent record
      setStep("agent");
      const agentRes = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: handles.trim(),
          status: "draft",
          language,
          pillars: ["PEEK", "MESH", "SILK"],
        }),
      });
      if (!agentRes.ok) {
        const d = await agentRes.json();
        throw new Error(d.error ?? "Failed to create agent");
      }
      const agent = await agentRes.json();

      // 2. AI generate system prompt + first message
      setStep("prompt");
      const aiRes = await fetch("/api/ai/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: name.trim(),
          useCase: handles.trim() || "general customer support",
          language,
          vibe: "professional",
        }),
      });

      if (aiRes.ok) {
        const ai = await aiRes.json();
        // Save generated prompt directly to agent
        await fetch(`/api/agents/${agent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_prompt: ai.systemPrompt ?? "",
            first_message: ai.firstMessage ?? "",
            companion_vibe: ai.companionVibe ?? "professional",
            language,
          }),
        });
      }

      setStep("done");
      router.push(`/agents/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
      setStep("idle");
    }
  }

  const stepLabel = {
    idle:   "",
    agent:  "creating agent...",
    prompt: "AI is writing your system prompt...",
    done:   "almost there...",
  }[step];

  return (
    <div className="min-h-screen">
      <div className="border-b-2 border-black px-5 sm:px-8 py-5">
        <Link href="/agents" className="flex items-center gap-2 text-xs font-mono text-black/50 hover:text-black transition-colors mb-5">
          <ArrowLeft size={11} /> back to agents
        </Link>
        <p className="text-[10px] font-mono text-black/40 uppercase tracking-widest mb-1">/ new agent /</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">create agent.</h1>
        <p className="text-xs text-black/50 mt-1">3 fields. AI writes the rest.</p>
      </div>

      <div className="px-5 sm:px-8 py-8 max-w-lg">
        <div className="space-y-5">

          {/* Agent name */}
          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              Agent name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya, MedCore Billing, FlightCare"
              className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-mono placeholder:text-black/30 focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,0.8)]"
              autoFocus
            />
            <p className="text-[10px] text-black/40 mt-1">Give it a name your team will recognise.</p>
          </div>

          {/* What it handles */}
          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              What does it handle? <span className="text-black/30">(optional — helps AI)</span>
            </label>
            <textarea
              value={handles}
              onChange={e => setHandles(e.target.value)}
              placeholder="e.g. Billing disputes and refund requests for healthcare customers. Customers are often frustrated. Escalate if tension stays above 8."
              rows={3}
              className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-mono placeholder:text-black/30 focus:outline-none focus:shadow-[2px_2px_0px_rgba(0,0,0,0.8)] resize-none"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-semibold text-black mb-2">Call language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`border-2 px-3 py-2 text-xs font-mono transition-all ${language === lang ? "border-black bg-black text-[#e8dece]" : "border-black/25 hover:border-black"}`}
                >
                  {lang.split(" ")[0]}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-black/40 mt-1">You can change this per agent after creation.</p>
          </div>

          {/* What's auto-generated */}
          <div className="border-2 border-black/15 bg-black/[0.03] px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={12} className="text-black/50" />
              <p className="text-xs font-semibold text-black/60">AI will auto-generate</p>
            </div>
            <div className="space-y-1.5">
              {["System prompt — full personality + behaviour rules", "First message — what agent says when call connects", "PEEK + MESH always active — no setup needed"].map(item => (
                <div key={item} className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-black/30 flex-shrink-0 mt-1.5" />
                  <p className="text-[11px] text-black/50">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="border-2 border-red-400 bg-red-50 px-4 py-3">
              <p className="text-xs font-mono text-red-700">{error}</p>
            </div>
          )}

          {/* Create button */}
          <button
            onClick={create}
            disabled={creating || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-black text-[#e8dece] py-4 text-sm font-bold hover:bg-black/80 transition-colors disabled:opacity-40"
          >
            {creating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span className="font-mono">{stepLabel}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                create agent
              </>
            )}
          </button>

          {creating && (
            <p className="text-[10px] font-mono text-black/40 text-center">
              Takes about 10 seconds — AI is writing your prompt
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
