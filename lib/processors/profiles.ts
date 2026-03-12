import { listPublishedProducts } from "@/lib/firestore/products";
import { listPublishedCustomProcessorProfiles } from "@/lib/firestore/processors";
import { unstable_cache } from "next/cache";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { slugify } from "@/utils/slugify";

export type ProcessorProfile = {
  slug: string;
  name: string;
  vendor: string;
  antutu: number;
  fabricationNm?: number;
  process?: string;
  maxCpuGhz?: number;
  gpu?: string;
  phoneCount: number;
  avgPhoneScore: number;
  topPhones: Array<{
    name: string;
    slug: string;
    antutu?: number;
    buyUrl?: string;
    buyLabel?: string;
    amazonUrl?: string;
    flipkartUrl?: string;
  }>;
};

const DUMMY_PROCESSORS: Omit<ProcessorProfile, "slug">[] = [
  { name: "MediaTek Dimensity 9500s", vendor: "MediaTek", antutu: 3397028, fabricationNm: 3, maxCpuGhz: 3.5, gpu: "Mali-G1 Ultra MC12", phoneCount: 0, avgPhoneScore: 9.8, topPhones: [] },
  { name: "MediaTek Helio G99 Ultimate", vendor: "MediaTek", antutu: 470000, fabricationNm: 6, maxCpuGhz: 2.2, gpu: "Mali-G57 MC2", phoneCount: 0, avgPhoneScore: 7.2, topPhones: [] },
  { name: "MediaTek Helio G100", vendor: "MediaTek", antutu: 520000, fabricationNm: 6, maxCpuGhz: 2.4, gpu: "Mali-G57 MC2", phoneCount: 0, avgPhoneScore: 7.4, topPhones: [] },
  { name: "Snapdragon 8 Elite", vendor: "Qualcomm", antutu: 2850000, fabricationNm: 3, maxCpuGhz: 4.32, gpu: "Adreno 840", phoneCount: 0, avgPhoneScore: 9.6, topPhones: [] },
  { name: "Snapdragon 8 Elite Gen 5", vendor: "Qualcomm", antutu: 3720000, fabricationNm: 2, maxCpuGhz: 4.75, gpu: "Adreno 850", phoneCount: 0, avgPhoneScore: 9.9, topPhones: [] },
  { name: "Dimensity 9400", vendor: "MediaTek", antutu: 2750000, fabricationNm: 3, maxCpuGhz: 3.63, gpu: "Immortalis-G925", phoneCount: 0, avgPhoneScore: 9.4, topPhones: [] },
  { name: "Apple A18 Pro", vendor: "Apple", antutu: 2650000, fabricationNm: 3, maxCpuGhz: 4.05, gpu: "Apple 6-core GPU", phoneCount: 0, avgPhoneScore: 9.3, topPhones: [] },
  { name: "Snapdragon 8 Gen 3", vendor: "Qualcomm", antutu: 2050000, fabricationNm: 4, maxCpuGhz: 3.3, gpu: "Adreno 750", phoneCount: 0, avgPhoneScore: 8.9, topPhones: [] },
  { name: "Dimensity 9300", vendor: "MediaTek", antutu: 2150000, fabricationNm: 4, maxCpuGhz: 3.25, gpu: "Immortalis-G720", phoneCount: 0, avgPhoneScore: 9.0, topPhones: [] },
  { name: "Snapdragon 7+ Gen 3", vendor: "Qualcomm", antutu: 1450000, fabricationNm: 4, maxCpuGhz: 2.8, gpu: "Adreno 732", phoneCount: 0, avgPhoneScore: 8.1, topPhones: [] },
  { name: "Snapdragon 7 Gen 4", vendor: "Qualcomm", antutu: 1180000, fabricationNm: 4, maxCpuGhz: 2.8, gpu: "Adreno 722", phoneCount: 0, avgPhoneScore: 8.0, topPhones: [] },
  { name: "Snapdragon 780G", vendor: "Qualcomm", antutu: 640000, fabricationNm: 5, maxCpuGhz: 2.4, gpu: "Adreno 642", phoneCount: 0, avgPhoneScore: 7.6, topPhones: [] },
  { name: "Snapdragon 732G", vendor: "Qualcomm", antutu: 430000, fabricationNm: 8, maxCpuGhz: 2.3, gpu: "Adreno 618", phoneCount: 0, avgPhoneScore: 7.0, topPhones: [] },
  { name: "Dimensity 8300 Ultra", vendor: "MediaTek", antutu: 1500000, fabricationNm: 4, maxCpuGhz: 3.35, gpu: "Mali-G615 MC6", phoneCount: 0, avgPhoneScore: 8.3, topPhones: [] },
  { name: "Exynos 2400", vendor: "Samsung", antutu: 1800000, fabricationNm: 4, maxCpuGhz: 3.21, gpu: "Xclipse 940", phoneCount: 0, avgPhoneScore: 8.5, topPhones: [] },
  { name: "Exynos 2500", vendor: "Samsung", antutu: 2260000, fabricationNm: 3, maxCpuGhz: 3.5, gpu: "Xclipse 950", phoneCount: 0, avgPhoneScore: 9.0, topPhones: [] },
  { name: "Unisoc T760", vendor: "Unisoc", antutu: 560000, fabricationNm: 6, maxCpuGhz: 2.4, gpu: "Mali-G57 MC4", phoneCount: 0, avgPhoneScore: 7.2, topPhones: [] },
  { name: "Tensor G2", vendor: "Google", antutu: 980000, fabricationNm: 4, maxCpuGhz: 2.85, gpu: "Mali-G710 MP7", phoneCount: 0, avgPhoneScore: 7.5, topPhones: [] },
  { name: "Tensor G4", vendor: "Google", antutu: 1250000, fabricationNm: 4, maxCpuGhz: 3.1, gpu: "Mali-G715", phoneCount: 0, avgPhoneScore: 7.8, topPhones: [] },
  { name: "Tensor G5", vendor: "Google", antutu: 1560000, fabricationNm: 3, maxCpuGhz: 3.3, gpu: "Mali-G720", phoneCount: 0, avgPhoneScore: 8.2, topPhones: [] },
  { name: "Snapdragon 6 Gen 4", vendor: "Qualcomm", antutu: 780000, fabricationNm: 4, maxCpuGhz: 2.3, gpu: "Adreno 7xx", phoneCount: 0, avgPhoneScore: 7.1, topPhones: [] },
];

function extractNm(text?: string): number | undefined {
  const raw = String(text || "");
  const match = raw.match(/(\d+(\.\d+)?)\s*nm/i);
  if (match) {
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : undefined;
  }
  const numericOnly = raw.trim();
  if (/^\d+(\.\d+)?$/.test(numericOnly)) {
    const n = Number(numericOnly);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function extractMaxGhz(lines?: string[]): number | undefined {
  const cpu = (lines || []).join(" ");
  const matches = cpu.match(/(\d+(\.\d+)?)\s*ghz/gi) || [];
  let max = 0;
  for (const m of matches) {
    const n = Number(m.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? max : undefined;
}

function vendorFromChip(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("snapdragon")) return "Qualcomm";
  if (n.includes("dimensity") || n.includes("mediatek") || n.includes("helio")) return "MediaTek";
  if (n.includes("apple") || n.includes("a1") || n.includes("a17") || n.includes("a18")) return "Apple";
  if (n.includes("exynos")) return "Samsung";
  if (n.includes("unisoc") || n.includes("tiger")) return "Unisoc";
  if (n.includes("tensor")) return "Google";
  if (n.includes("kirin")) return "Huawei";
  return "Other";
}

async function buildProcessorProfiles(): Promise<ProcessorProfile[]> {
  // Keep public processor list fully controlled by Firebase `processors` collection.
  // Product-derived profile generation is intentionally disabled.
  const includeProductDerived = false;
  let products: Awaited<ReturnType<typeof listPublishedProducts>>["items"] = [];
  if (includeProductDerived) {
    try {
      const rows = await listPublishedProducts({
        page: 1,
        pageSize: 500,
        deviceType: "smartphone",
        sort: "popularity",
      });
      products = rows.items;
    } catch {
      products = [];
    }
  }

  type Agg = {
    name: string;
    vendor: string;
    antutuBest: number;
    nmBest?: number;
    processBest?: string;
    maxCpuGhz?: number;
    gpuCount: Record<string, number>;
    phoneCount: number;
    scoreSum: number;
    scoreCount: number;
    phones: Array<{
      name: string;
      slug: string;
      score: number;
      antutu: number;
      buyUrl?: string;
      buyLabel?: string;
      amazonUrl?: string;
      flipkartUrl?: string;
    }>;
  };

  const map = new Map<string, Agg>();

  for (const p of products) {
    const name = String(p.performance?.chipset || p.specs?.processor || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const antutu = Number(p.performance?.antutu?.total || 0);
    const process = String(p.performance?.fabrication || "").trim();
    const nm = extractNm(process);
    const ghz = extractMaxGhz(p.performance?.cpu);
    const gpu = String(p.performance?.gpu || "").trim();
    const score = calculateOverallScore100(p) / 10;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        name,
        vendor: vendorFromChip(name),
        antutuBest: antutu > 0 ? antutu : 0,
        nmBest: nm,
        processBest: process || undefined,
        maxCpuGhz: ghz,
        gpuCount: gpu ? { [gpu]: 1 } : {},
        phoneCount: 1,
        scoreSum: Number.isFinite(score) ? score : 0,
        scoreCount: Number.isFinite(score) ? 1 : 0,
        phones: [{
          name: p.name,
          slug: p.slug,
          score: Number.isFinite(score) ? score : 0,
          antutu,
          buyUrl: p.affiliateLinks?.amazon || p.affiliateLinks?.flipkart || undefined,
          buyLabel: p.affiliateLinks?.amazon ? "Amazon" : (p.affiliateLinks?.flipkart ? "Flipkart" : undefined),
          amazonUrl: p.affiliateLinks?.amazon || undefined,
          flipkartUrl: p.affiliateLinks?.flipkart || undefined,
        }],
      });
      continue;
    }

    existing.phoneCount += 1;
    if (antutu > existing.antutuBest) existing.antutuBest = antutu;
    if (Number.isFinite(nm) && (!existing.nmBest || (nm as number) < existing.nmBest)) existing.nmBest = nm;
    if (Number.isFinite(ghz) && (!existing.maxCpuGhz || (ghz as number) > existing.maxCpuGhz)) existing.maxCpuGhz = ghz;
    if (gpu) existing.gpuCount[gpu] = (existing.gpuCount[gpu] || 0) + 1;
    if (process && !existing.processBest) existing.processBest = process;
    if (Number.isFinite(score)) {
      existing.scoreSum += score;
      existing.scoreCount += 1;
    }
    existing.phones.push({
      name: p.name,
      slug: p.slug,
      score: Number.isFinite(score) ? score : 0,
      antutu,
      buyUrl: p.affiliateLinks?.amazon || p.affiliateLinks?.flipkart || undefined,
      buyLabel: p.affiliateLinks?.amazon ? "Amazon" : (p.affiliateLinks?.flipkart ? "Flipkart" : undefined),
      amazonUrl: p.affiliateLinks?.amazon || undefined,
      flipkartUrl: p.affiliateLinks?.flipkart || undefined,
    });
  }

  const fromProducts: ProcessorProfile[] = [...map.values()]
    .map((item) => {
      const gpu = Object.entries(item.gpuCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      const topPhones = [...item.phones]
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((v) => ({
          name: v.name,
          slug: v.slug,
          antutu: v.antutu > 0 ? v.antutu : undefined,
          buyUrl: v.buyUrl,
          buyLabel: v.buyLabel,
          amazonUrl: v.amazonUrl,
          flipkartUrl: v.flipkartUrl,
        }));

      return {
        slug: slugify(item.name),
        name: item.name,
        vendor: item.vendor,
        antutu: item.antutuBest,
        fabricationNm: item.nmBest,
        process: item.processBest,
        maxCpuGhz: item.maxCpuGhz,
        gpu,
        phoneCount: item.phoneCount,
        avgPhoneScore: item.scoreCount > 0 ? Number((item.scoreSum / item.scoreCount).toFixed(1)) : 0,
        topPhones,
      };
    })
    .sort((a, b) => (b.antutu || 0) - (a.antutu || 0));

  const existing = new Set(fromProducts.map((item) => item.name.toLowerCase()));
  const includeDummy = process.env.ENABLE_DUMMY_PROCESSORS === "1";
  const mergedDummy: ProcessorProfile[] = includeDummy
    ? DUMMY_PROCESSORS
      .filter((item) => !existing.has(item.name.toLowerCase()))
      .map((item) => ({ ...item, slug: slugify(item.name) }))
    : [];

  let custom: ProcessorProfile[] = [];
  try {
    custom = await listPublishedCustomProcessorProfiles();
  } catch {
    custom = [];
  }

  const merged = new Map<string, ProcessorProfile>();
  [...fromProducts, ...mergedDummy].forEach((item) => merged.set(item.name.toLowerCase(), item));
  custom.forEach((item) => {
    const slug = slugify(item.slug || item.name);
    merged.set(item.name.toLowerCase(), {
      ...item,
      slug,
      topPhones: item.topPhones || [],
    });
  });

  return [...merged.values()].sort((a, b) => (b.antutu || 0) - (a.antutu || 0));
}

const processorProfilesCacheSeconds = (() => {
  const value = Number(process.env.PROCESSOR_PROFILES_CACHE_SECONDS || 1800);
  return Number.isFinite(value) && value > 0 ? value : 1800;
})();

const getCachedProcessorProfiles = unstable_cache(
  async () => buildProcessorProfiles(),
  ["processor-profiles-v10"],
  {
    revalidate: processorProfilesCacheSeconds,
    tags: ["processor-profiles"],
  }
);

export async function listProcessorProfiles(): Promise<ProcessorProfile[]> {
  return getCachedProcessorProfiles();
}
