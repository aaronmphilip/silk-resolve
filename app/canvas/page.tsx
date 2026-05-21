import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const CanvasClient = dynamic(
  () => import("@/components/canvas/CanvasClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-mono text-xs opacity-30">loading canvas...</p>
      </div>
    ),
  }
);

const nodePalette = [
  {
    type: "peek",
    label: "Peek / Intent",
    desc: "Detect vocal tension & hidden intent",
  },
  {
    type: "mesh",
    label: "Mesh / Memory",
    desc: "Recall user emotional history",
  },
  {
    type: "silk",
    label: "Silk / Voice",
    desc: "Inject prosody mid-sentence",
  },
  {
    type: "action",
    label: "Action / Execute",
    desc: "Trigger Stripe, CRM, or DB",
  },
  {
    type: "condition",
    label: "Condition",
    desc: "Branch on threshold or flag",
  },
  { type: "trigger", label: "Trigger", desc: "Call start entry point" },
];

export default function CanvasPage() {
  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: "#f0ebe0" }}
    >
      {/* Top bar */}
      <div className="border-b border-black px-6 py-3 flex items-center justify-between bg-[#f0ebe0] z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs opacity-50 hover:opacity-100 transition-opacity font-mono"
          >
            <ArrowLeft size={12} />
            back
          </Link>
          <div className="w-px h-4 bg-black/20" />
          <div>
            <span className="font-semibold text-sm">MedCore Billing Agent</span>
            <span className="text-xs opacity-35 ml-2 font-mono">
              Apollo Healthcare
            </span>
          </div>
          <span className="text-[10px] font-mono border border-black/30 px-2 py-0.5 opacity-40">
            draft
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-xs font-mono px-4 py-2 border border-black hover:bg-black/5 transition-colors">
            save draft
          </button>
          <button className="text-xs font-mono px-4 py-2 bg-black text-[#f0ebe0] hover:opacity-75 transition-opacity flex items-center gap-2">
            deploy agent ↗
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Node palette */}
        <div className="w-52 border-r border-black bg-[#f0ebe0] flex flex-col overflow-y-auto">
          <div className="px-4 py-3 border-b border-black">
            <p className="text-[10px] font-mono opacity-35 uppercase tracking-widest">
              node types
            </p>
          </div>
          <div className="p-3 space-y-2">
            {nodePalette.map((n) => (
              <div
                key={n.type}
                className="p-3 border border-black cursor-grab hover:bg-black/5 hover:shadow-[1px_1px_0px_rgba(0,0,0,0.8)] transition-all active:cursor-grabbing"
                draggable
              >
                <p className="text-xs font-semibold">{n.label}</p>
                <p className="text-[10px] opacity-40 mt-0.5 leading-relaxed">
                  {n.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Pillar status */}
          <div className="mt-auto border-t border-black p-4">
            <p className="text-[10px] font-mono opacity-35 uppercase tracking-widest mb-3">
              pillar status
            </p>
            {[
              { name: "PEEK", ok: true },
              { name: "MESH", ok: true },
              { name: "SILK", ok: true },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold">{p.name}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-black" />
                  <span className="text-[10px] font-mono opacity-40">active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <CanvasClient />
        </div>
      </div>
    </div>
  );
}
