import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const rangeMinutes = Number(request.nextUrl.searchParams.get("rangeMinutes") ?? 60);
  const normalizedRange = Number.isFinite(rangeMinutes)
    ? Math.min(Math.max(Math.floor(rangeMinutes), 5), 24 * 60)
    : 60;
  const applicationId = request.nextUrl.searchParams.get("applicationId")?.trim() || "";
  const params = new URLSearchParams({
    rangeMinutes: String(normalizedRange),
  });
  if (applicationId) {
    params.set("applicationId", applicationId);
  }
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/metrics?${params.toString()}`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Failed to fetch metrics from server" },
      { status: 502 },
    );
  }

  const data = await response.json();

  return NextResponse.json(data);
}
