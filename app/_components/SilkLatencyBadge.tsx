interface SilkLatencyBadgeProps {
  transport: string;
  firstChunkMs: number | null;
  pcmChunks?: number | null;
  speechChunks?: number | null;
  accentColor?: string;
  statusLabel?: string;
}

export default function SilkLatencyBadge({
  transport,
  firstChunkMs,
  pcmChunks,
  speechChunks,
  accentColor = "#0055ff",
  statusLabel,
}: SilkLatencyBadgeProps) {
  const under1s = firstChunkMs !== null && firstChunkMs < 1000;
  const label = statusLabel
    ?? (firstChunkMs !== null
      ? `${transport || "stream"} · ${firstChunkMs}ms`
      : transport || "ready");

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
        <span>{label}</span>
        {under1s && !statusLabel && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: accentColor }}
          >
            &lt;1s
          </span>
        )}
      </div>
      {(pcmChunks != null || speechChunks != null) && (
        <p className="text-[10px] text-gray-400 font-mono">
          {speechChunks != null ? `${speechChunks} speech chunks` : null}
          {speechChunks != null && pcmChunks != null ? " · " : null}
          {pcmChunks != null ? `${pcmChunks} pcm frames` : null}
        </p>
      )}
    </div>
  );
}

export const MUGA_DEMO_QUESTIONS = [
  { label: "Plans (cached)", text: "What plans do you offer?" },
  { label: "OPD (cached)", text: "Does NovaCare cover OPD?" },
  { label: "Live stream", text: "Can I downgrade from Premium to Basic before renewal?" },
] as const;