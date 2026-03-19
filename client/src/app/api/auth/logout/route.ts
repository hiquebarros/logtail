import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function POST(request: NextRequest) {
  const apiBaseUrl = getApiBaseUrl();

  const upstreamResponse = await fetch(`${apiBaseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({ message: "Invalid response" }));
  const response = NextResponse.json(payload, { status: upstreamResponse.status });
  const setCookie = upstreamResponse.headers.get("set-cookie");

  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
