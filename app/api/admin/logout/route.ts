import { NextRequest, NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth/admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  await destroyAdminSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
