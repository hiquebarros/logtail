import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const apiBaseUrl = getApiBaseUrl();

  const upstreamResponse = await fetch(`${apiBaseUrl}/auth/switch-organization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? ""
    },
    body,
    cache: "no-store"
  });

  const payload = await upstreamResponse.json().catch(() => ({ message: "Invalid response" }));
  const response = NextResponse.json(payload, { status: upstreamResponse.status });
  const setCookie = upstreamResponse.headers.get("set-cookie");

  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}
