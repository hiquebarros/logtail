import { NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/api/server";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const VERIFY_EMAIL_PATH = "/verify-email";
const DEFAULT_AUTHENTICATED_PATH = "/logs";

function isPublicIngestionApi(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (request.method !== "POST") {
    return false;
  }

  const match = pathname.match(/^\/api\/logs\/([^/]+)$/);
  return Boolean(match?.[1]);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    // Call the backend directly rather than looping through the public origin.
    // This avoids TLS/proxy misconfiguration causing 500s on every page request.
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    // Treat fetch failures as "not authenticated" so the UI can redirect to login
    // instead of crashing with a 500.
    console.error("Auth check failed in middleware", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublicPage =
    pathname === LOGIN_PATH || pathname === REGISTER_PATH || pathname === VERIFY_EMAIL_PATH;

  if (isPublicIngestionApi(request)) {
    return NextResponse.next();
  }

  // Keep auth APIs public so login/logout can run.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);

  if (isPublicPage && authenticated) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_PATH, request.url));
  }

  if (!authenticated && !isPublicPage) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const nextPath = `${pathname}${search}`;

    if (nextPath && nextPath !== LOGIN_PATH) {
      loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static files and Next.js internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
