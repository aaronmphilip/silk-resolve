import Link from "next/link";
import { FlaskConical, Plus } from "lucide-react";
import { getABTests } from "@/lib/dal";
import { AB_TESTS } from "@/lib/mock-data";
import type { ABTest } from "@/lib/types";

function DeltaBadge({ a, b, higherIsBetter = true }: { a: number; b: number; higherIsBetter?: boolean }) {
  const delta = b - a;
  const positive = higherIsBetter ? delta > 0 : delta < 0;
  if (delta === 0 || a === 0) return <span className="text-[9px] font-mono opacity-30">—</span>;
  return (
    <span className={`text-[10px] font-mono ${positive ? "font-bold" : "opacity-40"}`}>
      {positive ? "+" : ""}{delta.toFixed(1)}{typeof a === "number" && a < 20 ? "%" : "%"}
    </span>
  );
}

function PathComparison({ test }: { test: ABTest }) {
  const { pathA, pathB } = test;
  const bWins = test.winner === "B";
  const aWins = test.winner === "A";

  return (
    <div className="border border-black">
      {/* Path headers */}
      <div className="grid grid-cols-2 divide-x divide-black">
        <div className={`px-5 py-4 ${aWins ? "bg-black/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold border border-black px-2 py-0.5">A</span>
            <p className="font-semibold text-sm">{pathA.name}</p>
            {aWins && <span className="text-[9px] font-mono border border-black px-2 py-0.5 ml-auto">winner</span>}
          </div>
          <p className="text-xs opacity-40 leading-relaxed">{pathA.description}</p>
          <p className="text-[9px] font-mono opacity-25 mt-2 break-all">{pathA.silkConfig}</p>
        </div>
        <div className={`px-5 py-4 ${bWins ? "bg-black/5" : ""}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold border border-black px-2 py-0.5">B</span>
            <p className="font-semibold text-sm">{pathB.name}</p>
            {bWins && <span className="text-[9px] font-mono border border-black px-2 py-0.5 ml-auto">winner</span>}
          </div>
          <p className="text-xs opacity-40 leading-relaxed">{pathB.description}</p>
          <p className="text-[9px] font-mono opacity-25 mt-2 break-all">{pathB.silkConfig}</p>
        </div>
      </div>

      {/* Metrics comparison */}
      {[
        {
          label: "calls",
          a: pathA.calls,
          b: pathB.calls,
          fmt: (v: number) => v > 0 ? v.toLocaleString() : "—",
          higherIsBetter: false,
        },
        {
          label: "empathy score",
          a: pathA.empathyScore,
          b: pathB.empathyScore,
          fmt: (v: number) => v > 0 ? `${v}%` : "—",
          higherIsBetter: true,
        },
        {
          label: "resolved rate",
          a: pathA.resolvedRate,
          b: pathB.resolvedRate,
          fmt: (v: number) => v > 0 ? `${v}%` : "—",
          higherIsBetter: true,
        },
        {
          label: "avg handle time",
          a: 0,
          b: 0,
          aStr: pathA.avgHandleTime,
          bStr: pathB.avgHandleTime,
          fmt: (v: number) => String(v),
          higherIsBetter: false,
          noCompare: true,
        },
        {
          label: "30-day retention",
          a: pathA.retention,
          b: pathB.retention,
          fmt: (v: number) => v > 0 ? `${v}%` : "—",
          higherIsBetter: true,
        },
      ].map((row, i) => (
        <div
          key={row.label}
          className={`grid grid-cols-2 divide-x divide-black border-t border-black ${
            i % 2 === 0 ? "" : "bg-black/[0.02]"
          }`}
        >
          <div className="grid grid-cols-2 divide-x divide-black/10">
            <div className="px-5 py-3 flex items-center gap-3">
              <p className="text-[10px] font-mono opacity-35 w-24 flex-shrink-0">{row.label}</p>
              <p className={`text-sm font-mono ${aWins && !row.noCompare ? "" : ""}`}>
                {"aStr" in row ? row.aStr : row.fmt(row.a)}
              </p>
            </div>
            <div className="px-3 py-3 flex items-center">
              {!row.noCompare && row.a > 0 && row.b > 0 && (
                <DeltaBadge a={row.a} b={row.b} higherIsBetter={row.higherIsBetter} />
              )}
            </div>
          </div>
          <div className={`px-5 py-3 flex items-center ${bWins && !row.noCompare ? "font-semibold" : ""}`}>
            <p className="text-sm font-mono">
              {"bStr" in row ? row.bStr : row.fmt(row.b)}
            </p>
          </div>
        </div>
      ))}

      {/* Retention bar visual */}
      {pathA.retention > 0 && pathB.retention > 0 && (
        <div className="border-t border-black px-5 py-4">
          <p className="text-[9px] font-mono opacity-30 uppercase tracking-widest mb-3">
            retention comparison
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono w-6 opacity-40">A</span>
              <div className="flex-1 h-2 bg-black/10">
                <div className="h-2 bg-black/40" style={{ width: `${pathA.retention}%` }} />
              </div>
              <span className="text-xs font-mono w-12 text-right">{pathA.retention}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono w-6 opacity-40">B</span>
              <div className="flex-1 h-2 bg-black/10">
                <div className="h-2 bg-black" style={{ width: `${pathB.retention}%` }} />
              </div>
              <span className="text-xs font-mono w-12 text-right font-bold">{pathB.retention}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default async function ABTestingPage() {
  const dbTests = await getABTests();
  const tests = dbTests.length ? dbTests : AB_TESTS;

  const running = tests.filter((t) => t.status === "running");
  const completed = tests.filter((t) => t.status === "completed");
  const draft = tests.filter((t) => t.status === "draft");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-black px-8 py-6">
        <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-1.5">
          / a/b testing /
        </p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">empathy testing.</h1>
            <p className="text-sm opacity-40 mt-1">
              test configurations against each other. let data prove which vibe wins.
            </p>
          </div>
          <button className="flex items-center gap-2 bg-black text-[#f0ebe0] px-4 py-2.5 text-xs font-mono hover:opacity-75 transition-opacity">
            <Plus size={11} />
            new test
          </button>
        </div>
      </div>

      <div className="px-8 py-8 space-y-10">
        {/* Stats */}
        <div className="grid grid-cols-3 border border-black">
          {[
            { label: "running", value: running.length },
            { label: "completed", value: completed.length },
            { label: "drafts", value: draft.length },
          ].map((s, i) => (
            <div
              key={i}
              className={`px-6 py-5 ${i < 2 ? "border-r border-black" : ""}`}
            >
              <p className="text-[10px] font-mono opacity-30 uppercase tracking-widest mb-2">
                {s.label}
              </p>
              <p className="text-4xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* All tests */}
        {tests.map((test) => (
          <div key={test.id}>
            {/* Test header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <FlaskConical size={13} />
                  <h2 className="text-base font-bold">{test.name}</h2>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 border ${
                      test.status === "running"
                        ? "border-black"
                        : test.status === "completed"
                        ? "border-black/40 opacity-60"
                        : "border-black/20 opacity-40"
                    }`}
                  >
                    {test.status}
                  </span>
                  {test.winner && (
                    <span className="text-[10px] font-mono border border-black px-2 py-0.5 font-bold">
                      Path {test.winner} wins · {test.confidence?.toFixed(1)}% confidence
                    </span>
                  )}
                  {test.status === "running" && test.confidence && (
                    <span className="text-[10px] font-mono opacity-40">
                      {test.confidence.toFixed(0)}% confidence so far
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-40">{test.agentName}</p>
                <p className="text-xs opacity-50 mt-1 max-w-2xl leading-relaxed">
                  H: {test.hypothesis}
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-6">
                <p className="text-xs font-mono opacity-40">{test.startDate}</p>
                {test.endDate && (
                  <p className="text-xs font-mono opacity-30">→ {test.endDate}</p>
                )}
              </div>
            </div>

            <PathComparison test={test} />
          </div>
        ))}
      </div>
    </div>
  );
}
