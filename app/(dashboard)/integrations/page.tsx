import { Plus, RefreshCw } from "lucide-react";
import { getIntegrations } from "@/lib/dal";
import { INTEGRATIONS } from "@/lib/mock-data";
import type { IntegrationStatus, IntegrationType } from "@/lib/types";

function StatusDot({ status }: { status: IntegrationStatus }) {
  const styles: Record<IntegrationStatus, string> = {
    connected: "bg-black animate-pulse",
    error: "bg-black/60",
    pending: "bg-black/30",
    untested: "bg-black/15",
  };
  return (
    <div className="relative flex h-2 w-2 flex-shrink-0">
      {status === "connected" && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${styles[status]}`} />
    </div>
  );
}

function TypeBadge({ type }: { type: IntegrationType }) {
  const labels: Record<IntegrationType, string> = { rest_api: "REST API", database: "Database", crm: "CRM", webhook: "Webhook" };
  return <span className="text-[9px] font-mono border border-black/20 px-1.5 py-0.5 opacity-50">{labels[type]}</span>;
}

const HOW_IT_WORKS = [
  { step: "01", title: "You provide an endpoint or DB connection", body: "REST API, PostgreSQL read-only access, or a CRM like Salesforce. We never write to your database — only read (plus explicit action endpoints you whitelist)." },
  { step: "02", title: "We map endpoints to AI tools", body: "Each endpoint becomes a tool your agent can call mid-conversation. GET /customers/{id} becomes lookup_customer(). The AI decides when to call it based on what the customer says." },
  { step: "03", title: "Real data flows into every call", body: "When a customer calls, the agent has live access to their account, orders, or records — no pre-cached data, no stale context. The lookup happens in real time, in under 200ms." },
  { step: "04", title: "Actions execute with your approval", body: "Write-actions (refund, waive fee, rebook) require whitelisting in your script. You control exactly what the AI can and cannot do to your data." },
];

export default async function IntegrationsPage() {
  const dbIntegrations = await getIntegrations();
  const integrations = dbIntegrations.length ? dbIntegrations : INTEGRATIONS;

  const connected = integrations.filter((i) => i.status === "connected").length;
  const totalEndpoints = integrations.reduce((n, i) => n + i.endpoints.length, 0);

  return (
    <div className="min-h-screen">
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ integrations /</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">data integrations.</h1>
            <p className="text-sm opacity-40 mt-1">connect your databases so your agent can look up real customer data mid-call.</p>
          </div>
          <button className="flex items-center gap-2 bg-black text-[#f0ebe0] px-4 py-2.5 text-xs font-mono hover:opacity-75 transition-opacity">
            <Plus size={11} /> add integration
          </button>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 border border-black mb-8">
          {[
            { label: "connected", value: connected },
            { label: "total integrations", value: integrations.length },
            { label: "endpoints mapped", value: totalEndpoints },
          ].map((m, i) => (
            <div key={i} className={`px-6 py-5 ${i < 2 ? "border-r border-black" : ""}`}>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">{m.label}</p>
              <p className="text-4xl font-bold tracking-tight">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Integration cards */}
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">connected sources</p>
        <div className="grid grid-cols-1 gap-4 mb-10">
          {integrations.map((intg) => (
            <div key={intg.id} className={`border border-black ${intg.status === "error" ? "border-black" : ""}`}>
              {/* Card header */}
              <div className="px-6 py-4 border-b border-black flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusDot status={intg.status} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{intg.name}</p>
                      <TypeBadge type={intg.type} />
                      <span className={`text-[9px] font-mono border px-2 py-0.5 ${
                        intg.status === "connected" ? "border-black font-bold" : intg.status === "pending" ? "border-black/30 opacity-40" : "border-black/60 opacity-60"
                      }`}>{intg.status}</span>
                    </div>
                    {intg.baseUrl && <p className="text-[10px] font-mono opacity-30 mt-0.5">{intg.baseUrl}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {intg.lastTested && <p className="text-[10px] font-mono opacity-30">tested {intg.lastTested}</p>}
                  <button className="flex items-center gap-1.5 text-[10px] font-mono border border-black/30 px-3 py-1.5 hover:border-black transition-all opacity-60 hover:opacity-100">
                    <RefreshCw size={9} /> test connection
                  </button>
                  <button className="text-[10px] font-mono border border-black px-3 py-1.5 hover:bg-black/5 transition-colors">
                    configure
                  </button>
                </div>
              </div>

              {/* Endpoints table */}
              <div>
                <div className="grid grid-cols-12 px-6 py-2.5 bg-black/[0.02] border-b border-black/10">
                  {["tool name", "method", "endpoint path", "description", "params"].map((h, i) => (
                    <p key={h} className={`text-[8px] font-mono opacity-30 uppercase tracking-widest col-span-${[2, 1, 3, 4, 2][i]}`}>{h}</p>
                  ))}
                </div>
                {intg.endpoints.map((ep, i) => (
                  <div key={ep.id} className={`grid grid-cols-12 px-6 py-3 items-center ${i < intg.endpoints.length - 1 ? "border-b border-black/10" : ""}`}>
                    <p className="col-span-2 text-xs font-mono font-medium">{ep.toolName}()</p>
                    <span className={`col-span-1 text-[9px] font-mono border px-1.5 py-0.5 w-fit ${ep.method === "GET" ? "border-black/30 opacity-50" : "border-black opacity-70"}`}>{ep.method}</span>
                    <p className="col-span-3 text-[10px] font-mono opacity-40">{ep.path}</p>
                    <p className="col-span-4 text-xs opacity-50">{ep.description}</p>
                    <div className="col-span-2 flex flex-wrap gap-1">
                      {ep.params.map((p) => (
                        <span key={p} className="text-[8px] font-mono bg-black/5 border border-black/10 px-1 py-0.5 opacity-60">{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {intg.status === "pending" && (
                <div className="px-6 py-3 border-t border-black/10 bg-black/[0.02]">
                  <p className="text-[10px] font-mono opacity-40">⚠ connection pending — add your auth credentials to activate this integration</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* How it works */}
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">how integrations work</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="border border-black px-5 py-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl font-bold font-mono opacity-10 flex-shrink-0">{item.step}</span>
                <div>
                  <p className="font-bold text-sm mb-1.5">{item.title}</p>
                  <p className="text-xs opacity-50 leading-relaxed">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border border-dashed border-black/20 px-6 py-5">
          <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-2">supported integration types</p>
          <div className="flex flex-wrap gap-3">
            {["REST API (Bearer / API Key / OAuth2)", "PostgreSQL (read-only replica)", "MySQL (read-only)", "Salesforce CRM", "Zoho CRM", "SAP APIs", "Webhook push"].map((t) => (
              <span key={t} className="text-[10px] font-mono opacity-40 border border-black/15 px-2.5 py-1">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
