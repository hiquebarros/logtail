import type { LogFilters, LogsPageResponse } from "@/lib/types/logs";
import type { MetricsResponse } from "@/lib/types/metrics";

function toParams(filters: LogFilters) {
  const params = new URLSearchParams({
    query: filters.query,
    rangeMinutes: String(filters.rangeMinutes),
  });

  if (filters.levels.length) params.set("levels", filters.levels.join(","));
  if (filters.services.length) params.set("services", filters.services.join(","));
  if (filters.environments.length) {
    params.set("environments", filters.environments.join(","));
  }

  return params;
}

export async function fetchLogsPage(input: {
  filters: LogFilters;
  pageParam?: string | null;
  limit?: number;
}): Promise<LogsPageResponse> {
  const params = toParams(input.filters);
  params.set("limit", String(input.limit ?? 200));
  if (input.pageParam) params.set("cursor", input.pageParam);

  const response = await fetch(`/api/logs?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch logs");
  }

  return response.json();
}

export async function fetchMetrics(rangeMinutes: number): Promise<MetricsResponse> {
  const response = await fetch(`/api/metrics?rangeMinutes=${rangeMinutes}`);
  if (!response.ok) {
    throw new Error("Failed to fetch metrics");
  }

  return response.json();
}
