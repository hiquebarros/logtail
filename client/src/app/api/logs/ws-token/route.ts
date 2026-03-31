import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

export async function GET(request: NextRequest) {
  const params = new URLSearchParams();
  const applicationId = request.nextUrl.searchParams.get("applicationId")?.trim();
  if (applicationId) {
    params.set("applicationId", applicationId);
  }

  const apiBaseUrl = getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/logs/ws-token?${params.toString()}`, {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? ""
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ message: "Failed to issue live tail token" }, { status: 502 });
  }

  const payload = (await response.json()) as { token: string };
  return NextResponse.json(payload);
}
