import { NextRequest, NextResponse } from "next/server";
import { createBlog, listAllBlogsAdmin } from "@/lib/firestore/blogs";
import type { BlogPost } from "@/lib/types/content";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin");

    if (admin === "1") {
      const items = await listAllBlogsAdmin();
      return NextResponse.json({ items });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch blogs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BlogPost;

    if (!body.title || !body.slug) {
      return NextResponse.json({ error: "title and slug are required." }, { status: 400 });
    }

    const id = await createBlog(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create blog.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
