import { NextRequest, NextResponse } from "next/server";
import type { Log, LogLevel } from "@/lib/types/logs";
import { getApiBaseUrl } from "@/lib/api/server";

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
  return { rf: rf.toString(), rt: rt.toString() };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("query")?.trim() ?? "";
  const levels = parseCsv(params.get("levels"), isLevel);
  const services =
    params
      .get("services")
      ?.split(",")
      .map((service) => service.trim())
      .filter(Boolean) ?? [];
  const environments = parseCsv(params.get("environments"), isEnvironment);
  const applicationId = params.get("applicationId")?.trim() || "";

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
    rf: canonicalRange.rf,
    rt: canonicalRange.rt,
  });
  if (applicationId) {
    backendParams.set("applicationId", applicationId);
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

  const bucketSizeMsRaw = params.get("bucketSizeMs");
  if (bucketSizeMsRaw) {
    backendParams.set("bucketSizeMs", bucketSizeMsRaw);
  }

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/logs/histogram?${backendParams.toString()}`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Failed to fetch histogram from server" },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as {
    buckets: Array<{ ts: number; count: number }>;
    bucketSizeMs: number;
    totalInRange: number;
  };

  return NextResponse.json(payload);
}
