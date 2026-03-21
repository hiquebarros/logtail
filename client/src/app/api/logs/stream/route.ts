import {
  getApiBaseUrl,
} from "@/lib/api/server";

export async function GET(request: Request) {
  const apiBaseUrl = getApiBaseUrl();
  const searchParams = new URL(request.url).searchParams;
  const applicationId = searchParams.get("applicationId");
  const backendUrl = new URL(`${apiBaseUrl}/logs/stream`);
  if (applicationId) {
    backendUrl.searchParams.set("applicationId", applicationId);
  }

  const response = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
    signal: request.signal,
  });

  if (!response.ok || !response.body) {
    return new Response(
      JSON.stringify({ message: "Failed to connect to server stream" }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
