import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const apiBaseUrl = getApiBaseUrl();

  const upstreamResponse = await fetch(`${apiBaseUrl}/auth/resend-verification`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? ""
    },
    body,
    cache: "no-store"
  });

  const payload = await upstreamResponse.json().catch(() => ({ message: "Invalid response" }));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
