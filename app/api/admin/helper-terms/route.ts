import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdminCapability } from "@/lib/auth/adminApi";

const DATA_PATH = path.join(process.cwd(), "data", "helper-terms.json");

type HelperScope = "processor" | "smartphone" | "tablet" | "blog";
type HelperTerm = {
  section: string;
  name: string;
  aliases?: string[];
  status?: "pending" | "approved";
  createdAt?: string;
  updatedAt?: string;
};

type HelperStore = Record<HelperScope, HelperTerm[]>;

const EMPTY_STORE: HelperStore = {
  processor: [],
  smartphone: [],
  tablet: [],
  blog: [],
};

async function readStore(): Promise<HelperStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<HelperStore>;
    return {
      processor: parsed.processor || [],
      smartphone: parsed.smartphone || [],
      tablet: parsed.tablet || [],
      blog: parsed.blog || [],
    };
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(EMPTY_STORE, null, 2));
    return { ...EMPTY_STORE };
  }
}

async function writeStore(store: HelperStore) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2));
}

export async function GET(request: Request) {
  const { unauthorized } = await requireAdminCapability(request, "helper");
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") || "processor") as HelperScope;
  const store = await readStore();
  return NextResponse.json({ scope, items: store[scope] || [] });
}

export async function POST(request: Request) {
  const { unauthorized } = await requireAdminCapability(request, "helper");
  if (unauthorized) return unauthorized;
  const body = (await request.json()) as { scope: HelperScope; items: HelperTerm[] };
  const scope = body.scope || "processor";
  const store = await readStore();
  store[scope] = body.items || [];
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
