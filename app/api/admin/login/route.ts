import { NextRequest, NextResponse } from "next/server";
import { createAdminSessionFromIdToken, getAdminSessionMaxAgeSeconds } from "@/lib/auth/admin";
import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";

type LoginBody = {
  idToken?: string;
  deviceId?: string;
  userAgent?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const result = await createAdminSessionFromIdToken({
      idToken: String(body.idToken || "").trim(),
      deviceId: String(body.deviceId || "").trim(),
      userAgent: String(body.userAgent || "").trim(),
    });
    if (!result.ok) {
      const status =
        result.error === "session/device-not-allowed"
          ? 403
          : result.error === "user-profile-missing"
            ? 404
            : result.error === "user-not-active" || result.error === "user-role-not-allowed"
              ? 403
              : 401;
      return NextResponse.json({ error: result.error }, { status });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: result.sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getAdminSessionMaxAgeSeconds(),
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
