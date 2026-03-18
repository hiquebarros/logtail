import { NextRequest, NextResponse } from "next/server";
import type { Log, LogLevel } from "@/lib/types/logs";
import {
  getApiBaseUrl,
  getDefaultApplicationId,
  getDefaultOrganizationId,
} from "@/lib/api/server";

const DEFAULT_PAGE_SIZE = 200;

function parseCsv<T extends string>(
  value: string | null,
  validator: (item: string) => item is T,
): T[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(validator);
}

function isLevel(value: string): value is LogLevel {
  return value === "info" || value === "warn" || value === "error";
}

function isEnvironment(value: string): value is Log["environment"] {
  return value === "prod" || value === "staging" || value === "dev";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rangeMinutes = Number(params.get("rangeMinutes") ?? 60);
  const pageSize = Number(params.get("limit") ?? DEFAULT_PAGE_SIZE);
  const query = params.get("query")?.trim() ?? "";
  const levels = parseCsv(params.get("levels"), isLevel);
  const services =
    params
      .get("services")
      ?.split(",")
      .map((service) => service.trim())
      .filter(Boolean) ?? [];
  const organizationId = getDefaultOrganizationId();
  const applicationId = getDefaultApplicationId();
  const fromDate = new Date(Date.now() - rangeMinutes * 60_000).toISOString();

  const backendParams = new URLSearchParams({
    organizationId,
    applicationId,
    from: fromDate,
    limit: String(Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 50), 500) : 200),
  });

  const cursor = params.get("cursor");
  if (cursor) {
    backendParams.set("cursor", cursor);
  }

  if (levels.length > 0) {
    backendParams.set("level", levels[0]);
  }

  const searchTokens: string[] = [];
  if (services.length > 0) {
    searchTokens.push(`service:${services[0]}`);
  }
  if (query.length > 0) {
    searchTokens.push(query);
  }
  if (searchTokens.length > 0) {
    backendParams.set("search", searchTokens.join(" "));
  }

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/logs?${backendParams.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ message: "Failed to fetch logs from server" }, { status: 502 });
  }

  const payload = (await response.json()) as {
    data: Array<{
      id: string;
      timestamp: string;
      level: LogLevel;
      message: string;
      metadata: Record<string, unknown> | null;
    }>;
    nextCursor: string | null;
  };

  const items: Log[] = payload.data
    .map((item) => {
      const metadata = (item.metadata ?? {}) as Record<string, unknown>;
      const service = typeof metadata.service === "string" ? metadata.service : "unknown";
      const env = metadata.env;
      const environment: Log["environment"] =
        env === "staging" || env === "dev" || env === "prod" ? env : "prod";

      return {
        id: item.id,
        timestamp: item.timestamp,
        level: item.level,
        message: item.message,
        service,
        environment,
        metadata,
      };
    })
    .filter((item) => {
      const environments = parseCsv(params.get("environments"), isEnvironment);
      return environments.length === 0 || environments.includes(item.environment);
    });

  return NextResponse.json({
    items,
    nextCursor: payload.nextCursor,
    hasMore: Boolean(payload.nextCursor),
    total: items.length,
    availableServices: [...new Set(items.map((item) => item.service))],
  });
}
