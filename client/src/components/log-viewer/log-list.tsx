"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";
import { LogRow } from "@/components/log-item/log-row";
import type { Log } from "@/lib/types/logs";

type Props = {
  logs: Log[];
  selectedLogId: string | null;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  scrollToEndSignal: number;
  onReachEnd: () => void;
  onSelectLog: (log: Log) => void;
  onScrollStateChange: (isAtBottom: boolean) => void;
};

const ROW_HEIGHT = 40;

export function LogList({
  logs,
  selectedLogId,
  hasMore,
  isFetchingNextPage,
  scrollToEndSignal,
  onReachEnd,
  onSelectLog,
  onScrollStateChange,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);
  const lastRequestedKeyRef = useRef<string | null>(null);
  const data = useMemo(() => logs, [logs]);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!parentRef.current) return;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    parentRef.current.scrollTop = parentRef.current.scrollHeight;
  }, [scrollToEndSignal]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto overscroll-contain"
      onScroll={(event) => {
        const target = event.currentTarget;
        const isAtBottom =
          target.scrollHeight - target.scrollTop - target.clientHeight < 100;
        onScrollStateChange(isAtBottom);

        if (!isAtBottom || !hasMore || isFetchingNextPage) return;

        const lastLogId = data[data.length - 1]?.id ?? "";
        const requestKey = `${data.length}:${lastLogId}`;
        if (lastRequestedKeyRef.current === requestKey) return;

        lastRequestedKeyRef.current = requestKey;
        onReachEnd();
      }}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        <div
          className="absolute left-0 top-0 w-full"
          style={{ transform: `translateY(${virtualRows[0]?.start ?? 0}px)` }}
        >
          {virtualRows.map((row) => {
            const log = data[row.index];
            return (
              <div key={row.key} data-index={row.index} ref={rowVirtualizer.measureElement}>
                <LogRow
                  log={log}
                  selected={selectedLogId === log.id}
                  onClick={() => onSelectLog(log)}
                />
              </div>
            );
          })}
          {isFetchingNextPage && (
            <div className="px-4 py-3 text-xs text-zinc-500">Loading more logs...</div>
          )}
        </div>
      </div>
    </div>
  );
}
