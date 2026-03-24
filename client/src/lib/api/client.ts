import type { LogFilters, LogHistogramResponse, LogsPageResponse } from "@/lib/types/logs";
import type { MetricsResponse } from "@/lib/types/metrics";
import type {
  CreateSourceInput,
  SourceDetailResponse,
  SourcesListResponse,
  UpdateSourceInput
} from "@/lib/types/sources";

function toParams(filters: LogFilters) {
  const params = new URLSearchParams({
    query: filters.query,
    rf: filters.timeRange.rf,
    rt: filters.timeRange.rt,
  });
  if (filters.applicationId) {
    params.set("applicationId", filters.applicationId);
  }

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
  params.set("limit", String(input.limit ?? 100));
  if (input.pageParam) params.set("cursor", input.pageParam);

  const response = await fetch(`/api/logs?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch logs");
  }

  return response.json();
}

export async function fetchLogsHistogram(input: {
  filters: LogFilters;
  bucketSizeMs?: number;
}): Promise<LogHistogramResponse> {
  const params = toParams(input.filters);
  if (input.bucketSizeMs) {
    params.set("bucketSizeMs", String(input.bucketSizeMs));
  }

  const response = await fetch(`/api/logs/histogram?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch log histogram");
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

export async function fetchSources(): Promise<SourcesListResponse> {
  const response = await fetch("/api/sources", {
    method: "GET"
  });
  if (!response.ok) {
    throw new Error("Failed to fetch sources");
  }

  return response.json();
}

export async function createSource(input: CreateSourceInput): Promise<SourceDetailResponse> {
  const response = await fetch("/api/sources", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(payload.message || "Failed to create source");
  }

  return response.json();
}

export async function fetchSourceById(sourceId: string): Promise<SourceDetailResponse> {
  const response = await fetch(`/api/sources/${sourceId}`, {
    method: "GET"
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Source not found");
    }
    throw new Error("Failed to fetch source details");
  }

  return response.json();
}

export async function updateSourceById(
  sourceId: string,
  input: UpdateSourceInput
): Promise<SourceDetailResponse> {
  const response = await fetch(`/api/sources/${sourceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(payload.message || "Failed to update source");
  }

  return response.json();
}
