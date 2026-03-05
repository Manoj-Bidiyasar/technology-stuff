import { NextRequest, NextResponse } from "next/server";
import { deleteBlog, updateBlog } from "@/lib/firestore/blogs";
import type { BlogPost } from "@/lib/types/content";

type BlogRouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: BlogRouteProps) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<BlogPost>;
    await updateBlog(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update blog.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: BlogRouteProps) {
  try {
    const { id } = await params;
    await deleteBlog(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete blog.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
