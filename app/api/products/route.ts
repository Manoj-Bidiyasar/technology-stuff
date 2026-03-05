import { NextRequest, NextResponse } from "next/server";
import { createProduct, getPublishedProductBySlug, listAllProductsAdmin, searchProductSuggestions } from "@/lib/firestore/products";
import type { Product } from "@/lib/types/content";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const slugs = searchParams.get("slugs")?.trim();
    const admin = searchParams.get("admin");
    const deviceTypeParam = searchParams.get("deviceType");
    const deviceType = deviceTypeParam === "tablet" ? "tablet" : "smartphone";

    if (slugs) {
      const slugList = slugs
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);
      if (slugList.length === 0) return NextResponse.json({ items: [] });
      const products = await Promise.all(slugList.map((slug) => getPublishedProductBySlug(slug, deviceType)));
      const bySlug = new Map(products.filter(Boolean).map((item) => [item!.slug, item!]));
      const items = slugList
        .map((slug) => bySlug.get(slug))
        .filter(Boolean)
        .map((item) => ({
          slug: item!.slug,
          name: item!.name,
          brand: item!.brand,
          image: item!.images?.[0] || "",
          price: item!.price || 0,
        }));
      return NextResponse.json({ items });
    }

    if (q) {
      const items = await searchProductSuggestions(q, 10, deviceType);
      return NextResponse.json({ items });
    }

    if (admin === "1") {
      const all = searchParams.get("all");
      const items = await listAllProductsAdmin(all === "1" ? undefined : deviceType);
      return NextResponse.json({ items });
    }

    return NextResponse.json({ items: [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch products.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Product;

    if (!body.name || !body.brand) {
      return NextResponse.json({ error: "name and brand are required." }, { status: 400 });
    }

    const id = await createProduct(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
