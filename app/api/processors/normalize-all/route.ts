import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { normalizeAllProcessorsAdminData } from "@/lib/firestore/processors";

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const result = await normalizeAllProcessorsAdminData();
    revalidateTag("processor-profiles", "max");
    revalidateTag("processor-custom-details", "max");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to normalize processors.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
