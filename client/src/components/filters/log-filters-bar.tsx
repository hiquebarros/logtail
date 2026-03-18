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
              className={`rounded px-2.5 py-1 text-xs transition ${
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
          className={`h-9 rounded-md border px-3 text-sm font-medium transition ${
            live
              ? "border-emerald-500/50 bg-emerald-600/20 text-emerald-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Live
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  levels: toggleInArray(filters.levels, level),
                })
              }
              className={`rounded border px-2 py-1 uppercase tracking-wide ${
                filters.levels.includes(level)
                  ? "border-cyan-500 bg-cyan-500/20 text-cyan-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {ENVIRONMENTS.map((env) => (
            <button
              key={env}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  environments: toggleInArray(filters.environments, env),
                })
              }
              className={`rounded border px-2 py-1 ${
                filters.environments.includes(env)
                  ? "border-violet-500 bg-violet-500/20 text-violet-200"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {env}
            </button>
          ))}
        </div>

        <select
          value=""
          onChange={(event) => {
            const service = event.target.value;
            if (!service) return;
            onChange({
              ...filters,
              services: toggleInArray(filters.services, service),
            });
            event.target.value = "";
          }}
          className="h-7 rounded border border-zinc-700 bg-zinc-900 px-2 text-zinc-200"
        >
          <option value="">Add service filter</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>

        {filters.services.map((service) => (
          <button
            key={service}
            type="button"
            onClick={() =>
              onChange({
                ...filters,
                services: filters.services.filter((item) => item !== service),
              })
            }
            className="rounded border border-amber-500/60 bg-amber-500/10 px-2 py-1 text-amber-200"
          >
            service:{service} x
          </button>
        ))}
      </div>
    </div>
  );
}
