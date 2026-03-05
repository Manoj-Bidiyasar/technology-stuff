import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/firestore/products";
import type { Product } from "@/lib/types/content";

type ProductRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: ProductRouteProps) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<Product>;
    await updateProduct(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: ProductRouteProps) {
  try {
    const { id } = await params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
