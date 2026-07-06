import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "curator_auth";

function isAuthenticated(request: NextRequest): boolean {
  const sessionToken = process.env.ADMIN_SESSION_TOKEN;
  const cookieToken = request.cookies.get(AUTH_COOKIE)?.value;

  return Boolean(sessionToken && cookieToken && cookieToken === sessionToken);
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  return response;
}

function safeNextPath(request: NextRequest): string {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);

  if (pathname.startsWith("/api/admin")) {
    if (!authenticated) {
      return withSecurityHeaders(
        new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/admin/login")) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/control-room")) {
    if (!authenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", safeNextPath(request));
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/control-room/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
