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

export type LogFilters = {
  query: string;
  levels: LogLevel[];
  services: string[];
  environments: Array<Log["environment"]>;
  rangeMinutes: number;
};

export type LogsPageResponse = {
  items: Log[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
  availableServices: string[];
};
