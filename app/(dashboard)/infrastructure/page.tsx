import { EDGE_NODES, SYSTEM_COMPONENTS } from "@/lib/mock-data";
import type { NodeHealth } from "@/lib/types";

function HealthDot({ status }: { status: NodeHealth }) {
  return (
    <div className="relative flex h-2 w-2 flex-shrink-0">
      {status === "healthy" && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-40" />
      )}
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${
          status === "healthy"
            ? "bg-black"
            : status === "degraded"
            ? "bg-black/40"
            : "bg-black/15"
        }`}
      />
    </div>
  );
}

function UsageBar({ value, warn = 70, critical = 85 }: { value: number; warn?: number; critical?: number }) {
  const color =
    value >= critical
      ? "bg-black"
      : value >= warn
      ? "bg-black/60"
      : "bg-black/40";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-black/10 w-20">
        <div className={`h-1 ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] font-mono w-8 text-right">{value}%</span>
    </div>
  );
}

const RECENT_DEPLOYS = [
  { version: "silk-core 2.1.4", regions: "IN-MUM · IN-DEL", at: "2026-05-20 02:00 IST", status: "success" },
  { version: "peek 1.9.2", regions: "all regions", at: "2026-05-19 18:30 IST", status: "success" },
  { version: "silk-core 2.1.3", regions: "IN-BLR", at: "2026-05-18 14:30 IST", status: "partial" },
  { version: "mesh-db 4.2.0", regions: "all regions", at: "2026-05-15 03:00 IST", status: "success" },
  { version: "distil-3b v0.9", regions: "IN-MUM · ON-PREM", at: "2026-05-12 22:00 IST", status: "success" },
];

export default function InfrastructurePage() {
  const healthy = EDGE_NODES.filter((n) => n.status === "healthy").length;
  const degraded = EDGE_NODES.filter((n) => n.status === "degraded").length;
  const totalConns = EDGE_NODES.reduce((s, n) => s + n.activeConnections, 0);
  const avgLatency = Math.round(
    EDGE_NODES.reduce((s, n) => s + n.latencyMs, 0) / EDGE_NODES.length
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / infrastructure /
        </p>
        <div className="flex items-end justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            the silk mesh.
          </h1>
          <p className="text-xs opacity-35 font-mono">
            / distributed emotional gateway · edge nodes /
          </p>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Summary strip */}
        <div className="grid grid-cols-4 border border-black mb-8">
          {[
            { label: "healthy nodes", value: `${healthy}/${EDGE_NODES.length}` },
            { label: "degraded", value: String(degraded) },
            { label: "active connections", value: totalConns.toLocaleString() },
            { label: "avg latency", value: `${avgLatency}ms` },
          ].map((m, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < 3 ? "border-r border-black" : ""}`}
            >
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">
                {m.label}
              </p>
              <p className="text-4xl font-bold tracking-tight">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Edge nodes */}
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
          edge nodes
        </p>
        <div className="grid grid-cols-2 gap-4 mb-10">
          {EDGE_NODES.map((node) => (
            <div
              key={node.id}
              className={`border border-black ${
                node.status === "degraded" ? "border-black" : ""
              }`}
            >
              {/* Node header */}
              <div className="px-5 py-4 border-b border-black flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <HealthDot status={node.status} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{node.region}</p>
                      <span
                        className={`text-[9px] font-mono border px-2 py-0.5 ${
                          node.deployMode === "on-premise"
                            ? "border-black font-bold"
                            : "border-black/30 opacity-50"
                        }`}
                      >
                        {node.deployMode}
                      </span>
                    </div>
                    <p className="text-xs opacity-40 mt-0.5">{node.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono">{node.latencyMs}ms</p>
                  <p className="text-[9px] opacity-30 font-mono">latency</p>
                </div>
              </div>

              {/* Node metrics */}
              <div className="px-5 py-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
                    connections
                  </p>
                  <p className="text-sm font-mono">
                    {node.activeConnections.toLocaleString()}{" "}
                    <span className="opacity-30">/ {node.maxConnections.toLocaleString()}</span>
                  </p>
                  <div className="mt-1.5 h-1 bg-black/10">
                    <div
                      className="h-1 bg-black/40"
                      style={{ width: `${(node.activeConnections / node.maxConnections) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
                    resources
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono opacity-30 w-8">cpu</span>
                      <UsageBar value={node.cpuPct} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono opacity-30 w-8">mem</span>
                      <UsageBar value={node.memPct} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-black/10 flex items-center justify-between">
                <p className="text-[9px] font-mono opacity-25">{node.version}</p>
                <p className="text-[9px] font-mono opacity-25">deployed {node.deployedAt.slice(0, 10)}</p>
              </div>

              {node.status === "degraded" && (
                <div className="px-5 py-2.5 border-t border-black bg-black/5">
                  <p className="text-[10px] font-mono font-bold">
                    ⚠ degraded — high CPU/memory. version {node.version} behind latest.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* System components */}
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
          system components
        </p>
        <div className="border border-black mb-10">
          <div className="grid grid-cols-6 px-5 py-3 border-b border-black bg-black/[0.03]">
            {["component", "pillar", "status", "latency", "calls processed", "version"].map(
              (h) => (
                <p key={h} className="text-[9px] font-mono opacity-35 uppercase tracking-widest">
                  {h}
                </p>
              )
            )}
          </div>
          {SYSTEM_COMPONENTS.map((comp, i) => (
            <div
              key={comp.name}
              className={`grid grid-cols-6 px-5 py-3.5 items-center ${
                i < SYSTEM_COMPONENTS.length - 1 ? "border-b border-black" : ""
              } ${comp.status === "degraded" ? "bg-black/[0.03]" : ""}`}
            >
              <div className="flex items-center gap-2">
                <HealthDot status={comp.status} />
                <p className="text-xs font-medium">{comp.name}</p>
              </div>
              <span className="text-[9px] font-mono border border-black/20 px-1.5 py-0.5 inline-block w-fit opacity-50">
                {comp.pillar}
              </span>
              <span
                className={`text-[10px] font-mono ${
                  comp.status === "degraded" ? "font-bold" : "opacity-40"
                }`}
              >
                {comp.status}
              </span>
              <p className={`text-xs font-mono ${comp.latencyMs > 100 ? "font-bold" : "opacity-60"}`}>
                {comp.latencyMs}ms
              </p>
              <p className="text-xs font-mono opacity-60">
                {comp.callsProcessed.toLocaleString()}
              </p>
              <p className="text-[10px] font-mono opacity-30">{comp.version}</p>
            </div>
          ))}
        </div>

        {/* Recent deployments */}
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-4">
          deployment log
        </p>
        <div className="border border-black">
          {RECENT_DEPLOYS.map((d, i) => (
            <div
              key={i}
              className={`px-5 py-3.5 flex items-center justify-between ${
                i < RECENT_DEPLOYS.length - 1 ? "border-b border-black" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    d.status === "success" ? "bg-black" : "bg-black/40"
                  }`}
                />
                <p className="text-sm font-mono font-medium">{d.version}</p>
                <p className="text-xs opacity-40">{d.regions}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs font-mono opacity-40">{d.at}</p>
                <span
                  className={`text-[10px] font-mono border px-2 py-0.5 ${
                    d.status === "success"
                      ? "border-black/30 opacity-50"
                      : "border-black opacity-60"
                  }`}
                >
                  {d.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Architecture note */}
        <div className="mt-8 border border-black/20 border-dashed px-6 py-5">
          <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-2">
            architecture note
          </p>
          <p className="text-xs opacity-40 leading-relaxed max-w-3xl">
            Each edge node runs silk-core quantized to 8GB RAM (3B parameter distilled model) for on-premises enterprise deployments. The WebSocket mesh maintains isolated streams per tenant — no crosstalk between customer data. K8s autoscaling manages burst traffic across IN-MUM, IN-DEL, and IN-BLR regions with sub-150ms P99 latency targets.
          </p>
        </div>
      </div>
    </div>
  );
}
