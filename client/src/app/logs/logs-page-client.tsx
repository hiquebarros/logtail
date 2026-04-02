"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogFiltersBar } from "@/components/filters/log-filters-bar";
import { LogTimeline } from "@/components/logs/LogTimeline";
import { LogDetailsPanel } from "@/components/log-viewer/log-details-panel";
import { LogEmptyState } from "@/components/log-viewer/log-empty-state";
import { LogList } from "@/components/log-viewer/log-list";
import { fetchLogsPage, fetchSources } from "@/lib/api/client";
import type { Log, LogFilters, LogLevel } from "@/lib/types/logs";
import type { Source } from "@/lib/types/sources";
import { buildRelativeTimeRange, microsStringToMs, nowMicros } from "@/lib/utils/time-range";

function buildDefaultFilters(): LogFilters {
  return {
    applicationId: undefined,
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
    applicationId: params.get("applicationId")?.trim() || undefined,
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

function hasValidTimestamp(log: Log | null | undefined): log is Log {
  return Boolean(log && typeof log.timestamp === "string" && log.timestamp.length > 0);
}

function buildFiltersParams(filters: LogFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("rf", filters.timeRange.rf);
  params.set("rt", filters.timeRange.rt);

  if (filters.query.trim().length > 0) {
    params.set("query", filters.query.trim());
  }
  if (filters.applicationId) {
    params.set("applicationId", filters.applicationId);
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
  const hasApplicationSelected = Boolean(filters.applicationId);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [liveLogs, setLiveLogs] = useState<Log[]>([]);
  const [scrollToStartSignal, setScrollToStartSignal] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(isAtTop);
  const lastAutoScrollAtRef = useRef(0);
  const currentUrlParams = searchParams.toString();
  const filtersParams = useMemo(() => buildFiltersParams(filters), [filters]);
  const filtersParamsString = filtersParams.toString();
  const [rangeFromMs] = useMemo(() => {
    try {
      return [microsStringToMs(filters.timeRange.rf)] as const;
    } catch {
      const fallback = buildRelativeTimeRange(120);
      return [microsStringToMs(fallback.rf)] as const;
    }
  }, [filters.timeRange.rf, filters.timeRange.rt]);

  useEffect(() => {
    if (currentUrlParams === filtersParamsString) {
      return;
    }
    const nextUrl = `${pathname}?${filtersParamsString}`;
    router.replace(nextUrl, { scroll: false });
  }, [currentUrlParams, filtersParamsString, pathname, router]);

  const logsQuery = useInfiniteQuery({
    queryKey: ["logs", filters],
    queryFn: ({ pageParam }) =>
      fetchLogsPage({
        filters,
        pageParam,
        limit: 100,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: hasApplicationSelected,
  });
  const sourcesQuery = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });
  const sources = useMemo<Source[]>(() => sourcesQuery.data?.data ?? [], [sourcesQuery.data?.data]);

  const handleReachEnd = useCallback(() => {
    if (!logsQuery.hasNextPage || logsQuery.isFetchingNextPage) return;
    void logsQuery.fetchNextPage();
  }, [logsQuery.fetchNextPage, logsQuery.hasNextPage, logsQuery.isFetchingNextPage]);

  const baseLogs = useMemo(
    () => logsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [logsQuery.data?.pages],
  );

  const logs = useMemo(
    () => [...liveLogs, ...baseLogs].filter(hasValidTimestamp),
    [baseLogs, liveLogs],
  );
  const effectiveRangeToMs = Date.now();
  const visibleLogs = useMemo(
    () =>
      logs.filter((log) => {
        const ts = Number(new Date(log.timestamp));
        return Number.isFinite(ts) && ts >= rangeFromMs && ts <= effectiveRangeToMs;
      }),
    [effectiveRangeToMs, logs, rangeFromMs],
  );

  useEffect(() => {
    isAtTopRef.current = isAtTop;
  }, [isAtTop]);

  useEffect(() => {
    if (!filters.applicationId) return;

    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = async (): Promise<void> => {
      try {
        const tokenResponse = await fetch(
          `/api/logs/ws-token?applicationId=${encodeURIComponent(filters.applicationId ?? "")}`,
          { cache: "no-store" },
        );
        if (!tokenResponse.ok || cancelled) {
          return;
        }
        const tokenPayload = (await tokenResponse.json()) as { token?: string };
        if (!tokenPayload.token || cancelled) {
          return;
        }

        const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
        const effectiveApiBaseUrl =
          !configuredApiBaseUrl || configuredApiBaseUrl.includes("://server:")
            ? `${window.location.protocol}//${window.location.hostname}:3001`
            : configuredApiBaseUrl;
        const wsBaseUrl = effectiveApiBaseUrl.replace(/^http/i, "ws");
        const wsUrl = new URL(`${wsBaseUrl}/logs/ws`);
        wsUrl.searchParams.set("token", tokenPayload.token);

        socket = new WebSocket(wsUrl.toString());
        socket.onmessage = (event) => {
          const payload = JSON.parse(event.data) as { type?: string; data?: Log };
          if (payload.type !== "log" || !payload.data) {
            return;
          }

          setLiveLogs((current) => {
            const merged = [payload.data as Log, ...current];
            return merged.length > 1000 ? merged.slice(0, 1000) : merged;
          });
          if (isAtTopRef.current) {
            const now = Date.now();
            if (now - lastAutoScrollAtRef.current >= 200) {
              lastAutoScrollAtRef.current = now;
              setScrollToStartSignal((value) => value + 1);
            }
          }
        };
      } catch {
        // Ignore setup errors and wait for next dependency change to reconnect.
      }
    };

    void connect();

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [filters.applicationId]);

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <LogFiltersBar
        filters={filters}
        sources={sources}
        sourcesLoading={sourcesQuery.isLoading}
        initiallyOpen={!initialFilters.applicationId}
        onChange={(next) => {
          setFilters(next);
          setLiveLogs([]);
        }}
      />
      <div className="border-b border-zinc-800 px-3 py-2">
        {hasApplicationSelected ? (
          <LogTimeline
            filters={filters}
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
        ) : (
          <div className="h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-950" />
        )}
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
          {!hasApplicationSelected ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <p className="text-lg font-medium text-zinc-100">Start by choosing a source</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Please use the top-left selector to choose the sources you&apos;d like to
                  search logs from.
                </p>
              </div>
            </div>
          ) : visibleLogs.length === 0 && !logsQuery.isLoading ? (
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
                hasMore={false}
                isFetchingNextPage={logsQuery.isFetchingNextPage}
                scrollToStartSignal={scrollToStartSignal}
                onReachEnd={handleReachEnd}
                onSelectLog={setSelectedLog}
                onScrollStateChange={setIsAtTop}
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
