"use client";

import { useRef } from "react";
import type { LogFilters } from "@/lib/types/logs";
import { TimeRangePicker } from "@/components/filters/time-range-picker";

type Props = {
  filters: LogFilters;
  live: boolean;
  onLiveChange: (value: boolean) => void;
  onChange: (next: LogFilters) => void;
};

export function LogFiltersBar({
  filters,
  live,
  onLiveChange,
  onChange,
}: Props) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);

  const applySearch = (nextQuery: string) => {
    onChange({ ...filters, query: nextQuery.trim() });
  };

  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={queryInputRef}
          key={filters.query}
          defaultValue={filters.query}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applySearch(event.currentTarget.value);
            }
          }}
          placeholder="Search logs (e.g. level:error service:api timeout)"
          className="h-9 min-w-[320px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 transition focus:ring-2"
        />
        <button
          type="button"
          onClick={() => applySearch(queryInputRef.current?.value ?? filters.query)}
          className="h-9 cursor-pointer rounded-md border border-cyan-500/50 bg-cyan-600/20 px-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-600/30"
        >
          Search
        </button>
        <TimeRangePicker filters={filters} onChange={onChange} />
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
