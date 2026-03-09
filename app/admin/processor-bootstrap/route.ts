import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import { createProcessor, getProcessorAdminById, type ProcessorAdmin } from "@/lib/firestore/processors";
import { slugify } from "@/utils/slugify";

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireAdminCapability(request, "processors");
  if (unauthorized) return unauthorized;

  const { searchParams, origin } = new URL(request.url);
  const rawName = String(searchParams.get("name") || "").trim();
  const rawSlug = String(searchParams.get("slug") || "").trim();
  const rawBrand = String(searchParams.get("brand") || "").trim();

  const name = rawName;
  const slug = slugify(rawSlug || rawName);
  if (!name || !slug) {
    return NextResponse.redirect(new URL("/admin/processors?error=missing-name-or-slug", origin));
  }

  const existing = await getProcessorAdminById(slug);
  if (!existing) {
    const payload: ProcessorAdmin = {
      id: slug,
      name,
      vendor: rawBrand || "Other",
      antutu: 0,
      status: "draft",
    };
    await createProcessor(payload);
  }

  return NextResponse.redirect(new URL(`/admin/processor-editor?id=${encodeURIComponent(slug)}`, origin));
}

