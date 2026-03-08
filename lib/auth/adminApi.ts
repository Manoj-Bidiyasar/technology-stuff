import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticatedRequest } from "@/lib/auth/admin";

export function requireAdmin(request: NextRequest): NextResponse | null {
  if (isAdminAuthenticatedRequest(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

