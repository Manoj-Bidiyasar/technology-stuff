"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type MobilePageTopBarProps = {
  total: number;
  entityLabel?: string;
};

type SortOption = { value: string; label: string };

const PRIMARY_SORT_OPTIONS: SortOption[] = [
  { value: "popularity", label: "Popularity" },
  { value: "latest", label: "Recency" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

const SCORE_SORT_OPTIONS: SortOption[] = [
  { value: "overall", label: "Technology Stuff Score" },
  { value: "performance", label: "Performance Score" },
  { value: "camera", label: "Camera Score" },
  { value: "battery", label: "Battery Score" },
  { value: "display", label: "Display Score" },
];

function formatChipLabel(key: string, value: string): string {
  if (key === "brand") return value;
  if (key === "minPrice" || key === "maxPrice") return "";
  if (key === "priceBucket") {
    const map: Record<string, string> = {
      u10: "Under ₹10,000",
      "10-20": "₹10,000 - ₹20,000",
      "20-30": "₹20,000 - ₹30,000",
      "30-40": "₹30,000 - ₹40,000",
      "40-50": "₹40,000 - ₹50,000",
      "50-60": "₹50,000 - ₹60,000",
      a60: "₹60,000 and above",
    };
    return map[value] || value;
  }
  if (key === "processor") return value;
  if (key === "network") return value;
  if (key === "ram") return `${value}GB+ RAM`;
  if (key === "battery") return `${value}mAh+`;
  if (key === "cameraMp") return `${value}MP+ Camera`;
  if (key === "displaySize") return `${value}" + Display`;
  if (key === "refreshRate") return `${value}Hz+`;
  if (key === "displayShape") return `Display: ${value}`;
  if (key === "displayPanel") return value;
  if (key === "displayProtection") return "Display Protection";
  if (key === "displayProtectionName") return value;
  if (key === "rearCameraCount") return `${value} Rear Cam`;
  if (key === "rearMaxRes") return value === "lte16" ? "Rear <= 16MP" : `Rear ${value}MP+`;
  if (key === "rearCameraType") return value;
  if (key === "rearVideo") return `Rear Video ${value.toUpperCase()}`;
  if (key === "rearFunction") return value;
  if (key === "frontCameraCount") return `${value} Front Cam`;
  if (key === "frontRes") return value === "lte8" ? "Front <= 8MP" : `Front ${value}MP+`;
  if (key === "frontFunction") return value;
  if (key === "frontVideo") return `Front Video ${value.toUpperCase()}`;
  return value;
}

export default function MobilePageTopBar({ total, entityLabel = "Phones" }: MobilePageTopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const sort = searchParams.get("sort") || "popularity";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const allSort = [...PRIMARY_SORT_OPTIONS, ...SCORE_SORT_OPTIONS];
  const sortLabel = allSort.find((item) => item.value === sort)?.label || "Popularity";

  const chips = useMemo(() => {
    const rows: Array<{ key: string; label: string }> = [];
    const brand = searchParams.get("brand") || "";
    if (brand) {
      brand
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => rows.push({ key: `brand:${item}`, label: item }));
    }
    if (minPrice || maxPrice) rows.push({ key: "price", label: `₹${minPrice || "0"} - ₹${maxPrice || "Max"}` });

    ["processor", "network", "priceBucket", "ram", "battery", "cameraMp", "displaySize", "refreshRate", "displayShape", "displayPanel", "displayProtection", "displayProtectionName", "rearCameraCount", "rearMaxRes", "rearCameraType", "rearVideo", "rearFunction", "frontCameraCount", "frontRes", "frontFunction", "frontVideo"].forEach((key) => {
      if (key === "priceBucket" && (minPrice || maxPrice)) return;
      const value = searchParams.get(key) || "";
      if (!value) return;
      rows.push({ key, label: formatChipLabel(key, value) });
    });
    return rows;
  }, [searchParams, minPrice, maxPrice]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function removeChip(key: string) {
    if (key === "price") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("minPrice");
      params.delete("maxPrice");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
      return;
    }
    if (key.startsWith("brand:")) {
      const selected = (searchParams.get("brand") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .filter((item) => item !== key.split(":")[1]);
      setParam("brand", selected.join(","));
      return;
    }
    setParam(key, "");
  }

  return (
    <section className="panel mb-4 p-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.95rem] font-medium leading-none text-slate-900">
            <span className="font-bold">{total}</span> {entityLabel} Found
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip.key)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[0.8rem] font-medium text-slate-500"
              >
                {chip.label}
                <span className="text-slate-400">x</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => router.replace(pathname, { scroll: false })}
              className="text-[0.82rem] font-medium text-slate-800 underline underline-offset-2"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex items-center gap-2">
            <span className="text-[0.85rem] font-semibold leading-none text-slate-900">Sort By:</span>
            <button
              type="button"
              onClick={() => setSortOpen((prev) => !prev)}
              className="inline-flex h-8 min-w-[150px] items-center justify-between rounded-none border border-slate-200 bg-white px-2.5 text-[0.85rem] font-medium text-slate-800"
            >
              <span>{sortLabel}</span>
              <span className="text-slate-400">{sortOpen ? "▴" : "▾"}</span>
            </button>
            {sortOpen ? (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[285px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg">
                {PRIMARY_SORT_OPTIONS.map((option) => {
                  const selected = sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setParam("sort", option.value);
                        setSortOpen(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left text-[0.88rem] text-slate-800 hover:bg-slate-50"
                    >
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-orange-500" : "border-slate-300"}`}>
                        <span className={`h-2 w-2 rounded-full ${selected ? "bg-orange-500" : "bg-transparent"}`} />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
                <div className="border-y border-slate-200 bg-slate-50 px-3 py-2 text-[0.88rem] font-bold text-slate-900">By Ratings</div>
                {SCORE_SORT_OPTIONS.map((option) => {
                  const selected = sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setParam("sort", option.value);
                        setSortOpen(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left text-[0.88rem] text-slate-800 last:border-b-0 hover:bg-slate-50"
                    >
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-orange-500" : "border-slate-300"}`}>
                        <span className={`h-2 w-2 rounded-full ${selected ? "bg-orange-500" : "bg-transparent"}`} />
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              } catch {
                setCopied(false);
              }
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-[0.85rem] font-semibold text-slate-600"
          >
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>
    </section>
  );
}
