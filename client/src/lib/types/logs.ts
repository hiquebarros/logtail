export type LogLevel = "info" | "warn" | "error";

export type Log = {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: "prod" | "staging" | "dev";
  metadata: Record<string, unknown>;
};

export type LogTimeRange = {
  rf: string;
  rt: string;
};

export type LogFilters = {
  query: string;
  levels: LogLevel[];
  services: string[];
  environments: Array<Log["environment"]>;
  timeRange: LogTimeRange;
};

export type LogsPageResponse = {
  items: Log[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
  availableServices: string[];
};

export type LogHistogramBucket = {
  ts: number;
  count: number;
};

export type LogHistogramResponse = {
  buckets: LogHistogramBucket[];
  bucketSizeMs: number;
  totalInRange: number;
};
