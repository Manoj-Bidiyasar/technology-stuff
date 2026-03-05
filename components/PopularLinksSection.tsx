import Link from "next/link";

type PopularLinksSectionProps = {
  brand: string;
  deviceType?: "smartphone" | "tablet";
};

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function PopularLinksSection({ brand, deviceType = "smartphone" }: PopularLinksSectionProps) {
  const b = brand.trim() || "Smartphone";
  const brandSlug = slugify(b);
  const isTablet = deviceType === "tablet";

  const popular = isTablet
    ? [
        { label: "All Upcoming Tablets", href: "/tablets?sort=latest" },
        { label: `${b} tablets under 30k`, href: `/tablets?brand=${encodeURIComponent(b)}&maxPrice=30000` },
        { label: `${b} tablets under 50k`, href: `/tablets?brand=${encodeURIComponent(b)}&maxPrice=50000` },
      ]
    : [
        { label: "All Upcoming Phones", href: "/mobile?sort=latest" },
        { label: `${b} phones under 10k`, href: `/brand/${encodeURIComponent(brandSlug)}?maxPrice=10000` },
        { label: `${b} phones under 20k`, href: `/brand/${encodeURIComponent(brandSlug)}?maxPrice=20000` },
      ];

  const byPrice = isTablet
    ? [
        { label: "Best Tablets Under 20,000", href: "/tablets?maxPrice=20000&sort=overall" },
        { label: "Best Tablets Under 30,000", href: "/tablets?maxPrice=30000&sort=overall" },
        { label: "Best Tablets Under 50,000", href: "/tablets?maxPrice=50000&sort=overall" },
        { label: "Best Tablets in any price range", href: "/tablets?sort=overall" },
      ]
    : [
        { label: "Best Phones Under 10,000", href: "/mobile?maxPrice=10000&sort=performance" },
        { label: "Best Phones Under 15,000", href: "/mobile?maxPrice=15000&sort=performance" },
        { label: "Best Phones Under 20,000", href: "/mobile?maxPrice=20000&sort=performance" },
        { label: "Best Phones in any price range", href: "/mobile?sort=performance" },
      ];

  const latestLaunches = isTablet
    ? [
        { label: "Samsung Galaxy Tab S10 Ultra", href: "/tablets?q=samsung%20galaxy%20tab%20s10%20ultra" },
        { label: "Apple iPad Pro 13 (2024)", href: "/tablets?q=apple%20ipad%20pro%2013" },
        { label: "Xiaomi Pad 7 Pro", href: "/tablets?q=xiaomi%20pad%207%20pro" },
        { label: "OnePlus Pad 2", href: "/tablets?q=oneplus%20pad%202" },
        { label: "Lenovo Tab P12 Pro 2nd Gen", href: "/tablets?q=lenovo%20tab%20p12%20pro" },
      ]
    : [
        { label: "Vivo V70", href: "/mobile?search=vivo%20v70" },
        { label: "realme P4 Power", href: "/mobile?search=realme%20p4%20power" },
        { label: "Vivo V70 Elite", href: "/mobile?search=vivo%20v70%20elite" },
        { label: "Motorola Signature", href: "/mobile?search=motorola%20signature" },
        { label: "Xiaomi Redmi Note 15 Pro", href: "/mobile?search=redmi%20note%2015%20pro" },
      ];

  const topBrands = ["Samsung", "Vivo", "Motorola", "Realme", "OnePlus", "Oppo", "Xiaomi"];

  function card(title: string, items: Array<{ label: string; href: string }>) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={`${title}-${item.label}`}
              href={item.href}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </article>
    );
  }

  return (
    <section className="mt-6 panel p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-400" />
        <h2 className="text-xl font-extrabold text-slate-900">Explore More</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {card("Popular Picks", popular)}
        {card("By Price", byPrice)}
        {card("Latest Launches", latestLaunches)}
        {card(
          isTablet ? "Tablets By Top Brands" : "Phones By Top Brands",
          topBrands.map((name) => ({
            label: isTablet ? `${name} Tablets` : `${name} Mobiles`,
            href: isTablet ? `/tablets?brand=${encodeURIComponent(name)}` : `/brand/${encodeURIComponent(slugify(name))}`,
          }))
        )}
      </div>
    </section>
  );
}
