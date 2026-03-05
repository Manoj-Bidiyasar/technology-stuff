import type { Product, ProductRatings, ProductSpecs, TimestampLike } from "@/lib/types/content";

export function toDate(value: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Price unavailable";
  return `₹${value.toLocaleString("en-IN")}`;
}

export function parseNumberish(value: string | number | undefined | null): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return null;
  const match = String(value).replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function toRamGb(specs: ProductSpecs): number | null {
  if (specs.ramGb) return specs.ramGb;
  return parseNumberish(specs.ram);
}

export function toBatteryMah(specs: ProductSpecs): number | null {
  if (specs.batteryMah) return specs.batteryMah;
  return parseNumberish(specs.battery);
}

export function toDisplayInch(specs: ProductSpecs): number | null {
  if (specs.displaySizeInch) return specs.displaySizeInch;
  return parseNumberish(specs.display);
}

export function averageRating(ratings?: ProductRatings): number {
  const source = ratings || {};
  const values = [source.performance, source.camera, source.battery, source.display].filter(
    (x): x is number => typeof x === "number" && x > 0
  );
  if (source.overall && source.overall > 0) return source.overall;
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function productSearchText(product: Product): string {
  return `${product.name} ${product.brand} ${product.specs?.processor || ""}`.toLowerCase();
}
