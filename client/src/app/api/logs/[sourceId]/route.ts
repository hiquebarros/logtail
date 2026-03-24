import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

type Params = {
  params: Promise<{
    sourceId: string;
  }>;
};

export async function POST(request: NextRequest, context: Params) {
  const { sourceId } = await context.params;
  if (!sourceId || sourceId.trim().length === 0) {
    return NextResponse.json({ message: "Invalid sourceId" }, { status: 400 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  const body = await request.text();
  const apiBaseUrl = getApiBaseUrl();

  const upstreamResponse = await fetch(`${apiBaseUrl}/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: authorization } : {})
    },
    body,
    cache: "no-store"
  });

  const payload = await upstreamResponse
    .json()
    .catch(() => ({ message: "Invalid response" }));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
