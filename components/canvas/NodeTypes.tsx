"use client";
import { Handle, Position } from "@xyflow/react";
import { Eye, Brain, Mic, Zap, Play, GitBranch } from "lucide-react";

const base =
  "border border-black bg-[#f0ebe0] min-w-[172px] shadow-[2px_2px_0px_rgba(0,0,0,0.85)]";

function NodeHeader({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-black bg-black/5">
      {icon}
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

export function TriggerNode({ data }: { data: Record<string, string> }) {
  return (
    <div className={base}>
      <NodeHeader icon={<Play size={9} />} label="Trigger" />
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold">{data.label}</p>
        <p className="text-[10px] opacity-40 mt-0.5">{data.detail}</p>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function PeekNode({ data }: { data: Record<string, string> }) {
  const pct = data.threshold ? Number(data.threshold) : 70;
  return (
    <div className={base}>
      <NodeHeader icon={<Eye size={9} />} label="Peek / Intent" />
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold">{data.label}</p>
        <p className="text-[10px] opacity-40 mt-0.5">{data.detail}</p>
        <div className="mt-2.5 h-1 bg-black/10 rounded-none">
          <div
            className="h-1 bg-black"
            style={{ width: `${pct}%`, transition: "width 0.6s ease" }}
          />
        </div>
        <p className="text-[9px] font-mono opacity-30 mt-1">
          threshold: {pct}%
        </p>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function MeshNode({ data }: { data: Record<string, string> }) {
  return (
    <div className={base}>
      <NodeHeader icon={<Brain size={9} />} label="Mesh / Memory" />
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold">{data.label}</p>
        <p className="text-[10px] opacity-40 mt-0.5">{data.detail}</p>
        <div className="mt-2 flex gap-1">
          {["3mo", "6mo", "1yr"].map((t) => (
            <span
              key={t}
              className="text-[9px] font-mono border border-black/20 px-1.5 py-0.5 opacity-50"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function SilkNode({ data }: { data: Record<string, string> }) {
  return (
    <div className={base}>
      <NodeHeader icon={<Mic size={9} />} label="Silk / Voice" />
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold">{data.label}</p>
        <p className="text-[10px] opacity-40 mt-0.5">{data.detail}</p>
        {data.tag && (
          <span className="mt-2 inline-block text-[10px] font-mono bg-black text-[#f0ebe0] px-1.5 py-0.5">
            {data.tag}
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ActionNode({ data }: { data: Record<string, string> }) {
  return (
    <div className={base}>
      <NodeHeader icon={<Zap size={9} />} label="Action / Execute" />
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold">{data.label}</p>
        <p className="text-[10px] opacity-40 mt-0.5">{data.detail}</p>
        {data.api && (
          <span className="mt-2 inline-block text-[9px] font-mono border border-black/30 px-1.5 py-0.5 opacity-60">
            {data.api}
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export function ConditionNode({ data }: { data: Record<string, string> }) {
  return (
    <div className={base}>
      <NodeHeader icon={<GitBranch size={9} />} label="Condition" />
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold">{data.label}</p>
        <p className="text-[10px] opacity-40 mt-0.5">{data.detail}</p>
        <div className="mt-2 flex gap-2">
          <span className="text-[9px] font-mono border border-black px-1.5 py-0.5">
            YES ↗
          </span>
          <span className="text-[9px] font-mono border border-black/30 px-1.5 py-0.5 opacity-50">
            NO ↘
          </span>
        </div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} id="yes" />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "75%" }}
      />
    </div>
  );
}
