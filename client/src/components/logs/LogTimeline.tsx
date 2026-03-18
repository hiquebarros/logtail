"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TimelineLog = {
  timestamp: string;
  level: string;
  message: string;
};

type TimelineBucket = {
  ts: number;
  count: number;
};

type LogTimelineProps = {
  logs: TimelineLog[];
  from: number;
  to: number;
  onRangeChange: (from: number, to: number) => void;
};

type EChartsModule = {
  init: (element: HTMLDivElement) => EChartsInstance;
};

type EChartsInstance = {
  setOption: (option: unknown, opts?: { notMerge?: boolean }) => void;
  resize: () => void;
  dispose: () => void;
  on: (eventName: string, handler: (params: unknown) => void) => void;
  getZr: () => {
    on: (eventName: string, handler: (event: { offsetX: number }) => void) => void;
    off: (eventName: string) => void;
  };
};

type ClickParams = {
  dataIndex?: number;
};

declare global {
  interface Window {
    echarts?: EChartsModule;
  }
}

const ECHARTS_CDN = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";

export function getBucketSize(rangeMs: number): number {
  if (rangeMs <= 15 * 60 * 1000) {
    return 1000;
  }
  if (rangeMs <= 60 * 60 * 1000) {
    return 5000;
  }
  if (rangeMs <= 12 * 60 * 60 * 1000) {
    return 5 * 60 * 1000;
  }
  if (rangeMs <= 24 * 60 * 60 * 1000) {
    return 10 * 60 * 1000;
  }

  return 10 * 60 * 1000;
}

function floorToBucket(ts: number, bucketSize: number): number {
  return Math.floor(ts / bucketSize) * bucketSize;
}

function aggregateBuckets(
  logs: TimelineLog[],
  from: number,
  to: number,
  bucketSize: number
): TimelineBucket[] {
  const safeFrom = Math.min(from, to);
  const safeTo = Math.max(from, to);
  const start = floorToBucket(safeFrom, bucketSize);
  const end = floorToBucket(safeTo, bucketSize);
  const counts = new Map<number, number>();

  for (const log of logs) {
    const ts = new Date(log.timestamp).getTime();
    if (!Number.isFinite(ts) || ts < safeFrom || ts > safeTo) {
      continue;
    }

    const bucketTs = floorToBucket(ts, bucketSize);
    counts.set(bucketTs, (counts.get(bucketTs) ?? 0) + 1);
  }

  const buckets: TimelineBucket[] = [];
  for (let ts = start; ts <= end; ts += bucketSize) {
    buckets.push({ ts, count: counts.get(ts) ?? 0 });
  }

  return buckets;
}

function loadECharts(): Promise<EChartsModule> {
  return new Promise((resolve, reject) => {
    if (window.echarts) {
      resolve(window.echarts);
      return;
    }

    const existing = document.querySelector(
      `script[src="${ECHARTS_CDN}"]`
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener("load", () => {
        if (window.echarts) {
          resolve(window.echarts);
          return;
        }
        reject(new Error("ECharts failed to initialize"));
      });
      existing.addEventListener("error", () => reject(new Error("Failed to load ECharts")));
      return;
    }

    const script = document.createElement("script");
    script.src = ECHARTS_CDN;
    script.async = true;
    script.onload = () => {
      if (window.echarts) {
        resolve(window.echarts);
        return;
      }
      reject(new Error("ECharts failed to initialize"));
    };
    script.onerror = () => reject(new Error("Failed to load ECharts"));
    document.head.appendChild(script);
  });
}

export function LogTimeline({ logs, from, to, onRangeChange }: LogTimelineProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<EChartsInstance | null>(null);
  const bucketsRef = useRef<TimelineBucket[]>([]);
  const fromRef = useRef(from);
  const toRef = useRef(to);
  const bucketSizeRef = useRef(1000);
  const onRangeChangeRef = useRef(onRangeChange);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const rangeMs = Math.max(to - from, 1000);
  const bucketSize = useMemo(() => getBucketSize(rangeMs), [rangeMs]);
  const buckets = useMemo(
    () => aggregateBuckets(logs, from, to, bucketSize),
    [logs, from, to, bucketSize]
  );
  const chartCounts = useMemo(() => buckets.map((bucket) => bucket.count), [buckets]);
  const maxBucketCount = useMemo(
    () => buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    [buckets]
  );
  const nonZeroBuckets = useMemo(
    () => buckets.filter((bucket) => bucket.count > 0).length,
    [buckets]
  );
  const totalLogsInRange = useMemo(
    () => buckets.reduce((acc, bucket) => acc + bucket.count, 0),
    [buckets]
  );

  useEffect(() => {
    bucketsRef.current = buckets;
    fromRef.current = from;
    toRef.current = to;
    bucketSizeRef.current = bucketSize;
    onRangeChangeRef.current = onRangeChange;
  }, [buckets, bucketSize, from, onRangeChange, to]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!chartRef.current) {
        return;
      }

      try {
        const echarts = await loadECharts();
        if (cancelled || !chartRef.current) {
          return;
        }

        instanceRef.current = echarts.init(chartRef.current);
        const zr = instanceRef.current.getZr();
        zr.on("mousemove", (event) => {
          setCursorX(event.offsetX);
        });
        zr.on("globalout", () => {
          setCursorX(null);
        });

        instanceRef.current.on("click", (rawParams) => {
          const params = rawParams as ClickParams;
          const dataIndex =
            typeof params.dataIndex === "number" ? params.dataIndex : Number.NaN;
          const localBuckets = bucketsRef.current;
          const clickedTs =
            Number.isFinite(dataIndex) && localBuckets[dataIndex]
              ? localBuckets[dataIndex].ts
              : Number.NaN;
          if (!Number.isFinite(clickedTs)) {
            return;
          }
          const clickedBucket =
            Number.isFinite(dataIndex) && localBuckets[dataIndex]
              ? localBuckets[dataIndex]
              : undefined;
          if (!clickedBucket || clickedBucket.count === 0) {
            return;
          }

          const windowMs = bucketSizeRef.current * 20;
          const half = windowMs / 2;
          const newFrom = Math.max(fromRef.current, clickedTs - half);
          const newTo = Math.min(toRef.current, clickedTs + half);

          if (newTo - newFrom < bucketSizeRef.current) {
            return;
          }

          onRangeChangeRef.current(newFrom, newTo);
        });

        setIsReady(true);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Failed to load chart");
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        instanceRef.current.dispose();
        instanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !isReady) {
      return;
    }

    instance.setOption(
      {
        animation: false,
        grid: { left: 6, right: 6, top: 8, bottom: 8 },
        tooltip: {
          trigger: "item",
          formatter: (item: { dataIndex?: number; value?: number }) => {
            const dataIndex =
              typeof item.dataIndex === "number" ? item.dataIndex : Number.NaN;
            if (!Number.isFinite(dataIndex) || !buckets[dataIndex]) {
              return "";
            }
            const bucket = buckets[dataIndex];
            const label = new Date(bucket.ts).toLocaleString();
            const count = typeof item.value === "number" ? item.value : bucket.count;
            return `${label}<br/>${count} logs`;
          }
        },
        xAxis: {
          type: "category",
          data: buckets.map((bucket) => String(bucket.ts)),
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { show: false },
          splitLine: { show: false }
        },
        yAxis: {
          type: "value",
          show: false,
          min: 0,
          minInterval: 1,
          max: Math.max(1, maxBucketCount)
        },
        series: [
          {
            type: "bar",
            barMinHeight: 0,
            barCategoryGap: "0%",
            barGap: "0%",
            barWidth: "90%",
            itemStyle: {
              color: (params: { value: number }) =>
                params.value > 0 ? "#06b6d4" : "rgba(63, 63, 70, 0.35)"
            },
            emphasis: {
              itemStyle: {
                color: "#67e8f9"
              }
            },
            data: chartCounts
          }
        ]
      },
      { notMerge: true }
    );

    const onResize = () => instance.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [buckets, chartCounts, from, isReady, maxBucketCount, to]);

  if (loadError) {
    return (
      <div className="h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
        {loadError}
      </div>
    );
  }

  return (
    <div className="relative h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-950">
      <div ref={chartRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-2 top-1 text-[10px] text-zinc-500">
        {totalLogsInRange} logs in range
      </div>
      <div className="pointer-events-none absolute right-2 top-1 text-[10px] text-zinc-600">
        bucket {Math.round(bucketSize / 1000)}s
      </div>
      {nonZeroBuckets === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
          No logs in selected range
        </div>
      ) : null}
      {cursorX !== null ? (
        <div
          className="pointer-events-none absolute top-0 h-full w-px bg-cyan-400/40"
          style={{ left: `${cursorX}px` }}
        />
      ) : null}
    </div>
  );
}
