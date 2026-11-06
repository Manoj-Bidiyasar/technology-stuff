import { NextRequest, NextResponse } from "next/server";
import { requireAdminCapability } from "@/lib/auth/adminApi";
import {
  getShowSmartphoneRamStorageConfiguration,
  setShowSmartphoneRamStorageConfiguration,
} from "@/lib/firestore/siteSettings";

export async function GET(request: NextRequest) {
  const { unauthorized } = await requireAdminCapability(request, "products");
  if (unauthorized) return unauthorized;

  try {
    const show = await getShowSmartphoneRamStorageConfiguration();
    return NextResponse.json({ showRamStorageConfiguration: show });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load site settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { unauthorized } = await requireAdminCapability(request, "products");
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as { showRamStorageConfiguration?: boolean };
    if (typeof body.showRamStorageConfiguration !== "boolean") {
      return NextResponse.json({ error: "A true or false setting is required." }, { status: 400 });
    }
    await setShowSmartphoneRamStorageConfiguration(body.showRamStorageConfiguration);
    return NextResponse.json({ ok: true, showRamStorageConfiguration: body.showRamStorageConfiguration });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save site settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
