import {
  getApiBaseUrl,
  getDefaultApplicationId,
  getDefaultOrganizationId,
} from "@/lib/api/server";

export async function GET(request: Request) {
  const apiBaseUrl = getApiBaseUrl();
  const searchParams = new URL(request.url).searchParams;
  const organizationId = searchParams.get("organizationId") || getDefaultOrganizationId();
  const applicationId = searchParams.get("applicationId") || getDefaultApplicationId();
  const backendUrl = new URL(`${apiBaseUrl}/logs/stream`);
  backendUrl.searchParams.set("organizationId", organizationId);
  backendUrl.searchParams.set("applicationId", applicationId);

  const response = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
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
