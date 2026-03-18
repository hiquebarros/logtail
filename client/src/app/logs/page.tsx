"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { LogFiltersBar } from "@/components/filters/log-filters-bar";
import { LogTimeline } from "@/components/logs/LogTimeline";
import { LogDetailsPanel } from "@/components/log-viewer/log-details-panel";
import { LogList } from "@/components/log-viewer/log-list";
import { fetchLogsPage } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { Log, LogFilters } from "@/lib/types/logs";

const defaultFilters: LogFilters = {
  query: "",
  levels: [],
  services: [],
  environments: [],
  rangeMinutes: 60,
};

export default function LogsPage() {
  const initialNow = Date.now();
  const [filters, setFilters] = useState<LogFilters>(defaultFilters);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [liveLogs, setLiveLogs] = useState<Log[]>([]);
  const [live, setLive] = useState(false);
  const [scrollToEndSignal, setScrollToEndSignal] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [from, setFrom] = useState<number>(
    initialNow - defaultFilters.rangeMinutes * 60 * 1000
  );
  const [to, setTo] = useState<number>(initialNow);
  const debouncedQuery = useDebouncedValue(filters.query, 250);

  const stableFilters = useMemo(
    () => ({ ...filters, query: debouncedQuery }),
    [debouncedQuery, filters],
  );

  const logsQuery = useInfiniteQuery({
    queryKey: ["logs", stableFilters],
    queryFn: ({ pageParam }) =>
      fetchLogsPage({
        filters: stableFilters,
        pageParam,
        limit: 200,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  });

  const baseLogs = useMemo(
    () => logsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [logsQuery.data?.pages],
  );

  const logs = useMemo(() => [...baseLogs, ...liveLogs], [baseLogs, liveLogs]);
  const visibleLogs = useMemo(
    () =>
      logs.filter((log) => {
        const ts = new Date(log.timestamp).getTime();
        return Number.isFinite(ts) && ts >= from && ts <= to;
      }),
    [from, logs, to]
  );

  const availableServices = useMemo(() => {
    const fromApi = logsQuery.data?.pages[0]?.availableServices ?? [];
    return fromApi;
  }, [logsQuery.data?.pages]);

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

  useEffect(() => {
    const now = Date.now();
    setFrom(now - filters.rangeMinutes * 60 * 1000);
    setTo(now);
  }, [filters.rangeMinutes]);

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <LogFiltersBar
        filters={filters}
        services={availableServices}
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
          logs={logs}
          from={from}
          to={to}
          onRangeChange={(nextFrom, nextTo) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_420px]">
        <section className="min-h-0 border-r border-zinc-800">
          <div className="grid grid-cols-[190px_90px_1fr_120px_220px] gap-3 border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-500">
            <span>Timestamp</span>
            <span>Level</span>
            <span>Message</span>
            <span>Service</span>
            <span>Metadata</span>
          </div>
          <LogList
            logs={visibleLogs}
            selectedLogId={selectedLog?.id ?? null}
            hasMore={Boolean(logsQuery.hasNextPage)}
            isFetchingNextPage={logsQuery.isFetchingNextPage}
            scrollToEndSignal={scrollToEndSignal}
            onReachEnd={() => logsQuery.fetchNextPage()}
            onSelectLog={setSelectedLog}
            onScrollStateChange={setIsAtBottom}
          />
        </section>
        <LogDetailsPanel log={selectedLog} onClose={() => setSelectedLog(null)} />
      </div>
    </main>
  );
}
