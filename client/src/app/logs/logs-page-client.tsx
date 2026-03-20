"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogFiltersBar } from "@/components/filters/log-filters-bar";
import { LogTimeline } from "@/components/logs/LogTimeline";
import { LogDetailsPanel } from "@/components/log-viewer/log-details-panel";
import { LogEmptyState } from "@/components/log-viewer/log-empty-state";
import { LogList } from "@/components/log-viewer/log-list";
import { fetchLogsPage } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { Log, LogFilters, LogLevel } from "@/lib/types/logs";
import { buildRelativeTimeRange, microsStringToMs, nowMicros } from "@/lib/utils/time-range";

function buildDefaultFilters(): LogFilters {
  return {
    query: "",
    levels: [],
    services: [],
    environments: [],
    timeRange: buildRelativeTimeRange(120),
  };
}

function isLogLevel(value: string): value is LogLevel {
  return value === "info" || value === "warn" || value === "error";
}

function isEnvironment(value: string): value is Log["environment"] {
  return value === "prod" || value === "staging" || value === "dev";
}

function parseCsv<T extends string>(
  raw: string | null,
  validator: (value: string) => value is T,
): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(validator);
}

function parseTimeRangeFromParams(params: URLSearchParams): LogFilters["timeRange"] {
  const rf = params.get("rf");
  const rt = params.get("rt");
  if (!rf || !rt) {
    return buildDefaultFilters().timeRange;
  }

  try {
    const rfUs = BigInt(rf);
    const rtUs = BigInt(rt);
    if (rfUs > rtUs) {
      return buildDefaultFilters().timeRange;
    }
    return { rf: rfUs.toString(), rt: rtUs.toString() };
  } catch {
    return buildDefaultFilters().timeRange;
  }
}

function parseFiltersFromParams(params: URLSearchParams): LogFilters {
  return {
    query: params.get("query")?.trim() ?? "",
    levels: parseCsv(params.get("levels"), isLogLevel),
    services:
      params
        .get("services")
        ?.split(",")
        .map((service) => service.trim())
        .filter(Boolean) ?? [],
    environments: parseCsv(params.get("environments"), isEnvironment),
    timeRange: parseTimeRangeFromParams(params),
  };
}

function buildFiltersParams(filters: LogFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("rf", filters.timeRange.rf);
  params.set("rt", filters.timeRange.rt);

  if (filters.query.trim().length > 0) {
    params.set("query", filters.query.trim());
  }
  if (filters.levels.length > 0) {
    params.set("levels", filters.levels.join(","));
  }
  if (filters.services.length > 0) {
    params.set("services", filters.services.join(","));
  }
  if (filters.environments.length > 0) {
    params.set("environments", filters.environments.join(","));
  }

  return params;
}

const ONE_DAY_IN_MICROS = BigInt(24) * BigInt(60) * BigInt(60) * BigInt(1_000_000);
const ZERO_BIGINT = BigInt(0);

export function LogsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilters = useMemo(
    () => parseFiltersFromParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [filters, setFilters] = useState<LogFilters>(initialFilters);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [liveLogs, setLiveLogs] = useState<Log[]>([]);
  const [live, setLive] = useState(false);
  const [scrollToEndSignal, setScrollToEndSignal] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const currentUrlParams = searchParams.toString();
  const filtersParams = useMemo(() => buildFiltersParams(filters), [filters]);
  const filtersParamsString = filtersParams.toString();
  const debouncedQuery = useDebouncedValue(filters.query, 250);
  const [rangeFromMs, rangeToMs] = useMemo(() => {
    try {
      return [
        microsStringToMs(filters.timeRange.rf),
        microsStringToMs(filters.timeRange.rt),
      ] as const;
    } catch {
      const fallback = buildRelativeTimeRange(120);
      return [microsStringToMs(fallback.rf), microsStringToMs(fallback.rt)] as const;
    }
  }, [filters.timeRange.rf, filters.timeRange.rt]);

  const stableFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    [debouncedQuery, filters],
  );

  useEffect(() => {
    if (currentUrlParams === filtersParamsString) {
      return;
    }
    const nextUrl = `${pathname}?${filtersParamsString}`;
    router.replace(nextUrl, { scroll: false });
  }, [currentUrlParams, filtersParamsString, pathname, router]);

  const logsQuery = useInfiniteQuery({
    queryKey: ["logs", stableFilters],
    queryFn: ({ pageParam }) =>
      fetchLogsPage({
        filters: stableFilters,
        pageParam,
        limit: 100,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  });

  const handleReachEnd = useCallback(() => {
    if (!logsQuery.hasNextPage || logsQuery.isFetchingNextPage) return;
    void logsQuery.fetchNextPage();
  }, [logsQuery.fetchNextPage, logsQuery.hasNextPage, logsQuery.isFetchingNextPage]);

  const baseLogs = useMemo(
    () => logsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [logsQuery.data?.pages],
  );

  const logs = useMemo(() => [...baseLogs, ...liveLogs], [baseLogs, liveLogs]);
  const visibleLogs = useMemo(
    () =>
      logs.filter((log) => {
        const ts = new Date(log.timestamp).getTime();
        return Number.isFinite(ts) && ts >= rangeFromMs && ts <= rangeToMs;
      }),
    [logs, rangeFromMs, rangeToMs],
  );

  useEffect(() => {
    if (!live) return;

    const eventSource = new EventSource("/api/logs/stream");
    eventSource.addEventListener("log", (event) => {
      const next = JSON.parse((event as MessageEvent).data) as Log;
      setLiveLogs((current) => {
        const merged = [...current, next];
        return merged.length > 1000 ? merged.slice(-1000) : merged;
      });
      if (isAtBottom) {
        setScrollToEndSignal((value) => value + 1);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [isAtBottom, live]);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <LogFiltersBar
        filters={filters}
        live={live}
        onLiveChange={(value) => {
          setLive(value);
          if (!value) {
            setLiveLogs([]);
          }
        }}
        onChange={(next) => {
          setFilters(next);
          setLiveLogs([]);
        }}
      />
      <div className="border-b border-zinc-800 px-3 py-2">
        <LogTimeline
          filters={stableFilters}
          onRangeChange={(rf, rt) => {
            setFilters((current) => ({
              ...current,
              timeRange: {
                rf,
                rt,
              },
            }));
            setLiveLogs([]);
          }}
        />
      </div>
      <div
        className={`grid min-h-0 flex-1 overflow-hidden ${selectedLog ? "grid-cols-[1fr_560px]" : "grid-cols-[1fr]"}`}
      >
        <section className="flex min-h-0 flex-col overflow-hidden border-r border-zinc-800">
          {visibleLogs.length > 0 ? (
            <div className="grid shrink-0 grid-cols-[190px_90px_1fr_120px_220px] gap-3 border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500">
              <span>Timestamp</span>
              <span>Level</span>
              <span>Message</span>
              <span>Service</span>
              <span>Metadata</span>
            </div>
          ) : null}
          {visibleLogs.length === 0 && !logsQuery.isLoading ? (
            <LogEmptyState
              onSearchOneMoreDay={() => {
                setFilters((current) => {
                  try {
                    const rf = BigInt(current.timeRange.rf);
                    const nextRf = rf > ONE_DAY_IN_MICROS ? rf - ONE_DAY_IN_MICROS : ZERO_BIGINT;
                    return {
                      ...current,
                      timeRange: {
                        rf: nextRf.toString(),
                        rt: current.timeRange.rt,
                      },
                    };
                  } catch {
                    return {
                      ...current,
                      timeRange: buildRelativeTimeRange(24 * 2),
                    };
                  }
                });
                setLiveLogs([]);
              }}
              onSearchEverything={() => {
                setFilters((current) => ({
                  ...current,
                  timeRange: {
                    rf: "0",
                    rt: nowMicros().toString(),
                  },
                }));
                setLiveLogs([]);
              }}
            />
          ) : (
            <div className="min-h-0 flex-1">
              <LogList
                logs={visibleLogs}
                selectedLogId={selectedLog?.id ?? null}
                hasMore={Boolean(logsQuery.hasNextPage)}
                isFetchingNextPage={logsQuery.isFetchingNextPage}
                scrollToEndSignal={scrollToEndSignal}
                onReachEnd={handleReachEnd}
                onSelectLog={setSelectedLog}
                onScrollStateChange={setIsAtBottom}
              />
            </div>
          )}
        </section>
        {selectedLog ? (
          <LogDetailsPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
        ) : null}
      </div>
    </main>
  );
}
