"use client";

import type { Log, LogFilters, LogLevel } from "@/lib/types/logs";

type Props = {
  filters: LogFilters;
  services: string[];
  live: boolean;
  onLiveChange: (value: boolean) => void;
  onChange: (next: LogFilters) => void;
};

const RANGE_OPTIONS = [
  { label: "5m", value: 5 },
  { label: "1h", value: 60 },
  { label: "12h", value: 12 * 60 },
  { label: "24h", value: 24 * 60 },
];

const LEVELS: LogLevel[] = ["info", "warn", "error"];
const ENVIRONMENTS: Log["environment"][] = ["prod", "staging", "dev"];

function toggleInArray<T>(array: T[], value: T): T[] {
  return array.includes(value)
    ? array.filter((item) => item !== value)
    : [...array, value];
}

export function LogFiltersBar({
  filters,
  services,
  live,
  onLiveChange,
  onChange,
}: Props) {
  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filters.query}
          onChange={(event) => onChange({ ...filters, query: event.target.value })}
          placeholder="Search logs (e.g. level:error service:api timeout)"
          className="h-9 min-w-[320px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition focus:ring-2"
        />
        <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-900 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...filters, rangeMinutes: option.value })}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs transition ${
                filters.rangeMinutes === option.value
                  ? "bg-cyan-600 text-white"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
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
