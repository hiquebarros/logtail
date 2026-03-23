import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

type Params = {
  params: Promise<{
    sourceId: string;
  }>;
};

export async function GET(request: NextRequest, context: Params) {
  const { sourceId } = await context.params;
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/sources/${sourceId}`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? ""
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => ({ message: "Invalid response" }));
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: NextRequest, context: Params) {
  const { sourceId } = await context.params;
  const body = await request.text();
  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/sources/${sourceId}`, {
    method: "PATCH",
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
