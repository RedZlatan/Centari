import { type NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "curator_auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (pathname.startsWith("/api/admin")) {
    if (!authenticated) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!authenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
