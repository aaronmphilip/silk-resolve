/**
 * /fakewebsite — demo page showing how the Silk Resolve widget looks
 * embedded on a real customer website.
 *
 * TO USE: replace AGENT_ID below with your actual agent ID
 * (go to /agents → click ··· on any agent → Copy agent ID).
 */
import TalkButton from "./TalkButton";

// ── CHANGE THIS ──────────────────────────────────────────────────────────────
const AGENT_ID = "REPLACE_WITH_YOUR_AGENT_ID";
// ────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "NovaCare · Smart Health Insurance",
  description: "Affordable, instant health cover for India.",
};

export default function FakeWebsite() {
  return (
    <>
      {/* ── Inject the Silk Resolve widget ─────────────────────────────────── */}
      {/* In a real site this snippet goes before </body> — here we use Script  */}
      <WidgetScript agentId={AGENT_ID} />

      <div className="min-h-screen bg-white text-[#111] font-sans">

        {/* Nav */}
        <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0055ff] rounded flex items-center justify-center">
              <span className="text-white text-xs font-black">N</span>
            </div>
            <span className="font-bold text-[15px] tracking-tight">NovaCare</span>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-sm text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Plans</a>
            <a href="#" className="hover:text-black transition-colors">Claims</a>
            <a href="#" className="hover:text-black transition-colors">Hospitals</a>
            <a href="#" className="hover:text-black transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="#" className="text-sm text-gray-500 hover:text-black hidden sm:block">Sign in</a>
            <a href="#" className="bg-[#0055ff] text-white text-sm px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors">
              Get covered
            </a>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-6 pt-20 pb-24 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#0055ff] animate-pulse" />
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-widest">AI-powered claims support · 24 / 7</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#0a0a14] leading-[1.05] mb-6">
            Health insurance<br />
            <span className="text-[#0055ff]">that actually helps.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
            NovaCare covers hospitalisation, OPD, and critical illness. File claims in minutes. Talk to our AI support agent any time — no hold music, no chatbots.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#" className="w-full sm:w-auto bg-[#0055ff] text-white text-sm font-semibold px-8 py-4 rounded-full hover:bg-blue-700 transition-colors">
              View plans — from ₹499/mo
            </a>
            <a href="#" className="w-full sm:w-auto border border-gray-200 text-sm font-semibold px-8 py-4 rounded-full hover:border-gray-400 transition-colors text-gray-700">
              See how it works
            </a>
          </div>
        </section>

        {/* Stats bar */}
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

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-20">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#0055ff] mb-3 text-center">Why NovaCare</p>
          <h2 className="text-3xl font-black text-center text-[#0a0a14] mb-12">Built around you, not paperwork.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: "💬",
                title: "Talk to your agent",
                desc: "Click the button below-right. Our AI support agent answers instantly — explains your policy, guides claims, and escalates to a human if needed.",
              },
              {
                icon: "⚡",
                title: "Same-day cashless",
                desc: "Network hospitals get pre-auth in under 30 minutes. Upload the discharge summary and we handle the rest.",
              },
              {
                icon: "🔒",
                title: "Zero surprise bills",
                desc: "Coverage caps, sub-limits, and waiting periods shown upfront. No fine print ambushes at claim time.",
              },
            ].map(f => (
              <div key={f.title} className="border border-gray-100 rounded-2xl p-6 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-base text-[#0a0a14] mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA banner — points to the widget */}
        <section className="bg-gray-50 border-y border-gray-100 px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0a0a14] mb-3">
            Got a question? Just ask.
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-7">
            Our AI support agent is live right now. Click the blue button in the bottom-right corner — no hold time, no forms.
          </p>
          <TalkButton />
        </section>

        {/* Footer */}
        <footer className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#0055ff] rounded flex items-center justify-center">
              <span className="text-white text-[9px] font-black">N</span>
            </div>
            <span className="font-bold text-sm">NovaCare</span>
          </div>
          <p className="text-xs text-gray-400">
            © 2025 NovaCare Insurance Pvt Ltd · IRDAI Reg. No. 142 · CIN U66010MH2018PTC123456
          </p>
          <p className="text-[10px] text-gray-300">
            AI support powered by{" "}
            <span className="font-semibold text-gray-400">Silk Resolve</span>
          </p>
        </footer>
      </div>
    </>
  );
}

// ── Widget injector — renders a <script> tag server-side ────────────────────
function WidgetScript({ agentId }: { agentId: string }) {
  const snippet = `
(function() {
  var s = document.createElement('script');
  s.src = window.location.origin + '/widget.js';
  s.setAttribute('data-agent-id', '${agentId}');
  s.setAttribute('data-position', 'bottom-right');
  s.setAttribute('data-greeting', 'Talk to support');
  s.setAttribute('data-color', '#0055ff');
  s.defer = true;
  document.head.appendChild(s);
})();
`.trim();

  return (
    // eslint-disable-next-line @next/next/no-sync-scripts
    <script dangerouslySetInnerHTML={{ __html: snippet }} />
  );
}

