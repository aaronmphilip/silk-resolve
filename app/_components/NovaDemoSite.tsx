import TalkButton from "@/app/fakewebsite/TalkButton";

const AGENT_ID = "agt-856e6f5e-1851-4041-a4f5-9f5ee62c0793";

type VoiceMode = "silk" | "vapi";

interface NovaDemoSiteProps {
  voiceMode: VoiceMode;
}

const copy = {
  silk: {
    badge: "SILK MUGA voice assistant",
    title: "NovaCare with SILK MUGA",
    description:
      "The same NovaCare support agent routed through Rumik SILK MUGA for expressive emotional voice. This is the branded voice demo.",
    cta: "Talk to MUGA support",
    color: "#0055ff",
  },
  vapi: {
    badge: "Vapi native voice assistant",
    title: "NovaCare with Vapi voice",
    description:
      "The same NovaCare support agent routed through Vapi native TTS for the fastest realtime demo. Same LLM and support logic, different voice renderer.",
    cta: "Talk to Vapi support",
    color: "#111111",
  },
} satisfies Record<VoiceMode, { badge: string; title: string; description: string; cta: string; color: string }>;

export default function NovaDemoSite({ voiceMode }: NovaDemoSiteProps) {
  const site = copy[voiceMode];

  return (
    <>
      <WidgetScript agentId={AGENT_ID} voiceMode={voiceMode} label={site.cta} color={site.color} />

      <div className="min-h-screen bg-white text-[#111] font-sans">
        <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0055ff] rounded flex items-center justify-center">
              <span className="text-white text-xs font-black">N</span>
            </div>
            <span className="font-bold text-[15px] tracking-tight">NovaCare</span>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm text-gray-500">
            <a href="#plans" className="hover:text-black transition-colors">Plans</a>
            <a href="#claims" className="hover:text-black transition-colors">Claims</a>
            <a href="#hospitals" className="hover:text-black transition-colors">Hospitals</a>
            <a href="#voice" className="hover:text-black transition-colors">Voice demo</a>
          </div>
          <a href="#voice" className="bg-[#0055ff] text-white text-sm px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors">
            Test voice
          </a>
        </nav>

        <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0055ff] animate-pulse" />
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-widest">{site.badge}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0a0a14] leading-[1.05] mb-6">
            {site.title}<br />
            <span className="text-[#0055ff]">same brain, different voice.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
            {site.description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#voice" className="w-full sm:w-auto bg-[#0055ff] text-white text-sm font-semibold px-8 py-4 rounded-full hover:bg-blue-700 transition-colors">
              Start web call
            </a>
            <a href={voiceMode === "silk" ? "/nova-vapi" : "/nova-muga"} className="w-full sm:w-auto border border-gray-200 text-sm font-semibold px-8 py-4 rounded-full hover:border-gray-400 transition-colors text-gray-700">
              Compare {voiceMode === "silk" ? "Vapi speed" : "MUGA voice"}
            </a>
          </div>
        </section>

        <div className="bg-[#0055ff] text-white">
          <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { val: "2.4M+", label: "Policies active" },
              { val: "98.2%", label: "Claims settled" },
              { val: "< 4 min", label: "Avg claim time" },
              { val: "24 / 7", label: "AI support" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-black">{s.val}</p>
                <p className="text-xs text-white/65 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <section id="plans" className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0055ff] mb-3 text-center">NovaCare plans</p>
          <h2 className="text-3xl font-black text-center text-[#0a0a14] mb-10">Ask the agent to compare plans.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: "Basic", price: "499/mo", desc: "Individual cover with 3 lakh sum insured and annual health check." },
              { title: "Standard", price: "899/mo", desc: "Family cover for spouse and two children with OPD support." },
              { title: "Premium", price: "1499/mo", desc: "Full family cover with OPD, critical illness, and international emergency support." },
            ].map(plan => (
              <div key={plan.title} className="border border-gray-100 rounded-xl p-6 hover:border-gray-200 hover:shadow-sm transition-all">
                <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">{plan.title}</p>
                <h3 className="font-black text-2xl text-[#0a0a14] mb-3">Rs {plan.price}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{plan.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="claims" className="bg-gray-50 border-y border-gray-100 px-6 py-16">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#0055ff] mb-3">Claims</p>
              <h2 className="text-3xl font-black text-[#0a0a14] mb-4">Cashless approval in minutes.</h2>
              <p className="text-gray-500 leading-relaxed">
                Ask about cashless claims, reimbursement, waiting periods, hospital network, or plan pricing.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {[
                "Show e-card at a network hospital.",
                "Hospital gets pre-auth in around thirty minutes.",
                "Reimbursement claims are paid within seven working days.",
              ].map(item => (
                <div key={item} className="border border-gray-200 bg-white px-4 py-3 rounded-lg text-gray-700">{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="voice" className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0055ff] mb-3">Voice demo</p>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0a0a14] mb-3">
            Test this version now.
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto mb-7">
            Try: "Help me with the plans", "How do claims work?", or "Do you cover network hospitals?"
          </p>
          <TalkButton label={site.cta} />
        </section>

        <footer className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#0055ff] rounded flex items-center justify-center">
              <span className="text-white text-[9px] font-black">N</span>
            </div>
            <span className="font-bold text-sm">NovaCare</span>
          </div>
          <p className="text-xs text-gray-400">
            Demo support powered by Silk Resolve.
          </p>
        </footer>
      </div>
    </>
  );
}

function WidgetScript({ agentId, voiceMode, label, color }: { agentId: string; voiceMode: VoiceMode; label: string; color: string }) {
  const snippet = `
(function() {
  var s = document.createElement('script');
  s.src = window.location.origin + '/widget.js';
  s.setAttribute('data-agent-id', '${agentId}');
  s.setAttribute('data-position', 'bottom-right');
  s.setAttribute('data-greeting', '${label}');
  s.setAttribute('data-color', '${color}');
  s.setAttribute('data-voice', '${voiceMode}');
  s.defer = true;
  document.head.appendChild(s);
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: snippet }} />;
}
