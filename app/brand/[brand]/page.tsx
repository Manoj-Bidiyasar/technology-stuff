import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import Pagination from "@/components/ui/Pagination";
import { listBrands, listPublishedProducts } from "@/lib/firestore/products";

type BrandPageProps = {
  params: Promise<{ brand: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { brand } = await params;
  const decoded = decodeURIComponent(brand);
  return {
    title: `${decoded} Mobiles`,
    description: `Explore ${decoded} mobiles with filters for price, RAM, and battery.`,
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { brand } = await params;
  const query = await searchParams;
  const decodedBrand = decodeURIComponent(brand);

  const page = Number(query.page || 1);
  const [brands, result] = await Promise.all([
    listBrands(),
    listPublishedProducts({
      page,
      pageSize: 12,
      brand: decodedBrand,
      minPrice: typeof query.minPrice === "string" ? Number(query.minPrice) : undefined,
      maxPrice: typeof query.maxPrice === "string" ? Number(query.maxPrice) : undefined,
      minRamGb: typeof query.ram === "string" ? Number(query.ram) : undefined,
      minBatteryMah: typeof query.battery === "string" ? Number(query.battery) : undefined,
      sort: typeof query.sort === "string" ? (query.sort as "latest" | "price-asc" | "price-desc" | "performance") : "latest",
    }),
  ]);

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{decodedBrand} Mobiles</h1>
        <p className="mt-2 text-sm text-slate-600">Filtered by brand, with optional price/RAM/battery controls.</p>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <FilterSidebar brands={brands} processors={[]} />
        <div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
          {result.items.length === 0 ? <p className="panel mt-4 p-4 text-sm text-slate-600">No products in this brand for selected filters.</p> : null}

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath={`/brand/${encodeURIComponent(decodedBrand)}`}
            searchParams={{
              minPrice: typeof query.minPrice === "string" ? query.minPrice : undefined,
              maxPrice: typeof query.maxPrice === "string" ? query.maxPrice : undefined,
              ram: typeof query.ram === "string" ? query.ram : undefined,
              battery: typeof query.battery === "string" ? query.battery : undefined,
              sort: typeof query.sort === "string" ? query.sort : undefined,
            }}
          />
        </div>
      </section>
    </main>
  );
}
