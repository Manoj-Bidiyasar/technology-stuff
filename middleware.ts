import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionToken } from "@/lib/auth/admin";

function isAuthenticated(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  return token === getAdminSessionToken();
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loggedIn = isAuthenticated(request);

  if (pathname.startsWith("/admin/login")) {
    if (loggedIn) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
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

