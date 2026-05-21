import type { HeatmapPoint, Pillar } from "@/lib/types";

interface CallHeatmapProps {
  data: HeatmapPoint[];
  width?: number;
  height?: number;
  showLegend?: boolean;
}

const PILLAR_LABELS: Record<Pillar, string> = {
  PEEK: "P",
  MESH: "M",
  SILK: "S",
  ACTION: "A",
};

export default function CallHeatmap({
  data,
  width = 680,
  height = 130,
  showLegend = true,
}: CallHeatmapProps) {
  if (!data || data.length < 2) return null;

  const PAD = { top: 10, right: 20, bottom: 28, left: 36 };
  const chartW = width - PAD.left - PAD.right;
  const chartH = height - PAD.top - PAD.bottom;
  const maxT = data[data.length - 1].t;

  const toX = (t: number) => PAD.left + (t / maxT) * chartW;
  const toY = (v: number) => PAD.top + (1 - v / 100) * chartH;
  const bottom = PAD.top + chartH;

  // Build SVG path strings
  const tensionPts = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.t).toFixed(1)},${toY(d.tension).toFixed(1)}`)
    .join(" ");

  const empathyPts = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${toX(d.t).toFixed(1)},${toY(d.empathy).toFixed(1)}`)
    .join(" ");

  // Area fills
  const tensionArea = `${tensionPts} L${toX(maxT).toFixed(1)},${bottom} L${PAD.left},${bottom} Z`;
  const empathyArea = `${empathyPts} L${toX(maxT).toFixed(1)},${bottom} L${PAD.left},${bottom} Z`;

  // Grid Y lines at 25, 50, 75
  const gridLines = [25, 50, 75].map((v) => toY(v).toFixed(1));

  // Time axis labels
  const timeLabels: number[] = [];
  const step = maxT <= 60 ? 10 : maxT <= 120 ? 20 : 30;
  for (let t = 0; t <= maxT; t += step) timeLabels.push(t);

  // Event markers
  const events = data.filter((d) => d.event);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: "block" }}
        aria-label="Emotional heatmap"
      >
        {/* ── Grid ── */}
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={y}
            x2={width - PAD.right}
            y2={y}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* ── Empathy area fill ── */}
        <path
          d={empathyArea}
          fill="rgba(0,0,0,0.04)"
        />

        {/* ── Tension area fill ── */}
        <path
          d={tensionArea}
          fill="rgba(0,0,0,0.07)"
        />

        {/* ── Event vertical markers ── */}
        {events.map((d, i) => {
          const x = toX(d.t);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={PAD.top}
                x2={x}
                y2={bottom}
                stroke="rgba(0,0,0,0.25)"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              {/* Pillar badge */}
              <rect
                x={x - 7}
                y={PAD.top - 9}
                width={14}
                height={9}
                fill="#0a0a0a"
              />
              <text
                x={x}
                y={PAD.top - 2}
                textAnchor="middle"
                fill="#f0ebe0"
                fontSize="5.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {d.event ? PILLAR_LABELS[d.event] : ""}
              </text>
            </g>
          );
        })}

        {/* ── Empathy line ── */}
        <path
          d={empathyPts}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
        />

        {/* ── Tension line ── */}
        <path
          d={tensionPts}
          fill="none"
          stroke="#0a0a0a"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* ── Data points on tension line ── */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={toX(d.t).toFixed(1)}
            cy={toY(d.tension).toFixed(1)}
            r="2"
            fill="#0a0a0a"
          />
        ))}

        {/* ── Y-axis labels ── */}
        {[0, 50, 100].map((v) => (
          <text
            key={v}
            x={PAD.left - 4}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize="7"
            fill="rgba(0,0,0,0.3)"
            fontFamily="monospace"
          >
            {v}%
          </text>
        ))}

        {/* ── X-axis ── */}
        <line
          x1={PAD.left}
          y1={bottom}
          x2={width - PAD.right}
          y2={bottom}
          stroke="rgba(0,0,0,0.15)"
          strokeWidth="1"
        />
        {timeLabels.map((t) => (
          <text
            key={t}
            x={toX(t)}
            y={bottom + 11}
            textAnchor="middle"
            fontSize="7"
            fill="rgba(0,0,0,0.3)"
            fontFamily="monospace"
          >
            {t}s
          </text>
        ))}

        {/* ── Axis labels ── */}
        <text
          x={PAD.left - 20}
          y={PAD.top + chartH / 2}
          textAnchor="middle"
          fontSize="6.5"
          fill="rgba(0,0,0,0.2)"
          fontFamily="monospace"
          transform={`rotate(-90, ${PAD.left - 20}, ${PAD.top + chartH / 2})`}
        >
          intensity
        </text>
      </svg>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-6 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-black" />
            <span className="text-[9px] font-mono opacity-40">tension</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-0.5 bg-black/30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 5px, transparent 5px, transparent 8px)",
              }}
            />
            <span className="text-[9px] font-mono opacity-40">
              empathy match
            </span>
          </div>
          {(["PEEK", "MESH", "SILK", "ACTION"] as Pillar[]).map((p) => (
            <div key={p} className="flex items-center gap-1">
              <div className="w-3 h-3 bg-black flex items-center justify-center">
                <span className="text-[6px] font-mono text-[#f0ebe0] font-bold">
                  {PILLAR_LABELS[p]}
                </span>
              </div>
              <span className="text-[9px] font-mono opacity-40">{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
