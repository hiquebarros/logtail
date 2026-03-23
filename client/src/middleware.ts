import { NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/login";
const DEFAULT_AUTHENTICATED_PATH = "/logs";

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const response = await fetch(new URL("/api/auth/me", request.url), {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  return response.ok;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Keep auth APIs public so login/logout can run.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);

  if (pathname === LOGIN_PATH && authenticated) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_PATH, request.url));
  }

  if (!authenticated && pathname !== LOGIN_PATH) {
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
