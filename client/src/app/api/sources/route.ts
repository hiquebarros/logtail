import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/sources`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? ""
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({ message: "Invalid response" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/sources`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") ?? ""
    },
    body,
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({ message: "Invalid response" }));
  return NextResponse.json(payload, { status: response.status });
}
