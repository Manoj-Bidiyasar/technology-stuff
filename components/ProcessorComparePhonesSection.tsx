"use client";

import Link from "next/link";
import type { Product } from "@/lib/types/content";

function primaryBuyLink(product: Product): { href: string; label: string } | null {
  if (product.affiliateLinks?.amazon) return { href: product.affiliateLinks.amazon, label: "Buy" };
  if (product.affiliateLinks?.flipkart) return { href: product.affiliateLinks.flipkart, label: "Buy" };
  return null;
}

export default function ProcessorComparePhonesSection({
  title,
  items,
}: {
  title: string;
  items: Product[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">Click device name to open your phone specification page.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-900">
              <th className="w-12 px-4 py-3 font-bold">#</th>
              <th className="px-4 py-3 font-bold">Phone</th>
              <th className="w-28 px-4 py-3 font-bold">Buy</th>
            </tr>
          </thead>
          <tbody>
            {items.map((product, index) => {
              const buy = primaryBuyLink(product);
              return (
                <tr key={product.slug} className="border-b border-slate-200 last:border-b-0">
                  <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link href={`/mobile/${product.slug}`} className="font-semibold text-blue-700 hover:underline">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {buy ? (
                      <a
                        href={buy.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-md bg-orange-500 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-orange-600"
                      >
                        {buy.label}
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
