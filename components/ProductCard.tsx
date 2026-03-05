import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types/content";
import { formatPrice } from "@/lib/utils/format";
import { calculateOverallScore100 } from "@/lib/utils/score";
import { getScoreBadgeTone } from "@/lib/utils/scoreBadge";

function formatScore(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function cleanValue(value: unknown): string {
  const text = String(value ?? "").trim();
  return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined" ? text : "";
}

function formatOS(product: Product): string {
  const fromSpecs = cleanValue(product.specs.os);
  if (fromSpecs) return fromSpecs;
  const name = cleanValue(product.software?.os?.name);
  const version = cleanValue(product.software?.os?.version);
  if (name && version) return `${name} ${version}`;
  return name || version || "";
}

function formatOsUpdates(product: Product): string {
  const years = Number(product.software?.updates?.os || 0);
  return years > 0 ? `${years} Years OS Updates` : "";
}

function formatRamType(product: Product): string {
  const list = (product.memoryStorage?.ramType || []).map((item) => cleanValue(item)).filter(Boolean);
  const unique = Array.from(new Set(list));
  return unique[0] || "";
}

function formatStorageType(product: Product): string {
  const list = (product.memoryStorage?.storageType || []).map((item) => cleanValue(item)).filter(Boolean);
  const unique = Array.from(new Set(list));
  return unique[0] || "";
}

function pickTopSpecs(product: Product): Array<{ key: string; label: string; value: string }> {
  const candidates = [
    { key: "display", label: "Display", value: cleanValue(product.specs.display) },
    { key: "processor", label: "Processor", value: cleanValue(product.specs.processor) },
    { key: "rear-camera", label: "Rear Camera", value: cleanValue(product.specs.rearCamera) || cleanValue(product.specs.camera) },
    { key: "battery", label: "Battery", value: cleanValue(product.specs.battery) },
    { key: "os-updates", label: "OS Updates", value: formatOsUpdates(product) },
    { key: "os", label: "OS", value: formatOS(product) },
    { key: "ram-type", label: "RAM Type", value: formatRamType(product) },
    { key: "storage-type", label: "Storage Type", value: formatStorageType(product) },
  ];

  return candidates.filter((item) => Boolean(item.value)).slice(0, 4);
}

function normalizeSource(value?: string): string {
  const raw = cleanValue(value).toLowerCase();
  if (raw === "amazon") return "Amazon";
  if (raw === "flipkart") return "Flipkart";
  return "Live";
}

function getStartingPrice(product: Product, fallbackPrice: number): number {
  const variantPrices = (product.general?.variants || [])
    .map((item) => Number(item?.launchPrice || 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (variantPrices.length === 0) return fallbackPrice;
  return Math.min(...variantPrices);
}

export default function ProductCard({ product, basePath = "/mobile" }: { product: Product; basePath?: string }) {
  const image = product.images[0] || "https://placehold.co/640x420?text=Phone";
  const overall100 = calculateOverallScore100(product);
  const badgeTone = getScoreBadgeTone(overall100);
  const liveAmount = Number(product.priceLive?.amount || 0);
  const currentPrice = liveAmount > 0 ? liveAmount : product.price;
  const startingPrice = getStartingPrice(product, currentPrice);
  const source = liveAmount > 0 ? normalizeSource(product.priceLive?.source) : "";
  const topSpecs = pickTopSpecs(product);

  return (
    <Link href={`${basePath}/${product.slug}`} className="panel relative block overflow-hidden p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <span className={`absolute left-3 top-3 z-10 inline-flex h-[40px] w-[40px] rounded-full p-[1.5px] shadow-[0_6px_14px_rgba(15,23,42,0.22)] sm:h-[46px] sm:w-[46px] ${badgeTone.outerClass}`}>
          <span className="inline-flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
            <span className="text-[9px] font-black leading-none text-slate-900 sm:text-[10px]">
              {formatScore(overall100)}
            </span>
            <span className={`mt-0.5 inline-flex flex-col items-center text-[5px] font-semibold uppercase leading-none tracking-wide sm:text-[6px] ${badgeTone.subTextClass}`}>
              <span>Specs</span>
              <span>Score</span>
            </span>
          </span>
        </span>
      <div className="relative h-40 overflow-hidden rounded-lg border border-slate-100 bg-white">
        <Image src={image} alt={product.name} fill className="object-contain p-3" unoptimized />
      </div>
      <h3 className="mt-3 line-clamp-2 text-sm font-bold text-slate-900">{product.name}</h3>
      <div className="mt-2 space-y-1 text-xs text-slate-700">
        {topSpecs.map((item) => (
          <p key={item.key} className="line-clamp-1">
            <span className="font-semibold text-slate-800">{item.label}:</span> {item.value}
          </p>
        ))}
        {topSpecs.length === 0 ? <p className="line-clamp-1">NA</p> : null}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5">
        {source ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            {source}
          </span>
        ) : null}
        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-extrabold text-white">
          Starts {formatPrice(startingPrice)}
        </span>
      </div>
    </Link>
  );
}
