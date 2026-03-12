import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";

function isAuthenticated(request: NextRequest): boolean {
  return Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loggedIn = isAuthenticated(request);

  if (pathname.startsWith("/admin/login")) {
    // Allow login page even if a stale session cookie exists.
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!loggedIn) {
      const nextValue = `${pathname}${search || ""}`;
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", nextValue);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
