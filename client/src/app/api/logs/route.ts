import { NextRequest, NextResponse } from "next/server";
import type { Log, LogLevel } from "@/lib/types/logs";
import {
  getApiBaseUrl,
  getDefaultApplicationId,
  getDefaultOrganizationId,
} from "@/lib/api/server";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_RANGE_MINUTES = 60;
const MICROSECONDS_IN_MILLISECOND = BigInt(1000);

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

function parseLegacyIsoToMicros(value: string, field: string): bigint {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid ISO datetime`);
  }
  return BigInt(date.getTime()) * MICROSECONDS_IN_MILLISECOND;
}

function parseCanonicalRange(params: URLSearchParams): { rf: string; rt: string } {
  const rfRaw = params.get("rf");
  const rtRaw = params.get("rt");
  if ((rfRaw && !rtRaw) || (!rfRaw && rtRaw)) {
    throw new Error("rf and rt must both be provided");
  }
  if (rfRaw && rtRaw) {
    return { rf: rfRaw, rt: rtRaw };
  }

  const fromRaw = params.get("from");
  const toRaw = params.get("to");
  if (fromRaw || toRaw) {
    const rt =
      toRaw !== null
        ? parseLegacyIsoToMicros(toRaw, "to")
        : BigInt(Date.now()) * MICROSECONDS_IN_MILLISECOND;
    const rf =
      fromRaw !== null
        ? parseLegacyIsoToMicros(fromRaw, "from")
        : rt - BigInt(DEFAULT_RANGE_MINUTES * 60_000) * MICROSECONDS_IN_MILLISECOND;
    return { rf: rf.toString(), rt: rt.toString() };
  }

  const rangeMinutes = Number(params.get("rangeMinutes") ?? DEFAULT_RANGE_MINUTES);
  const safeMinutes = Number.isFinite(rangeMinutes)
    ? Math.min(Math.max(Math.floor(rangeMinutes), 5), 24 * 60)
    : DEFAULT_RANGE_MINUTES;
  const rt = BigInt(Date.now()) * MICROSECONDS_IN_MILLISECOND;
  const rf = rt - BigInt(safeMinutes * 60_000) * MICROSECONDS_IN_MILLISECOND;
  // TODO(remove-legacy-range): drop rangeMinutes fallback after migration.
  return { rf: rf.toString(), rt: rt.toString() };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pageSize = Number(params.get("limit") ?? DEFAULT_PAGE_SIZE);
  const query = params.get("query")?.trim() ?? "";
  const levels = parseCsv(params.get("levels"), isLevel);
  const services =
    params
      .get("services")
      ?.split(",")
      .map((service) => service.trim())
      .filter(Boolean) ?? [];
  const environments = parseCsv(params.get("environments"), isEnvironment);
  const organizationId = getDefaultOrganizationId();
  const applicationId = getDefaultApplicationId();
  let canonicalRange: { rf: string; rt: string };
  try {
    canonicalRange = parseCanonicalRange(params);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Invalid time range" },
      { status: 400 },
    );
  }

  const backendParams = new URLSearchParams({
    organizationId,
    applicationId,
    rf: canonicalRange.rf,
    rt: canonicalRange.rt,
    limit: String(
      Number.isFinite(pageSize) ? Math.min(Math.max(Math.floor(pageSize), 25), 500) : 100
    ),
  });

  const cursor = params.get("cursor");
  if (cursor) {
    backendParams.set("cursor", cursor);
  }

  if (levels.length > 0) {
    backendParams.set("levels", levels.join(","));
  }

  if (services.length > 0) {
    backendParams.set("services", services.join(","));
  }

  if (environments.length > 0) {
    backendParams.set("environments", environments.join(","));
  }

  if (query.length > 0) {
    backendParams.set("search", query);
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

  const items: Log[] = payload.data.map((item) => {
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
  });

  return NextResponse.json({
    items,
    nextCursor: payload.nextCursor,
    hasMore: Boolean(payload.nextCursor),
    total: items.length,
    availableServices: [...new Set(items.map((item) => item.service))],
  });
}
