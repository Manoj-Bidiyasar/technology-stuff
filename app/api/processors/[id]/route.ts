import { NextRequest, NextResponse } from "next/server";
import { deleteProcessor, getProcessorAdminById, updateProcessor, type ProcessorAdmin } from "@/lib/firestore/processors";
import { requireAdminCapability } from "@/lib/auth/adminApi";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const body = (await request.json()) as Partial<ProcessorAdmin>;
    await updateProcessor(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update processor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(request, "processors");
    if (unauthorized) return unauthorized;

    const { id } = await params;
    const item = await getProcessorAdminById(id);
    if (!item) return NextResponse.json({ error: "Processor not found." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch processor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Props) {
  try {
    const { unauthorized } = await requireAdminCapability(_request, "processors");
    if (unauthorized) return unauthorized;

    const { id } = await params;
    await deleteProcessor(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete processor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
