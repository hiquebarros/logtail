export type MetricPoint = {
  timestamp: string;
  logs: number;
  errors: number;
  errorRate: number;
};

export type ServicePoint = {
  service: string;
  count: number;
};

export type MetricsResponse = {
  totalLogs: number;
  totalErrors: number;
  totalWarnings: number;
  logsPerMinute: MetricPoint[];
  topServices: ServicePoint[];
};
