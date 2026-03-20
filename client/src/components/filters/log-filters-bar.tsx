"use client";

import { useEffect, useState } from "react";
import type { LogFilters } from "@/lib/types/logs";
import { buildRelativeTimeRange } from "@/lib/utils/time-range";

type Props = {
  filters: LogFilters;
  live: boolean;
  onLiveChange: (value: boolean) => void;
  onChange: (next: LogFilters) => void;
};

const RANGE_OPTIONS = [
  { label: "Last 5 minutes", value: "5m", minutes: 5 },
  { label: "Last 15 minutes", value: "15m", minutes: 15 },
  { label: "Last 1 hour", value: "1h", minutes: 60 },
  { label: "Last 2 hours", value: "2h", minutes: 2 * 60 },
  { label: "Last 6 hours", value: "6h", minutes: 6 * 60 },
  { label: "Last 12 hours", value: "12h", minutes: 12 * 60 },
  { label: "Last 24 hours", value: "24h", minutes: 24 * 60 },
  { label: "Last 7 days", value: "7d", minutes: 7 * 24 * 60 },
  { label: "Last 30 days", value: "30d", minutes: 30 * 24 * 60 },
];

const ZERO_BIGINT = BigInt(0);
const MICROSECONDS_IN_MINUTE = BigInt(60) * BigInt(1_000_000);

export function LogFiltersBar({
  filters,
  live,
  onLiveChange,
  onChange,
}: Props) {
  const [draftQuery, setDraftQuery] = useState(filters.query);

  useEffect(() => {
    setDraftQuery(filters.query);
  }, [filters.query]);

  const applySearch = () => {
    onChange({ ...filters, query: draftQuery.trim() });
  };

  const selectedRangeValue = (() => {
    try {
      const rf = BigInt(filters.timeRange.rf);
      const rt = BigInt(filters.timeRange.rt);
      const diff = rt - rf;
      if (diff <= ZERO_BIGINT || diff % MICROSECONDS_IN_MINUTE !== ZERO_BIGINT) {
        return "";
      }
      const minutes = Number(diff / MICROSECONDS_IN_MINUTE);
      const matched = RANGE_OPTIONS.find((option) => option.minutes === minutes);
      return matched?.value ?? "";
    } catch {
      return "";
    }
  })();

  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applySearch();
            }
          }}
          placeholder="Search logs (e.g. level:error service:api timeout)"
          className="h-9 min-w-[320px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition focus:ring-2"
        />
        <button
          type="button"
          onClick={applySearch}
          className="h-9 cursor-pointer rounded-md border border-cyan-500/50 bg-cyan-600/20 px-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-600/30"
        >
          Search
        </button>
        <select
          value={selectedRangeValue}
          onChange={(event) => {
            const selected = RANGE_OPTIONS.find((option) => option.value === event.target.value);
            if (!selected) return;
            onChange({
              ...filters,
              timeRange: buildRelativeTimeRange(selected.minutes),
            });
          }}
          className="h-9 min-w-[170px] rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition focus:ring-2"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onLiveChange(!live)}
          className={`h-9 cursor-pointer rounded-md border px-3 text-sm font-medium transition ${
            live
              ? "border-emerald-500/50 bg-emerald-600/20 text-emerald-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Live
        </button>
      </div>

    </div>
  );
}
