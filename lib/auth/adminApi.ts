import { NextRequest, NextResponse } from "next/server";
import { getAdminViewerFromRequest, isAdminAuthenticatedRequest } from "@/lib/auth/admin";
import { hasCapability, type AdminCapability } from "@/lib/admin/permissions";

export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  if (await isAdminAuthenticatedRequest(request)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function requireAdminCapability(
  request: NextRequest,
  capability: AdminCapability
): Promise<{ unauthorized: NextResponse | null; viewerRole?: string }> {
  const viewer = await getAdminViewerFromRequest(request);
  if (!viewer) {
    return { unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasCapability(viewer.role, capability)) {
    return { unauthorized: NextResponse.json({ error: "Forbidden" }, { status: 403 }), viewerRole: viewer.role };
  }
  return { unauthorized: null, viewerRole: viewer.role };
}
