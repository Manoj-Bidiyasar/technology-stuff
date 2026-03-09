import { NextRequest, NextResponse } from "next/server";
import { getAdminViewerFromRequest } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  const viewer = await getAdminViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, viewer });
}

