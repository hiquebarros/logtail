"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LogFilters } from "@/lib/types/logs";
import type { Source } from "@/lib/types/sources";
import { TimeRangePicker } from "@/components/filters/time-range-picker";

type Props = {
  filters: LogFilters;
  sources: Source[];
  sourcesLoading: boolean;
  initiallyOpen?: boolean;
  onChange: (next: LogFilters) => void;
};

const SOURCE_DROPDOWN_OPEN_DELAY_MS = 120;

export function LogFiltersBar({
  filters,
  sources,
  sourcesLoading,
  initiallyOpen = false,
  onChange,
}: Props) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const sourceSearchInputRef = useRef<HTMLInputElement | null>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(initiallyOpen);
  const [sourceSearch, setSourceSearch] = useState("");
  const selectedSource = useMemo(
    () => sources.find((source) => source.id === filters.applicationId) ?? null,
    [filters.applicationId, sources],
  );
  const filteredSources = useMemo(() => {
    const query = sourceSearch.trim().toLowerCase();
    if (!query) {
      return sources;
    }
    return sources.filter((source) => {
      const target = `${source.name} ${source.language}`.toLowerCase();
      return target.includes(query);
    });
  }, [sourceSearch, sources]);

  const applySearch = (nextQuery: string) => {
    onChange({ ...filters, query: nextQuery.trim() });
  };

  useEffect(() => {
    if (!isSourceMenuOpen) {
      return;
    }

    const focusTimer = setTimeout(() => {
      sourceSearchInputRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
    };
  }, [isSourceMenuOpen]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        clearTimeout(openTimerRef.current);
        openTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              if (openTimerRef.current) {
                clearTimeout(openTimerRef.current);
                openTimerRef.current = null;
              }

              if (isSourceMenuOpen) {
                setIsSourceMenuOpen(false);
                return;
              }

              openTimerRef.current = setTimeout(() => {
                setIsSourceMenuOpen(true);
                openTimerRef.current = null;
              }, SOURCE_DROPDOWN_OPEN_DELAY_MS);
            }}
            className="inline-flex h-9 min-w-[190px] items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 transition hover:bg-zinc-800"
          >
            <span className="truncate">{selectedSource ? selectedSource.name : "Select source"}</span>
            <span className="text-xs text-zinc-500">v</span>
          </button>
          {isSourceMenuOpen ? (
            <div className="absolute left-0 z-20 mt-2 w-[320px] rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
              <div className="space-y-2 border-b border-zinc-800 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100">Sources</h3>
                </div>
                <input
                  ref={sourceSearchInputRef}
                  value={sourceSearch}
                  onChange={(event) => setSourceSearch(event.target.value)}
                  placeholder="Search"
                  className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none ring-cyan-500 focus:ring-2"
                />
              </div>
              <div className="max-h-64 overflow-auto p-2">
                {sourcesLoading ? (
                  <div className="px-2 py-4 text-xs text-zinc-500">Loading sources...</div>
                ) : filteredSources.length === 0 ? (
                  <div className="px-2 py-4 text-xs text-zinc-500">No sources found</div>
                ) : (
                  filteredSources.map((source) => {
                    const isSelected = source.id === filters.applicationId;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => {
                          onChange({ ...filters, applicationId: source.id });
                          setIsSourceMenuOpen(false);
                        }}
                        className={`mb-1 flex w-full items-center justify-between rounded-md border px-2 py-2 text-left transition ${
                          isSelected
                            ? "border-cyan-500/60 bg-cyan-500/10"
                            : "border-zinc-800 bg-zinc-950 hover:bg-zinc-800"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm text-zinc-100">{source.name}</div>
                          <div className="truncate text-xs text-zinc-500">{source.language}</div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide text-zinc-500">Logs</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
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
      </div>

    </div>
  );
}
