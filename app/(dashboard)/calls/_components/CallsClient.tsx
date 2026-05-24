"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { outcomeBorder } from "@/lib/utils";
import type { Call, Agent } from "@/lib/types";
import type { CallOutcome } from "@/lib/types";

const PAGE_SIZE = 20;

interface Props {
  calls: Call[];
  agents: Agent[];
}

export default function CallsClient({ calls, agents }: Props) {
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | CallOutcome>("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let out = calls;
    if (outcomeFilter !== "all") out = out.filter((c) => c.outcome === outcomeFilter);
    if (agentFilter !== "all") out = out.filter((c) => c.agentId === agentFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.agentName.toLowerCase().includes(q) ||
          (c.client ?? "").toLowerCase().includes(q)
      );
    }
    return out;
  }, [calls, outcomeFilter, agentFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function setFilter(f: "all" | CallOutcome) {
    setOutcomeFilter(f);
    setPage(1);
  }

  return (
    <div>
      {/* Filter + search strip */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest">
            filter:
          </p>
          {(["all", "resolved", "escalated", "abandoned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-mono px-3 py-1.5 border transition-all ${
                f === outcomeFilter
                  ? "border-black bg-black text-[#e8dece] dark:border-[#e8dece] dark:bg-[#e8dece] dark:text-[#0a0a0a]"
                  : "border-black/25 dark:border-[#e8dece]/20 text-black/50 dark:text-[#e8dece]/50 hover:border-black dark:hover:border-[#e8dece]/60 hover:text-black dark:hover:text-[#e8dece]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="search calls..."
            className="text-xs font-mono border border-black/25 dark:border-[#e8dece]/20 bg-transparent px-3 py-1.5 focus:outline-none focus:border-black dark:focus:border-[#e8dece]/60 transition-colors w-44 placeholder:text-black/30 dark:placeholder:text-[#e8dece]/25"
          />
          <select
            value={agentFilter}
            onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
            className="text-xs font-mono border border-black/25 dark:border-[#e8dece]/20 bg-transparent px-3 py-1.5 focus:outline-none focus:border-black dark:focus:border-[#e8dece]/60 transition-colors text-black dark:text-[#e8dece]"
          >
            <option value="all">all agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-black">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 px-5 py-3 border-b border-black bg-black/[0.03] dark:bg-[#e8dece]/[0.03]">
          {[
            { label: "call id", span: "col-span-2" },
            { label: "agent", span: "col-span-3" },
            { label: "duration", span: "col-span-1" },
            { label: "empathy", span: "col-span-1" },
            { label: "outcome", span: "col-span-2" },
            { label: "tags", span: "col-span-2" },
            { label: "time", span: "col-span-1" },
          ].map((col) => (
            <div key={col.label} className={col.span}>
              <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40 uppercase tracking-widest">
                {col.label}
              </p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {paginated.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-mono text-black/30 dark:text-[#e8dece]/30">
              {calls.length === 0 ? "no calls yet — run a test call to populate logs" : "no calls match this filter"}
            </p>
          </div>
        )}

        {/* Rows */}
        {paginated.map((call, i) => (
          <Link
            key={call.id}
            href={`/calls/${call.id}`}
            className={`flex sm:grid sm:grid-cols-12 px-5 py-3.5 items-center gap-3 sm:gap-0 hover:bg-black/[0.03] dark:hover:bg-[#e8dece]/[0.03] transition-colors cursor-pointer ${
              i < paginated.length - 1 ? "border-b border-black" : ""
            } ${call.outcome === "abandoned" ? "opacity-50" : ""}`}
          >
            {/* ID */}
            <div className="col-span-2 min-w-0">
              <p className="text-xs font-mono truncate text-black/70 dark:text-[#e8dece]/70">
                {call.id.length > 20 ? call.id.slice(0, 8) + "…" + call.id.slice(-6) : call.id}
              </p>
            </div>

            {/* Agent */}
            <div className="col-span-3 min-w-0 flex-1 sm:flex-none">
              <p className="text-xs font-medium truncate">{call.agentName}</p>
              <p className="text-[9px] text-black/40 dark:text-[#e8dece]/40 truncate">{call.client}</p>
            </div>

            {/* Duration */}
            <div className="col-span-1 hidden sm:block">
              <p className="text-xs font-mono">{call.duration}</p>
            </div>

            {/* Empathy */}
            <div className="col-span-1 hidden sm:block">
              <p className="text-xs font-mono font-semibold">
                {call.empathyScore > 0 ? `${call.empathyScore}%` : "—"}
              </p>
            </div>

            {/* Outcome */}
            <div className="col-span-2 flex-shrink-0">
              <span className={`text-[10px] font-mono px-2 py-0.5 border inline-block ${outcomeBorder(call.outcome)}`}>
                {call.outcome}
              </span>
            </div>

            {/* Tags */}
            <div className="col-span-2 hidden sm:flex flex-wrap gap-1">
              {call.tags.slice(0, 3).map((t, j) => (
                <span
                  key={j}
                  className="text-[9px] font-mono bg-black/5 dark:bg-[#e8dece]/5 border border-black/10 dark:border-[#e8dece]/10 px-1.5 py-0.5"
                >
                  {t}
                </span>
              ))}
              {call.tags.length > 3 && (
                <span className="text-[9px] font-mono text-black/30 dark:text-[#e8dece]/30">
                  +{call.tags.length - 3}
                </span>
              )}
            </div>

            {/* Time */}
            <div className="col-span-1 hidden sm:block">
              <p className="text-[10px] font-mono text-black/40 dark:text-[#e8dece]/40">
                {call.timestamp?.slice(11, 16) ?? "—"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs font-mono text-black/30 dark:text-[#e8dece]/30">
          {filtered.length === 0
            ? "0 calls"
            : `showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="text-xs font-mono border border-black/20 dark:border-[#e8dece]/20 px-3 py-1.5 disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:border-black dark:hover:enabled:border-[#e8dece]/60 transition-colors"
          >
            ← prev
          </button>
          <span className="text-xs font-mono border border-black dark:border-[#e8dece]/40 px-3 py-1.5">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="text-xs font-mono border border-black/20 dark:border-[#e8dece]/20 px-3 py-1.5 disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:border-black dark:hover:enabled:border-[#e8dece]/60 transition-colors"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  );
}
