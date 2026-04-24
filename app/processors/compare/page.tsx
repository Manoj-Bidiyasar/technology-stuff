import type { Metadata } from "next";
import ProcessorCompareClassSections from "@/components/ProcessorCompareClassSections";
import ProcessorCompareListQuickSection from "@/components/ProcessorCompareListQuickSection";
import { listProcessorProfiles } from "@/lib/processors/profiles";

export const metadata: Metadata = {
  title: "Processor Compare List",
  description: "Browse popular processor matchups and open full head-to-head comparisons.",
};

type ChipClass = "Flagship" | "Upper Midrange" | "Midrange" | "Budget" | "Entry";

function fullName(name: string, vendor: string): string {
  const n = String(name || "").trim();
  const v = String(vendor || "").trim();
  if (!n || !v) return n;
  if (n.toLowerCase().startsWith(v.toLowerCase())) return n;
  return `${v} ${n}`;
}

function classFromAntutu(score: number): ChipClass {
  if (score >= 1800000) return "Flagship";
  if (score >= 1300000) return "Upper Midrange";
  if (score >= 900000) return "Midrange";
  if (score >= 550000) return "Budget";
  return "Entry";
}

export default async function ProcessorCompareListPage() {
  const processors = await listProcessorProfiles();

  const top = [...processors].sort((a, b) => (b.antutu || 0) - (a.antutu || 0)).slice(0, 48);

  const pairs: Array<{
    left: string;
    right: string;
    leftRawName: string;
    rightRawName: string;
    leftVendor: string;
    rightVendor: string;
    href: string;
    chipClass: ChipClass;
  }> = [];
  const seen = new Set<string>();
  const addPair = (left: (typeof top)[number], right: (typeof top)[number]) => {
    if (!left || !right || left.slug === right.slug) return;
    const key = [left.slug, right.slug].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    const maxScore = Math.max(Number(left.antutu || 0), Number(right.antutu || 0));
    pairs.push({
      left: fullName(left.name, left.vendor),
      right: fullName(right.name, right.vendor),
      leftRawName: left.name,
      rightRawName: right.name,
      leftVendor: left.vendor,
      rightVendor: right.vendor,
      href: `/processors/compare/${left.slug}-vs-${right.slug}`,
      chipClass: classFromAntutu(maxScore),
    });
  };

  const classOrder: ChipClass[] = ["Flagship", "Upper Midrange", "Midrange", "Budget", "Entry"];
  const byClass = new Map<ChipClass, typeof top>();
  for (const chipClass of classOrder) byClass.set(chipClass, []);
  for (const item of top) {
    byClass.get(classFromAntutu(Number(item.antutu || 0)))?.push(item);
  }

  for (const chipClass of classOrder) {
    const items = byClass.get(chipClass) || [];
    for (let i = 0; i < items.length; i += 1) {
      addPair(items[i], items[i + 1]);
      addPair(items[i], items[i + 2]);
      addPair(items[i], items[i + 3]);
    }
  }

  const grouped = classOrder
    .map((chipClass) => ({
      chipClass,
      items: pairs.filter((item) => item.chipClass === chipClass).slice(0, 36),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="mobile-container py-6 max-[320px]:py-4 sm:py-8">
      <section className="panel p-4 max-[320px]:p-3 sm:p-5">
        <ProcessorCompareListQuickSection processors={processors} />
        <div className="mt-5 border-t border-slate-200 pt-5 max-[320px]:mt-4 max-[320px]:pt-4">
          <p className="text-sm text-slate-600 max-[320px]:text-[13px]">Browse popular head-to-head matchups below, or start with Quick Compare above.</p>
        </div>
      </section>

      <ProcessorCompareClassSections grouped={grouped} />
    </main>
  );
}
