import { NextRequest, NextResponse } from "next/server";
import { createProcessor, listAllProcessorsAdmin, type ProcessorAdmin } from "@/lib/firestore/processors";
import { requireAdminCapability } from "@/lib/auth/adminApi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin");
    if (admin === "1") {
      const { unauthorized } = await requireAdminCapability(request, "processors");
      if (unauthorized) return unauthorized;
      const items = await listAllProcessorsAdmin();
      return NextResponse.json({ items });
    }
    return NextResponse.json({ items: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch processors.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const body = (await request.json()) as ProcessorAdmin;
    const id = await createProcessor(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create processor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

