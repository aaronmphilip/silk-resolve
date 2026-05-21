import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getScripts } from "@/lib/dal";
import { SCRIPTS } from "@/lib/mock-data";
import type { ScriptStatus } from "@/lib/types";

function StatusBadge({ status }: { status: ScriptStatus }) {
  const s: Record<ScriptStatus, string> = {
    active: "border-black font-bold",
    draft: "border-black/30 opacity-50",
    archived: "border-black/15 opacity-30",
  };
  return <span className={`text-[9px] font-mono border px-2 py-0.5 ${s[status]}`}>{status}</span>;
}

export default async function ScriptsPage() {
  const dbScripts = await getScripts();
  const scripts = dbScripts.length ? dbScripts : SCRIPTS;

  const active = scripts.filter((s) => s.status === "active").length;
  const drafts = scripts.filter((s) => s.status === "draft").length;
  const totalTools = scripts.reduce((n, s) => n + s.tools.filter((t) => t.enabled).length, 0);

  return (
    <div className="min-h-screen">
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">/ scripts /</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">agent scripts.</h1>
            <p className="text-sm opacity-40 mt-1">what your agents know, say, and do. the brain of every call.</p>
          </div>
          <Link href="/scripts/new" className="flex items-center gap-2 bg-black text-[#f0ebe0] px-4 py-2.5 text-xs font-mono hover:opacity-75 transition-opacity">
            <Plus size={11} /> new script
          </Link>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-4 border border-black mb-8">
          {[
            { label: "total scripts", value: scripts.length },
            { label: "active", value: active },
            { label: "drafts", value: drafts },
            { label: "tools enabled", value: totalTools },
          ].map((m, i) => (
            <div key={i} className={`px-6 py-5 ${i < 3 ? "border-r border-black" : ""}`}>
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">{m.label}</p>
              <p className="text-4xl font-bold tracking-tight">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Table header */}
        <div className="grid grid-cols-12 px-5 py-3 border border-black border-b-0 bg-black/[0.03]">
          {[
            { label: "script name", span: 4 },
            { label: "agent", span: 3 },
            { label: "version", span: 1 },
            { label: "tools", span: 1 },
            { label: "status", span: 1 },
            { label: "updated", span: 2 },
          ].map((col) => (
            <div key={col.label} className={`col-span-${col.span}`}>
              <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest">{col.label}</p>
            </div>
          ))}
        </div>

        <div className="border border-black">
          {scripts.map((script, i) => (
            <Link key={script.id} href={`/scripts/${script.id}`}
              className={`grid grid-cols-12 px-5 py-4 items-center hover:bg-black/5 transition-colors ${i < scripts.length - 1 ? "border-b border-black" : ""}`}>
              <div className="col-span-4 flex items-center gap-3">
                <FileText size={13} className="opacity-30 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{script.name}</p>
                  <p className="text-[9px] font-mono opacity-30 mt-0.5">{script.id}</p>
                </div>
              </div>
              <div className="col-span-3">
                <p className="text-xs opacity-60">{script.agentName}</p>
              </div>
              <div className="col-span-1">
                <p className="text-xs font-mono opacity-50">v{script.version}</p>
              </div>
              <div className="col-span-1">
                <p className="text-xs font-mono">{script.tools.filter((t) => t.enabled).length} active</p>
              </div>
              <div className="col-span-1">
                <StatusBadge status={script.status} />
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-mono opacity-40">{script.updatedAt}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 border border-black/20 border-dashed px-6 py-5">
          <p className="text-[9px] font-mono opacity-25 uppercase tracking-widest mb-2">how scripts work</p>
          <p className="text-xs opacity-40 leading-relaxed max-w-3xl">
            A script is the instruction set your AI agent runs during every call. It defines the system prompt (what the agent knows), tools (what it can look up or action), escalation rules (when to hand off), and the companion vibe (how it speaks). When a call comes in, Silk loads the active script, MESH injects customer history, PEEK monitors intent, and SILK synthesises the voice — all in under 500ms.
          </p>
        </div>
      </div>
    </div>
  );
}
