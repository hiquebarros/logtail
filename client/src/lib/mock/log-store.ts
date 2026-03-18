import type { Log, LogFilters } from "@/lib/types/logs";
import type { MetricPoint, MetricsResponse } from "@/lib/types/metrics";
import { decodeCursor, encodeCursor, filterLogs } from "@/lib/utils/logs";

const SERVICES = [
  "api",
  "worker",
  "gateway",
  "billing",
  "auth",
  "notifications",
  "search",
] as const;

const ENVIRONMENTS: Array<Log["environment"]> = ["prod", "staging", "dev"];
const BASE_MESSAGES = [
  "HTTP request completed",
  "Background job started",
  "Timeout while fetching upstream resource",
  "Cache invalidation triggered",
  "User authentication succeeded",
  "Database query exceeded threshold",
  "Retrying failed webhook delivery",
  "Rate limit threshold reached",
];

function seededRandom(seed: number): () => number {
  let current = seed;
  return () => {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
}

function randomChoice<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}

function createLog(index: number, random: () => number): Log {
  const now = Date.now();
  const jitter = Math.floor(random() * 120_000);
  const timestamp = new Date(now - (15_000 - index) * 1_500 - jitter).toISOString();
  const level = random() > 0.9 ? "error" : random() > 0.75 ? "warn" : "info";
  const service = randomChoice(SERVICES, random);
  const environment = randomChoice(ENVIRONMENTS, random);
  const message = `${randomChoice(BASE_MESSAGES, random)} (${service})`;

  return {
    id: `log_${index}_${Math.floor(random() * 1_000_000)}`,
    timestamp,
    level,
    message,
    service,
    environment,
    metadata: {
      host: `host-${1 + Math.floor(random() * 32)}`,
      traceId: `tr_${Math.floor(random() * 10_000_000).toString(16)}`,
      durationMs: Math.floor(random() * 1800),
      statusCode: [200, 201, 204, 400, 401, 404, 429, 500][
        Math.floor(random() * 8)
      ],
      region: ["us-east-1", "us-west-2", "eu-west-1", "sa-east-1"][
        Math.floor(random() * 4)
      ],
    },
  };
}

const random = seededRandom(1337);
const logs: Log[] = Array.from({ length: 15_000 }, (_, index) =>
  createLog(index + 1, random),
).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

export function getAvailableServices() {
  return [...new Set(logs.map((log) => log.service))];
}

export function queryLogs(input: {
  cursor?: string | null;
  pageSize: number;
  filters: LogFilters;
}) {
  const filtered = filterLogs(logs, input.filters);
  const offset = decodeCursor(input.cursor);
  const page = filtered.slice(offset, offset + input.pageSize);
  const nextOffset = offset + page.length;
  const hasMore = nextOffset < filtered.length;

  return {
    items: page,
    total: filtered.length,
    nextCursor: hasMore ? encodeCursor(nextOffset) : null,
    hasMore,
    availableServices: getAvailableServices(),
  };
}

export function createStreamLog(): Log {
  const idx = logs.length + 1;
  const item = createLog(idx, random);
  item.timestamp = new Date().toISOString();
  logs.push(item);
  return item;
}

export function queryMetrics(rangeMinutes: number): MetricsResponse {
  const now = Date.now();
  const start = now - rangeMinutes * 60_000;
  const filtered = logs.filter((log) => new Date(log.timestamp).getTime() >= start);
  const buckets = new Map<number, MetricPoint>();

  for (const log of filtered) {
    const ts = new Date(log.timestamp).getTime();
    const bucketTs = Math.floor(ts / 60_000) * 60_000;
    const existing = buckets.get(bucketTs) ?? {
      timestamp: new Date(bucketTs).toISOString(),
      logs: 0,
      errors: 0,
      errorRate: 0,
    };
    existing.logs += 1;
    existing.errors += log.level === "error" ? 1 : 0;
    buckets.set(bucketTs, existing);
  }

  const logsPerMinute = Array.from(buckets.values())
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((point) => ({
      ...point,
      errorRate: point.logs ? Number((point.errors / point.logs).toFixed(3)) : 0,
    }));

  const serviceMap = new Map<string, number>();
  for (const log of filtered) {
    serviceMap.set(log.service, (serviceMap.get(log.service) ?? 0) + 1);
  }
  const topServices = Array.from(serviceMap.entries())
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    totalLogs: filtered.length,
    totalErrors: filtered.filter((log) => log.level === "error").length,
    totalWarnings: filtered.filter((log) => log.level === "warn").length,
    logsPerMinute,
    topServices,
  };
}
