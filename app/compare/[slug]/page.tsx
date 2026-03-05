import type { Metadata } from "next";
import CompareTable from "@/components/CompareTable";
import RelatedComparisons from "@/components/RelatedComparisons";
import { getCompareProductsFromSlug, listTrendingProducts } from "@/lib/firestore/products";
import type { Product } from "@/lib/types/content";
import { getComparisonWinner } from "@/lib/utils/score";

type CompareSlugProps = {
  params: Promise<{ slug: string }>;
};

function buildRelatedComparisonPairs(current: Product[], pool: Product[], max = 20) {
  const bySlug = new Map<string, Product>();
  [...current, ...pool].forEach((item) => bySlug.set(item.slug, item));

  const currentSlugs = new Set(current.map((item) => item.slug));
  const dedupe = new Set<string>();
  const pairs: Array<{ left: Product; right: Product }> = [];

  const addPair = (left: Product, right: Product) => {
    if (!left?.slug || !right?.slug) return;
    if (left.slug === right.slug) return;
    const key = [left.slug, right.slug].sort().join("|");
    if (dedupe.has(key)) return;
    dedupe.add(key);
    pairs.push({ left, right });
  };

  for (const anchor of current) {
    const suggestions = (anchor.compareSuggestions || []).filter(Boolean);
    for (const suggestionSlug of suggestions) {
      const candidate = bySlug.get(suggestionSlug);
      if (!candidate) continue;
      if (currentSlugs.has(candidate.slug)) continue;
      addPair(anchor, candidate);
      if (pairs.length >= max) return pairs;
    }
  }

  const candidates = pool.filter((item) => !currentSlugs.has(item.slug));
  let cursor = 0;
  for (const candidate of candidates) {
    const anchor = current[cursor % current.length];
    cursor += 1;
    addPair(anchor, candidate);
    if (pairs.length >= max) break;
  }

  return pairs;
}

export async function generateMetadata({ params }: CompareSlugProps): Promise<Metadata> {
  const { slug } = await params;
  const names = slug.split("-vs-").map((item) => item.replace(/-/g, " "));
  return {
    title: `${names.join(" vs ")} comparison`,
    description: `Detailed side-by-side comparison for ${names.join(" vs ")}.`,
  };
}

export default async function CompareSlugPage({ params }: CompareSlugProps) {
  const { slug } = await params;
  const [products, trendingPool] = await Promise.all([
    getCompareProductsFromSlug(slug),
    listTrendingProducts(80),
  ]);
  const safeProducts = JSON.parse(JSON.stringify(products));

  if (products.length < 2) {
    return (
      <main className="mobile-container py-8">
        <section className="panel p-5 text-sm text-slate-600">Could not load at least two valid products for this comparison URL.</section>
      </main>
    );
  }

  const winner = getComparisonWinner(products);
  const relatedComparisons = buildRelatedComparisonPairs(products, trendingPool, 20);
  const safeRelatedComparisons = relatedComparisons.map((pair) => ({
    left: {
      slug: pair.left.slug,
      name: pair.left.name,
      images: pair.left.images || [],
    },
    right: {
      slug: pair.right.slug,
      name: pair.right.name,
      images: pair.right.images || [],
    },
  }));

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section>
        <CompareTable products={safeProducts} />
      </section>

      <section className="mt-4 panel p-4">
        <h2 className="text-base font-bold text-slate-900">Winner summary</h2>
        <p className="mt-2 text-sm text-slate-700">
          {winner ? `${winner.name} wins overall based on ratings balance and value score.` : "No winner could be calculated."}
        </p>
      </section>

      <RelatedComparisons pairs={safeRelatedComparisons} initialVisible={14} />
    </main>
  );
}
