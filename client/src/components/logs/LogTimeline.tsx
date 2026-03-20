"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchLogsHistogram } from "@/lib/api/client";
import type { LogFilters, LogHistogramBucket } from "@/lib/types/logs";
import { microsStringToMs, msToMicrosString } from "@/lib/utils/time-range";

type LogTimelineProps = {
  filters: LogFilters;
  onRangeChange: (rf: string, rt: string) => void;
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
  value?: [number, number] | number;
};

declare global {
  interface Window {
    echarts?: EChartsModule;
  }
}

const ECHARTS_CDN = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
const MIN_BUCKET_MS = 1000;
const MAX_CLIENT_BUCKETS = 5000;

type TimelineBucket = {
  ts: number;
  count: number;
};

function floorToBucket(ts: number, bucketSizeMs: number): number {
  return Math.floor(ts / bucketSizeMs) * bucketSizeMs;
}

function formatBucketSize(bucketSizeMs: number): string {
  if (bucketSizeMs < 60_000) {
    return `${Math.max(1, Math.round(bucketSizeMs / 1000))}s`;
  }
  if (bucketSizeMs < 60 * 60_000) {
    return `${Math.max(1, Math.round(bucketSizeMs / 60_000))}m`;
  }
  if (bucketSizeMs < 24 * 60 * 60_000) {
    return `${Math.max(1, Math.round(bucketSizeMs / (60 * 60_000)))}h`;
  }
  return `${Math.max(1, Math.round(bucketSizeMs / (24 * 60 * 60_000)))}d`;
}

function densifyBuckets(input: {
  sparseBuckets: LogHistogramBucket[];
  fromMs: number;
  toMs: number;
  bucketSizeMs: number;
}): TimelineBucket[] {
  const safeBucketSize = Math.max(input.bucketSizeMs, MIN_BUCKET_MS);
  const safeFrom = Math.min(input.fromMs, input.toMs);
  const safeTo = Math.max(input.fromMs, input.toMs);
  const start = floorToBucket(safeFrom, safeBucketSize);
  const end = floorToBucket(safeTo, safeBucketSize);
  const sparseMap = new Map<number, number>();

  for (const bucket of input.sparseBuckets) {
    if (!Number.isFinite(bucket.ts) || !Number.isFinite(bucket.count)) {
      continue;
    }
    const normalizedTs = floorToBucket(bucket.ts, safeBucketSize);
    sparseMap.set(normalizedTs, (sparseMap.get(normalizedTs) ?? 0) + bucket.count);
  }

  const dense: TimelineBucket[] = [];
  let count = 0;
  for (let ts = start; ts <= end; ts += safeBucketSize) {
    dense.push({ ts, count: sparseMap.get(ts) ?? 0 });
    count += 1;
    if (count >= MAX_CLIENT_BUCKETS) {
      break;
    }
  }

  return dense;
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

export function LogTimeline({ filters, onRangeChange }: LogTimelineProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<EChartsInstance | null>(null);
  const bucketsRef = useRef<TimelineBucket[]>([]);
  const [fromMs, toMs] = useMemo(() => {
    try {
      return [microsStringToMs(filters.timeRange.rf), microsStringToMs(filters.timeRange.rt)] as const;
    } catch {
      return [0, 1_000] as const;
    }
  }, [filters.timeRange.rf, filters.timeRange.rt]);
  const histogramQuery = useQuery({
    queryKey: ["logs-histogram", filters],
    queryFn: () => fetchLogsHistogram({ filters }),
  });
  const sparseBuckets = useMemo(
    () => histogramQuery.data?.buckets ?? [],
    [histogramQuery.data?.buckets],
  );
  const bucketSize = Math.max(histogramQuery.data?.bucketSizeMs ?? MIN_BUCKET_MS, MIN_BUCKET_MS);
  const totalLogsInRange = histogramQuery.data?.totalInRange ?? 0;
  const buckets = useMemo(
    () =>
      densifyBuckets({
        sparseBuckets,
        fromMs,
        toMs,
        bucketSizeMs: bucketSize,
      }),
    [bucketSize, fromMs, sparseBuckets, toMs],
  );
  const fromRef = useRef(fromMs);
  const toRef = useRef(toMs);
  const bucketSizeRef = useRef(MIN_BUCKET_MS);
  const onRangeChangeRef = useRef(onRangeChange);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const chartPoints = useMemo(() => buckets.map((bucket) => [bucket.ts, bucket.count] as const), [buckets]);
  const maxBucketCount = useMemo(
    () => buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    [buckets],
  );
  const nonZeroBuckets = useMemo(
    () => buckets.filter((bucket) => bucket.count > 0).length,
    [buckets],
  );

  useEffect(() => {
    bucketsRef.current = buckets;
    fromRef.current = fromMs;
    toRef.current = toMs;
    bucketSizeRef.current = bucketSize;
    onRangeChangeRef.current = onRangeChange;
  }, [buckets, bucketSize, fromMs, onRangeChange, toMs]);

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
              : Array.isArray(params.value) && typeof params.value[0] === "number"
                ? params.value[0]
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

          onRangeChangeRef.current(msToMicrosString(newFrom), msToMicrosString(newTo));
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
          formatter: (item: { dataIndex?: number; value?: [number, number] | number }) => {
            const dataIndex =
              typeof item.dataIndex === "number" ? item.dataIndex : Number.NaN;
            if (!Number.isFinite(dataIndex) || !buckets[dataIndex]) {
              return "";
            }
            const bucket = buckets[dataIndex];
            const label = new Date(bucket.ts).toLocaleString();
            const count =
              Array.isArray(item.value) && typeof item.value[1] === "number"
                ? item.value[1]
                : bucket.count;
            return `${label}<br/>${count} logs`;
          }
        },
        xAxis: {
          type: "time",
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
            data: chartPoints
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
  }, [buckets, chartPoints, isReady, maxBucketCount]);

  if (loadError || histogramQuery.isError) {
    return (
      <div className="h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
        {loadError ?? "Failed to load histogram"}
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
        bucket {formatBucketSize(bucketSize)}
      </div>
      {histogramQuery.isLoading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
          Loading chart...
        </div>
      ) : null}
      {!histogramQuery.isLoading && nonZeroBuckets === 0 ? (
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
