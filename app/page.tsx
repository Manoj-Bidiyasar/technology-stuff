import type { Metadata } from "next";
import Link from "next/link";
import BlogCard from "@/components/BlogCard";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import { listLatestBlogs } from "@/lib/firestore/blogs";
import { listLatestProducts, listTrendingProducts } from "@/lib/firestore/products";

export const metadata: Metadata = {
  title: "Home",
  description: "Discover latest mobiles, trending devices, comparisons, and blog updates.",
};

export default async function Home() {
  const [latestMobiles, trendingMobiles, latestBlogs] = await Promise.all([
    listLatestProducts(8),
    listTrendingProducts(8),
    listLatestBlogs(4),
  ]);

  const comparePairs = trendingMobiles.slice(0, 3).map((item, index) => {
    const rival = trendingMobiles[index + 1];
    if (!rival) return null;
    return {
      left: item,
      right: rival,
      slug: `${item.slug}-vs-${rival.slug}`,
    };
  }).filter(Boolean) as Array<{left: (typeof trendingMobiles)[number]; right: (typeof trendingMobiles)[number]; slug: string}>;

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="panel overflow-hidden p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="chip inline-flex">91mobiles-style mobile discovery</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
              Compare smartphones, check full specs, and pick the right phone faster.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Browse the latest launches, filter by budget and RAM, compare side-by-side, and read practical buying guides.
            </p>
            <div className="mt-4">
              <SearchBar
                suggestions={latestMobiles.map((item) => ({ name: item.name, slug: item.slug, brand: item.brand }))}
                placeholder="Search for mobiles like iQOO Neo 9, Galaxy S24"
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Trending this week</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{trendingMobiles[0]?.name || "Top-rated phone"}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Most compared</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {comparePairs[0] ? `${comparePairs[0].left.name} vs ${comparePairs[0].right.name}` : "Best pair pending"}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Latest news</p>
              <p className="mt-2 text-sm font-semibold text-slate-800">{latestBlogs[0]?.title || "Editorial updates"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Latest Mobiles</h2>
          <Link href="/mobile" className="text-sm font-semibold text-blue-700">View all</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {latestMobiles.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Trending Mobiles</h2>
          <Link href="/mobile?sort=performance" className="text-sm font-semibold text-blue-700">Top performance</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trendingMobiles.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </section>

      <section className="mt-8 panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Top Comparisons</h2>
          <Link href="/compare" className="text-sm font-semibold text-blue-700">Compare now</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {comparePairs.map((pair) => (
            <Link key={pair.slug} href={`/compare/${pair.slug}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-blue-200">
              <p className="text-sm font-bold text-slate-900">{pair.left.name} vs {pair.right.name}</p>
              <p className="mt-1 text-xs text-slate-600">Head-to-head ratings and specs winner</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">Latest Blog / News</h2>
          <Link href="/blog" className="text-sm font-semibold text-blue-700">Read all</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {latestBlogs.map((item) => (
            <BlogCard key={item.slug} post={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
