import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const apiBaseUrl = getApiBaseUrl();

  const upstreamResponse = await fetch(`${apiBaseUrl}/auth/me`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({ message: "Invalid response" }));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
