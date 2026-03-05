import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types/content";
import { formatPrice } from "@/lib/utils/format";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { formatLaunchDate, getLaunchState } from "@/lib/utils/launchStatus";
import CompareToggleButton from "@/components/CompareToggleButton";

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatScore(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function getStartingPrice(product: Product): number {
  const variantPrices = (product.general?.variants || [])
    .map((item) => Number(item?.launchPrice || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (variantPrices.length === 0) return Number(product.price || 0);
  return Math.min(...variantPrices);
}

function releaseDate(product: Product): string {
  return formatLaunchDate(product.general?.launchDate) || cleanValue(product.general?.launchDate);
}

function specLine(label: string, value: string) {
  if (!value) return null;
  return (
    <p className="line-clamp-1 text-sm text-slate-800">
      <span className="font-semibold text-slate-900">{label}:</span> {value}
    </p>
  );
}

export default function TabletFinderRow({ product }: { product: Product }) {
  const image = product.images?.[0] || "https://placehold.co/420x420?text=Tablet";
  const score = calculateOverallScore100(product);
  const price = getStartingPrice(product);
  const dateText = releaseDate(product);
  const rating = Number(product.ratings?.overall || 0);
  const launchState = getLaunchState(product.general, product.tags);

  return (
    <article className="panel relative p-3 sm:p-4">
      <div className="grid gap-3 pt-7 sm:grid-cols-[180px_minmax(0,1fr)] sm:pt-0">
        <div className="relative overflow-visible rounded-xl border border-slate-200 bg-white">
          <span className="absolute -left-1 -top-4 z-10 rounded-md bg-gradient-to-b from-emerald-500 to-emerald-700 p-[1px] shadow-[0_6px_14px_rgba(5,150,105,0.35)]">
            <span className="block rounded-[5px] border border-emerald-300/60 bg-emerald-600 px-1.5 py-1 text-center text-[10px] font-extrabold leading-tight text-white">
              <span className="block drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]">{formatScore(score)}</span>
              <span className="block text-[8px] font-bold text-emerald-50">Spec Score</span>
            </span>
          </span>
          <Image src={image} alt={product.name} width={360} height={360} className="h-[180px] w-full object-contain p-3" unoptimized />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-xl font-extrabold text-slate-900">
                <Link href={`/tablets/${product.slug}`} className="hover:text-blue-700">
                  {product.name}
                </Link>
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {(product.tags || []).some((tag) => String(tag).toLowerCase() === "new") ? (
                  <span className="rounded-md bg-lime-600 px-2 py-0.5 text-[11px] font-bold text-white">New</span>
                ) : null}
                {launchState === "upcoming" ? (
                  <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">Upcoming</span>
                ) : null}
                {dateText ? <span className="text-xs font-semibold text-slate-600">Release Date: {dateText}</span> : null}
              </div>
            </div>
            <CompareToggleButton slug={product.slug} name={product.name} image={image} price={price} deviceType="tablet" />
          </div>

          <div className="mt-3 space-y-1.5">
            {specLine("Processor", cleanValue(product.specs?.processor))}
            {specLine("RAM", cleanValue(product.specs?.ram))}
            {specLine("Rear Camera", cleanValue(product.specs?.rearCamera) || cleanValue(product.specs?.camera))}
            {specLine("Front Camera", cleanValue(product.specs?.frontCamera))}
            {specLine("Battery", cleanValue(product.specs?.battery))}
            {specLine("Display", cleanValue(product.specs?.display))}
          </div>

          {rating > 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              Expert Rating: <span className="font-extrabold text-slate-900">{rating.toFixed(1)}/10</span>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-lg font-extrabold text-slate-900">Starts {formatPrice(price)}</span>
            <div className="flex items-center gap-2">
              <Link href={`/tablets/${product.slug}`} className="text-sm font-bold text-slate-800 underline underline-offset-2">
                View All Specs
              </Link>
              {product.affiliateLinks?.amazon || product.affiliateLinks?.flipkart ? (
                <a
                  href={product.affiliateLinks?.amazon || product.affiliateLinks?.flipkart || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-bold text-white"
                >
                  Go To Store
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
