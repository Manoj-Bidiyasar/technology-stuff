import type { Metadata } from "next";
import ProcessorCompareClassSections from "@/components/ProcessorCompareClassSections";
import { listProcessorProfiles } from "@/lib/processors/profiles";

export const metadata: Metadata = {
  title: "Processor Compare List",
  description: "Browse popular processor matchups and open full head-to-head comparisons.",
};

type ChipClass = "Ultra Flagship" | "Flagship" | "Upper Midrange" | "Midrange" | "Budget" | "Entry";

function fullName(name: string, vendor: string): string {
  const n = String(name || "").trim();
  const v = String(vendor || "").trim();
  if (!n || !v) return n;
  if (n.toLowerCase().startsWith(v.toLowerCase())) return n;
  return `${v} ${n}`;
}

function classFromAntutu(score: number): ChipClass {
  if (score >= 2800000) return "Ultra Flagship";
  if (score >= 1800000) return "Flagship";
  if (score >= 1300000) return "Upper Midrange";
  if (score >= 900000) return "Midrange";
  if (score >= 550000) return "Budget";
  return "Entry";
}

export default async function ProcessorCompareListPage() {
  const processors = await listProcessorProfiles();

  const top = [...processors].sort((a, b) => (b.antutu || 0) - (a.antutu || 0)).slice(0, 20);

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
  for (let i = 0; i < top.length - 1; i += 1) {
    const left = top[i];
    const right = top[i + 1];
    if (!left || !right || left.slug === right.slug) continue;
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
  }

  const classOrder: ChipClass[] = ["Ultra Flagship", "Flagship", "Upper Midrange", "Midrange", "Budget", "Entry"];
  const grouped = classOrder
    .map((chipClass) => ({
      chipClass,
      items: pairs.filter((item) => item.chipClass === chipClass),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="mobile-container py-6 max-[320px]:py-4 sm:py-8">
      <section className="panel p-4 max-[320px]:p-3 sm:p-5">
        <h1 className="text-2xl font-extrabold text-slate-900 max-[320px]:text-[1.75rem] sm:text-3xl">Processor Compare List</h1>
        <p className="mt-2 text-sm text-slate-600 max-[320px]:mt-1.5 max-[320px]:text-[13px]">Choose a class and open any head-to-head processor matchup.</p>
      </section>

      <ProcessorCompareClassSections grouped={grouped} />
    </main>
  );
}
