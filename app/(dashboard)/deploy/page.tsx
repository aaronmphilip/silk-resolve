"use client";
import { useState, useEffect } from "react";
import { Check, Copy, Globe, Phone, PhoneOutgoing, ChevronDown, ChevronUp } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  status: string;
  call_direction?: string;
  vapi_phone_number?: string;
  outbound_caller_id?: string;
}

function CodeBlock({ code, language = "html" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative border border-black dark:border-[#e8dece]/20 bg-black dark:bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{language}</span>
        <button onClick={copy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 hover:text-white/80 transition-colors">
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <pre className="px-4 py-4 text-[11px] font-mono text-[#e8dece]/80 overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function Step({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-8 h-8 border-2 border-black dark:border-[#e8dece]/40 flex items-center justify-center">
        <span className="text-sm font-bold font-mono">{num}</span>
      </div>
      <div className="flex-1 min-w-0 pb-8 border-b border-black/10 dark:border-[#e8dece]/10 last:border-b-0">
        <p className="font-semibold text-sm mb-3">{title}</p>
        {children}
      </div>
    </div>
  );
}

function InfoSection({ icon: Icon, title, badge, children, defaultOpen = false }: {
  icon: React.ElementType; title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-black dark:border-[#e8dece]/20">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-black/[0.03] dark:hover:bg-[#e8dece]/[0.03] transition-colors">
        <div className="flex items-center gap-3">
          <Icon size={14} className="text-black/50 dark:text-[#e8dece]/40" />
          <span className="font-semibold text-sm">{title}</span>
          {badge && (
            <span className="text-[9px] font-mono border border-black/20 dark:border-[#e8dece]/20 px-2 py-0.5 text-black/40 dark:text-[#e8dece]/40">
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={13} className="opacity-40" /> : <ChevronDown size={13} className="opacity-40" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-black/10 dark:border-[#e8dece]/10 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

const EMBED_SNIPPET = (agentId: string, origin: string) =>
`<!-- Silk Resolve · Voice Widget -->
<!-- Place before </body> on any page -->
<script>
  (function() {
    var s = document.createElement('script');
    s.src = '${origin}/widget.js';
    s.setAttribute('data-agent-id', '${agentId}');
    s.setAttribute('data-position', 'bottom-right');
    s.setAttribute('data-greeting', 'Need help? Talk to us.');
    s.defer = true;
    document.head.appendChild(s);
  })();
</script>`;

const REACT_SNIPPET = (agentId: string, origin: string) =>
`import { useEffect } from 'react';

export function SilkWidget() {
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '${origin}/widget.js';
    s.setAttribute('data-agent-id', '${agentId}');
    s.setAttribute('data-position', 'bottom-right');
    s.defer = true;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);
  return null;
}`;

const DIRECT_SNIPPET = (agentId: string, origin: string) =>
`<!-- Direct Talk button — style it however you want -->
<button onclick="SilkResolve.start('${agentId}')">
  Talk to support
</button>

<script src="${origin}/widget.js"
  data-agent-id="${agentId}"
  data-auto-open="false">
</script>`;

export default function DeployPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [origin, setOrigin] = useState("https://your-domain.com");
  const [embedTab, setEmbedTab] = useState<"html" | "react" | "button">("html");

  useEffect(() => {
    fetch("/api/agents").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.agents) {
        setAgents(d.agents);
        const live = d.agents.find((a: Agent) => a.status === "live") ?? d.agents[0];
        if (live) setSelectedId(live.id);
      }
    });
    setOrigin(window.location.origin);
  }, []);

  const selected = agents.find(a => a.id === selectedId);
  const liveAgents = agents.filter(a => a.status === "live");

  const snippetMap = {
    html:   EMBED_SNIPPET(selectedId || "YOUR_AGENT_ID", origin),
    react:  REACT_SNIPPET(selectedId || "YOUR_AGENT_ID", origin),
    button: DIRECT_SNIPPET(selectedId || "YOUR_AGENT_ID", origin),
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black dark:border-[#e8dece]/20 px-5 sm:px-8 py-6">
        <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-1.5">
          / deploy /
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">deploy your agent.</h1>
          <p className="text-xs text-black/40 dark:text-[#e8dece]/40 font-mono hidden sm:block">
            website · inbound · outbound
          </p>
        </div>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-3xl space-y-10">

        {/* ── How it works summary ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-black dark:border-[#e8dece]/20">
          {[
            {
              icon: Globe,
              title: "Website widget",
              sub: "Visitors click a button and speak directly in their browser. No phone. No app. Just a microphone.",
              badge: "recommended",
              color: "text-emerald-600 dark:text-emerald-400",
            },
            {
              icon: Phone,
              title: "Inbound phone",
              sub: "Give customers a phone number. When they call, your agent picks up automatically.",
              badge: "via Vapi",
              color: "text-black/60 dark:text-[#e8dece]/60",
            },
            {
              icon: PhoneOutgoing,
              title: "Outbound dial",
              sub: "Your agent dials a list of contacts — for collections, follow-ups, or reminders.",
              badge: "via Vapi",
              color: "text-black/60 dark:text-[#e8dece]/60",
            },
          ].map((item, i) => (
            <div key={item.title}
              className={`px-5 py-5 ${i < 2 ? "border-b sm:border-b-0 sm:border-r border-black dark:border-[#e8dece]/20" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={13} className={item.color} />
                <p className="font-semibold text-sm">{item.title}</p>
                <span className="text-[8px] font-mono border border-black/15 dark:border-[#e8dece]/15 px-1.5 py-0.5 text-black/35 dark:text-[#e8dece]/35">
                  {item.badge}
                </span>
              </div>
              <p className="text-[11px] text-black/50 dark:text-[#e8dece]/50 leading-relaxed">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Website embed ───────────────────────────────────────────────── */}
        <div>
          <h2 className="font-bold text-base mb-1">Website widget</h2>
          <p className="text-xs text-black/50 dark:text-[#e8dece]/50 mb-5">
            Paste one snippet on your site. A floating Talk button appears — visitors click it, grant mic access, and your agent answers instantly in the browser. No phone number needed.
          </p>

          {/* Agent picker */}
          {agents.length > 0 && (
            <div className="mb-4">
              <label className="block text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest mb-2">
                pick an agent
              </label>
              <div className="flex gap-2 flex-wrap">
                {agents.map(a => (
                  <button key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`text-xs font-mono px-3 py-1.5 border transition-all ${
                      selectedId === a.id
                        ? "border-black bg-black text-[#e8dece] dark:border-[#e8dece] dark:bg-[#e8dece] dark:text-[#0a0a0a]"
                        : "border-black/20 dark:border-[#e8dece]/20 opacity-60 hover:opacity-100"
                    }`}>
                    {a.name}
                    {a.status === "live" && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Embed type tabs */}
          <div className="flex border-b border-black dark:border-[#e8dece]/20 mb-0">
            {(["html", "react", "button"] as const).map(t => (
              <button key={t} onClick={() => setEmbedTab(t)}
                className={`px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-all -mb-px ${
                  embedTab === t
                    ? "border-black dark:border-[#e8dece] text-black dark:text-[#e8dece] font-bold"
                    : "border-transparent text-black/40 dark:text-[#e8dece]/40 hover:text-black dark:hover:text-[#e8dece]"
                }`}>
                {t === "html" ? "HTML" : t === "react" ? "React" : "Custom button"}
              </button>
            ))}
          </div>
          <CodeBlock
            code={snippetMap[embedTab]}
            language={embedTab === "react" ? "tsx" : "html"}
          />

          {/* How it works steps */}
          <div className="mt-6 space-y-0">
            <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-4">
              how it works
            </p>
            <Step num="1" title="Paste the snippet">
              <p className="text-xs text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                Copy the snippet above and paste it before the closing <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1">&lt;/body&gt;</code> tag on your website. Replace <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1">your-domain.com</code> with your Silk Resolve deployment URL.
              </p>
            </Step>
            <Step num="2" title="A Talk button appears">
              <p className="text-xs text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                A floating button renders bottom-right (or wherever you configure it). Your brand colours, your text. Fully customisable via data attributes: <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1">data-color</code>, <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1">data-label</code>, <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1">data-position</code>.
              </p>
            </Step>
            <Step num="3" title="Browser → Agent in &lt; 2 seconds">
              <p className="text-xs text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                The visitor clicks, grants mic, and the agent answers. The browser connects directly over WebRTC — no phone, no app, no download. Works on Chrome, Safari, Edge, and mobile browsers.
              </p>
            </Step>
            <Step num="4" title="PEEK + MESH fires on every word">
              <p className="text-xs text-black/50 dark:text-[#e8dece]/50 leading-relaxed">
                Emotional tension is tracked in real time. At the end of the call, the full transcript is saved to <strong>Call Logs</strong>, the MESH profile is updated, and analytics update instantly.
              </p>
            </Step>
          </div>
        </div>

        {/* ── Inbound phone ───────────────────────────────────────────────── */}
        <InfoSection icon={Phone} title="Inbound phone calls" badge="via Vapi">
          <div className="space-y-4 text-xs text-black/60 dark:text-[#e8dece]/60 leading-relaxed">
            <p>
              When a customer dials a phone number, Vapi intercepts the call and routes it to your agent. You don&apos;t need a SIM card or a phone — just a Vapi phone number and your agent ID.
            </p>
            <div className="space-y-3">
              <div className="border border-black/10 dark:border-[#e8dece]/10 px-4 py-3">
                <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest mb-2">setup — 3 steps</p>
                <ol className="space-y-2 text-xs">
                  <li className="flex gap-3"><span className="font-bold font-mono text-black/30 dark:text-[#e8dece]/30 w-4 flex-shrink-0">1.</span><span>Go to <strong>vapi.ai → Phone Numbers</strong> and buy or import a number.</span></li>
                  <li className="flex gap-3"><span className="font-bold font-mono text-black/30 dark:text-[#e8dece]/30 w-4 flex-shrink-0">2.</span><span>Set the <strong>Server URL</strong> on that number to: <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1 text-[10px]">{origin}/api/voice/vapi-incoming</code></span></li>
                  <li className="flex gap-3"><span className="font-bold font-mono text-black/30 dark:text-[#e8dece]/30 w-4 flex-shrink-0">3.</span><span>In <strong>Agents → your agent → Advanced → Call Routing</strong>, paste that number into <em>Inbound Vapi phone number</em> and set direction to Inbound.</span></li>
                </ol>
              </div>
              <p className="text-[11px] text-black/40 dark:text-[#e8dece]/40">
                When a call arrives, Vapi sends an <code className="font-mono">assistant-request</code> to your server. Silk Resolve looks up the agent by phone number, builds a full PEEK+MESH assistant config, and returns it to Vapi in under 500ms. The agent then handles the entire call.
              </p>
            </div>
          </div>
        </InfoSection>

        {/* ── Outbound calls ──────────────────────────────────────────────── */}
        <InfoSection icon={PhoneOutgoing} title="Outbound calling" badge="via Vapi">
          <div className="space-y-4 text-xs text-black/60 dark:text-[#e8dece]/60 leading-relaxed">
            <p>
              Outbound is for when you initiate the call — collections follow-ups, appointment reminders, proactive support. Your agent dials a contact list and handles each call with full PEEK tension detection.
            </p>
            <div className="border border-black/10 dark:border-[#e8dece]/10 px-4 py-3">
              <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest mb-2">setup — 3 steps</p>
              <ol className="space-y-2 text-xs">
                <li className="flex gap-3"><span className="font-bold font-mono text-black/30 dark:text-[#e8dece]/30 w-4 flex-shrink-0">1.</span><span>In <strong>Agents → your agent → Advanced → Call Routing</strong>, set direction to Outbound and paste a verified Vapi caller ID number.</span></li>
                <li className="flex gap-3"><span className="font-bold font-mono text-black/30 dark:text-[#e8dece]/30 w-4 flex-shrink-0">2.</span><span>Optionally supply a <strong>Contact list URL</strong> — a JSON endpoint returning <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1 text-[10px]">[{"{phone, name, metadata}"}]</code>.</span></li>
                <li className="flex gap-3"><span className="font-bold font-mono text-black/30 dark:text-[#e8dece]/30 w-4 flex-shrink-0">3.</span><span>Trigger a campaign via the <strong>Vapi API</strong> — <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1 text-[10px]">POST /call/phone</code> with your assistant config URL: <code className="font-mono bg-black/5 dark:bg-[#e8dece]/5 px-1 text-[10px]">{origin}/api/agents/AGENT_ID/vapi-config</code></span></li>
              </ol>
            </div>
            <div className="border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">compliance note</p>
              <p className="text-[11px] text-black/50 dark:text-[#e8dece]/50">
                Outbound calls must comply with local regulations (TRAI in India, TCPA in the US). Only call contacts who have given consent. Rohan (the outbound collections agent) is pre-configured with RBI-compliant rules — never calls before 8am or after 7pm, and immediately flags DNC requests.
              </p>
            </div>
          </div>
        </InfoSection>

        {/* ── Live agents quick check ─────────────────────────────────────── */}
        {liveAgents.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-black/30 dark:text-[#e8dece]/30 uppercase tracking-widest mb-3">
              live agents ready to deploy
            </p>
            <div className="border border-black dark:border-[#e8dece]/20 divide-y divide-black/10 dark:divide-[#e8dece]/10">
              {liveAgents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{agent.name}</p>
                      <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40">{agent.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-mono border px-2 py-0.5 ${
                      agent.call_direction === "outbound"
                        ? "border-amber-400/40 text-amber-600 dark:text-amber-400"
                        : agent.call_direction === "both"
                        ? "border-purple-400/40 text-purple-600 dark:text-purple-400"
                        : "border-emerald-400/40 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {agent.call_direction ?? "inbound"}
                    </span>
                    <span className="text-[8px] font-mono border border-black/20 dark:border-[#e8dece]/20 px-2 py-0.5 text-black/40 dark:text-[#e8dece]/40">
                      live
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
