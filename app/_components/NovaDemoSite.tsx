import TalkButton from "@/app/fakewebsite/TalkButton";
import NovaInstantVoice from "@/app/_components/NovaInstantVoice";
import NovaTextSpeaker from "@/app/_components/NovaTextSpeaker";
import { NOVACARE_AGENT_ID, NOVACARE_FACTS, NOVACARE_PLANS, NOVACARE_PROMPT } from "@/lib/novacare-knowledge";
import { SILK_WARM_INTERVAL_MS, silkModelForVoiceMode, type WebVoiceMode } from "@/lib/silk-voice";

interface NovaDemoSiteProps {
  voiceMode: WebVoiceMode;
}

const copy = {
  silk: {
    badge: "SILK MUGA REST voice assistant",
    title: "NovaCare with MUGA REST",
    description:
      "The same NovaCare support agent routed through Rumik SILK MUGA REST TTS. This waits for a WAV response before Vapi can speak.",
    cta: "Talk to MUGA REST",
    color: "#0055ff",
    accent: "#0055ff",
    compareHref: "/nova-muga-stream",
    compareLabel: "MUGA streaming",
    secondaryHref: "/nova-mulberry",
    secondaryLabel: "Try Mulberry 1.5",
  },
  "silk-stream": {
    badge: "SILK MUGA · sub-1s streaming",
    title: "NovaCare with MUGA streaming",
    description:
      "Ultra-low-latency WebSocket streaming. Rumik MUGA pipes raw PCM to the browser as audio is generated — target input-to-output under 1 second.",
    cta: "Talk to MUGA streaming",
    color: "#0055ff",
    accent: "#0055ff",
    compareHref: "/nova-mulberry",
    compareLabel: "Mulberry 1.5",
    secondaryHref: "/nova-vapi",
    secondaryLabel: "Compare Vapi speed",
  },
  "silk-mulberry": {
    badge: "SILK Mulberry 1.5 · expressive streaming",
    title: "NovaCare with Mulberry 1.5",
    description:
      "Expressive instruct-TTS steered by a natural-language voice description. WebSocket streaming for realtime playback with sub-second time-to-first-audio.",
    cta: "Talk to Mulberry 1.5",
    color: "#7c3aed",
    accent: "#7c3aed",
    compareHref: "/fakewebsite",
    compareLabel: "MUGA streaming",
    secondaryHref: "/nova-vapi",
    secondaryLabel: "Compare Vapi speed",
  },
  vapi: {
    badge: "Vapi native voice assistant",
    title: "NovaCare with Vapi voice",
    description:
      "The same NovaCare support agent routed through Vapi native TTS for the fastest realtime demo. Same LLM and support logic, different voice renderer.",
    cta: "Talk to Vapi support",
    color: "#111111",
    accent: "#111111",
    compareHref: "/fakewebsite",
    compareLabel: "MUGA streaming",
    secondaryHref: "/nova-mulberry",
    secondaryLabel: "Try Mulberry 1.5",
  },
} satisfies Record<WebVoiceMode, {
  badge: string;
  title: string;
  description: string;
  cta: string;
  color: string;
  accent: string;
  compareHref: string;
  compareLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}>;

export default function NovaDemoSite({ voiceMode }: NovaDemoSiteProps) {
  const site = copy[voiceMode];
  const silkModel = silkModelForVoiceMode(voiceMode);

  return (
    <>
      {voiceMode !== "vapi" && <WarmSilkSocketScript voiceMode={voiceMode} />}
      <WidgetScript agentId={NOVACARE_AGENT_ID} voiceMode={voiceMode} label={site.cta} color={site.color} />

      <div className="min-h-screen bg-white text-[#111] font-sans">
        <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: site.accent }}>
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
          <a
            href="#voice"
            className="text-white text-sm px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: site.accent }}
          >
            Test voice
          </a>
        </nav>

        <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
            style={{
              backgroundColor: voiceMode === "silk-mulberry" ? "#f5f3ff" : "#eff6ff",
              borderColor: voiceMode === "silk-mulberry" ? "#ddd6fe" : "#dbeafe",
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: site.accent }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: voiceMode === "silk-mulberry" ? "#6d28d9" : "#1d4ed8" }}
            >
              {site.badge}
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0a0a14] leading-[1.05] mb-6">
            {site.title}<br />
            <span style={{ color: site.accent }}>same brain, different voice.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
            {site.description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#voice"
              className="w-full sm:w-auto text-white text-sm font-semibold px-8 py-4 rounded-full hover:opacity-90 transition-opacity"
              style={{ backgroundColor: site.accent }}
            >
              Start web call
            </a>
            <a href={site.compareHref} className="w-full sm:w-auto border border-gray-200 text-sm font-semibold px-8 py-4 rounded-full hover:border-gray-400 transition-colors text-gray-700">
              Compare {site.compareLabel}
            </a>
            <a
              href={site.secondaryHref}
              className="w-full sm:w-auto border text-sm font-semibold px-8 py-4 rounded-full transition-colors"
              style={{
                borderColor: voiceMode === "silk-mulberry" ? "#ddd6fe" : "#dbeafe",
                backgroundColor: voiceMode === "silk-mulberry" ? "#f5f3ff" : "#eff6ff",
                color: voiceMode === "silk-mulberry" ? "#6d28d9" : "#1d4ed8",
              }}
            >
              {site.secondaryLabel}
            </a>
          </div>
          {voiceMode !== "vapi" && (
            <div className="mt-10 space-y-4">
              {voiceMode !== "silk-mulberry" && (
                <NovaInstantVoice voiceMode={voiceMode} accentColor={site.accent} />
              )}
              {voiceMode === "silk-mulberry" && (
                <p className="text-sm text-gray-500 max-w-xl mx-auto">
                  Voice calls use the Talk button below or the floating widget — powered by Vapi + Mulberry for reliable mic capture.
                </p>
              )}
              <NovaTextSpeaker systemPrompt={NOVACARE_PROMPT} voiceMode={voiceMode} accentColor={site.accent} />
            </div>
          )}
        </section>

        <div className="text-white" style={{ backgroundColor: site.accent }}>
          <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { val: "2.4M+", label: "Policies active" },
              { val: "98.2%", label: "Claims settled" },
              { val: "10k+", label: "Network hospitals" },
              { val: silkModel === "mulberry" ? "<1s" : "<1s", label: "Voice latency target" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-black">{s.val}</p>
                <p className="text-xs text-white/65 mt-0.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <section id="plans" className="max-w-5xl mx-auto px-6 py-16">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3 text-center" style={{ color: site.accent }}>NovaCare plans</p>
          <h2 className="text-3xl font-black text-center text-[#0a0a14] mb-10">Ask the agent to compare plans.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {NOVACARE_PLANS.map(plan => (
              <div key={plan.name} className="border border-gray-100 rounded-xl p-6 hover:border-gray-200 hover:shadow-sm transition-all">
                <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">{plan.name.replace("NovaCare ", "")}</p>
                <h3 className="font-black text-2xl text-[#0a0a14] mb-2">{plan.displayPrice}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {plan.displaySumInsured} cover for {plan.audience}. {plan.waiting}.
                </p>
                <ul className="space-y-2">
                  {plan.highlights.slice(0, 3).map(item => (
                    <li key={item} className="text-xs text-gray-500 flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: site.accent }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section id="claims" className="bg-gray-50 border-y border-gray-100 px-6 py-16">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: site.accent }}>Claims</p>
              <h2 className="text-3xl font-black text-[#0a0a14] mb-4">Cashless approval in minutes.</h2>
              <p className="text-gray-500 leading-relaxed">
                Ask about cashless claims, reimbursement, waiting periods, hospital network, or plan pricing.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {[
                NOVACARE_FACTS.hospitals,
                "Cashless pre-auth target time is 30 minutes after the hospital sends the admission request.",
                "Reimbursement needs bills, discharge summary, prescriptions, and bank details in the NovaCare app.",
                "Emergency support: 1800-668-2273, available 24/7.",
              ].map(item => (
                <div key={item} className="border border-gray-200 bg-white px-4 py-3 rounded-lg text-gray-700">{item}</div>
              ))}
            </div>
          </div>
        </section>

        <section id="voice" className="max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: site.accent }}>Voice demo</p>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0a0a14] mb-3">
            Test this version now.
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto mb-7">
            Try: "Help me with the plans", "How do claims work?", or "Do you cover network hospitals?"
          </p>
          <div className="flex flex-col items-center gap-8">
            <TalkButton label={site.cta} />
          </div>
        </section>

        <footer className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: site.accent }}>
              <span className="text-white text-[9px] font-black">N</span>
            </div>
            <span className="font-bold text-sm">NovaCare</span>
          </div>
          <p className="text-xs text-gray-400">
            Demo support powered by Silk Resolve · {silkModel === "mulberry" ? "Mulberry 1.5" : "MUGA"} streaming.
          </p>
        </footer>
      </div>
    </>
  );
}

function WarmSilkSocketScript({ voiceMode }: { voiceMode: WebVoiceMode }) {
  const snippet = `
(function() {
  var voice = '${voiceMode}';
  var llmVoice = voice === 'silk-mulberry' ? 'silk-mulberry' : voice === 'silk-stream' ? 'silk-stream' : 'silk';
  var model = voice === 'silk-mulberry' ? 'mulberry' : 'muga';
  var paths = [
    '/api/voice/vapi-token',
    '/api/voice/vapi-llm?voice=' + llmVoice,
    '/api/voice/silk-tts?model=' + model,
    '/api/voice/silk-tts?model=' + model + '&warmFaq=1&faqId=greeting',
    '/api/voice/silk-tts?all=1'
  ];
  var ping = function(path) {
    try {
      fetch(path, { method: 'GET', cache: 'no-store', keepalive: true }).catch(function() {});
    } catch (error) {}
  };
  var warm = function() {
    for (var i = 0; i < paths.length; i++) ping(paths[i]);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', warm, { once: true });
  } else {
    warm();
  }

  window.setInterval(function() {
    if (!document.hidden) warm();
  }, ${SILK_WARM_INTERVAL_MS});
})();
`.trim();

  return <script id="silk-resolve-warm" dangerouslySetInnerHTML={{ __html: snippet }} />;
}

function WidgetScript({ agentId, voiceMode, label, color }: { agentId: string; voiceMode: WebVoiceMode; label: string; color: string }) {
  const snippet = `
(function() {
  var s = document.createElement('script');
  s.src = window.location.origin + '/widget.js?v=10';
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