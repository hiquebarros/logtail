export type LogMetadata = unknown;

export type LogItem = {
  id: string;
  organizationId: string;
  applicationId: string;
  timestamp: string;
  level: string;
  message: string;
  metadata: LogMetadata;
};

export type LogsCursor = {
  timestamp: Date;
  id: string;
};

export type GetLogsFilters = {
  organizationId: string;
  applicationId: string;
  from?: Date;
  to?: Date;
  level?: string;
  service?: string;
  search?: string;
  cursor?: LogsCursor;
  limit: number;
};

export type GetLogsQuery = {
  organizationId?: string;
  applicationId?: string;
  rf?: string;
  rt?: string;
  from?: string;
  to?: string;
  rangeMinutes?: string;
  level?: string;
  search?: string;
  cursor?: string;
  limit?: string;
};

export type StreamLogsQuery = {
  organizationId?: string;
  applicationId?: string;
};

export type StreamLogsFilters = {
  organizationId: string;
  applicationId: string;
};

export type GetMetricsQuery = {
  organizationId?: string;
  applicationId?: string;
  rangeMinutes?: string;
};

export type GetMetricsFilters = {
  organizationId: string;
  applicationId: string;
  rangeMinutes: number;
};

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

export type CreateLogInput = {
  timestamp: Date;
  level: string;
  message: string;
  metadata?: unknown;
};

export type CreateLogsBatchRequest = {
  organizationId?: string;
  applicationId?: string;
  logs?: Array<{
    timestamp?: string;
    level?: string;
    message?: string;
    metadata?: unknown;
  }>;
};

export type LogsPage = {
  data: LogItem[];
  nextCursor: string | null;
};
