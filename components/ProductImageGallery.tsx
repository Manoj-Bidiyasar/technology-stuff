"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { announceProductImageColorSelection, PRODUCT_IMAGE_COLOR_SELECTION_EVENT } from "@/lib/utils/productImageSelection";
import type { ProductGeneralVariant, ProductImageItem } from "@/lib/types/content";

type ProductImageGalleryProps = {
  images: string[];
  allColorImages?: string[];
  imageVariants?: Array<{ color: string; images: string[] }>;
  imageItems?: ProductImageItem[];
  colors?: string[];
  memoryVariants?: ProductGeneralVariant[];
  name: string;
  background?: string;
  controlsOnly?: boolean;
  hideControls?: boolean;
  showVariantSelector?: boolean;
};

function colorKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function formatMemoryCapacity(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const numeric = text.match(/^(\d+(?:\.\d+)?)\s*(GB|TB)?$/i);
  if (!numeric) return text;
  const amount = Number(numeric[1]);
  const unit = numeric[2]?.toUpperCase();
  if (unit === "TB") return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}TB`;
  if (unit === "GB" || amount < 1024) return `${Number.isInteger(amount) ? amount : amount.toFixed(1)}GB`;
  const tb = amount / 1024;
  return `${Number.isInteger(tb) ? tb : Number(tb.toFixed(1))}TB`;
}

function variantLabel(variant: ProductGeneralVariant, index: number): string {
  const ram = formatMemoryCapacity(variant.ram);
  const storage = formatMemoryCapacity(variant.storage);
  const label = [ram, storage].filter(Boolean).join(" + ");
  return label || `Variant ${index + 1}`;
}

function variantSupportsColor(variant: ProductGeneralVariant, color: string, hasAvailability: boolean): boolean {
  if (!hasAvailability || !Array.isArray(variant.colors)) return true;
  return variant.colors.some((entry) => colorKey(entry) === colorKey(color));
}

export default function ProductImageGallery({ images, allColorImages = [], imageVariants = [], imageItems = [], colors = [], memoryVariants = [], name, background = "#ffffff", controlsOnly = false, hideControls = false, showVariantSelector = true }: ProductImageGalleryProps) {
  const unified = imageItems.filter((item) => item.url?.trim());
  const normalizedVariants = useMemo(() => {
    if (unified.length) {
      const map = new Map<string, { color: string; images: string[] }>();
      const displayName = (value: string) => colors.find((color) => colorKey(color) === colorKey(value)) || value.trim();
      unified.filter((item) => item.color.trim() && colorKey(item.color) !== "all colors").forEach((item) => {
        const key = colorKey(item.color);
        const group = map.get(key);
        if (group) group.images.push(item.url);
        else map.set(key, { color: displayName(item.color), images: [item.url] });
      });
      return Array.from(map.values());
    }
    return imageVariants.filter((variant) => variant.color.trim() && variant.images.some(Boolean)).map((variant) => ({ ...variant, images: variant.images.filter(Boolean) }));
  }, [colors, imageVariants, unified]);
  const overviewImages = useMemo(() => unified.length
    ? unified.filter((item) => item.purpose === "All colors" || colorKey(item.color) === "all colors").map((item) => item.url)
    : allColorImages.filter(Boolean), [allColorImages, unified]);
  const generalImages = useMemo(() => unified.length
    ? unified.filter((item) => !item.color.trim() || colorKey(item.color) === "all colors").map((item) => item.url)
    : (images || []).filter(Boolean), [images, unified]);
  const imageColors = useMemo(() => {
    const source = colors.length ? colors : [...memoryVariants.flatMap((variant) => variant.colors || []), ...normalizedVariants.map((variant) => variant.color)];
    return Array.from(new Map(source.map((color) => [colorKey(color), color.trim()])).values()).filter(Boolean);
  }, [colors, memoryVariants, normalizedVariants]);
  const hasVariantColorAvailability = memoryVariants.some((variant) => Array.isArray(variant.colors));
  const configuredColors = hasVariantColorAvailability
    ? imageColors.filter((color) => memoryVariants.some((variant) => variantSupportsColor(variant, color, hasVariantColorAvailability)))
    : imageColors;

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const handleSelection = (event: Event) => {
      const color = (event as CustomEvent<string | null>).detail;
      setSelectedColor(color);
      setActiveIndex(0);
      if (color) {
        setSelectedVariantIndex((current) => {
          const currentVariant = current === null ? undefined : memoryVariants[current];
          return currentVariant && !variantSupportsColor(currentVariant, color, hasVariantColorAvailability) ? null : current;
        });
      }
    };
    window.addEventListener(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, handleSelection);
    return () => window.removeEventListener(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, handleSelection);
  }, [hasVariantColorAvailability, memoryVariants]);

  const selectedMemoryVariant = selectedVariantIndex === null ? undefined : memoryVariants[selectedVariantIndex];
  const effectiveVariantIndex = selectedVariantIndex !== null && selectedMemoryVariant && (!selectedColor || variantSupportsColor(selectedMemoryVariant, selectedColor, hasVariantColorAvailability))
    ? selectedVariantIndex
    : null;
  const visibleColors = effectiveVariantIndex !== null
    ? configuredColors.filter((color) => variantSupportsColor(memoryVariants[effectiveVariantIndex], color, hasVariantColorAvailability))
    : configuredColors;
  const visibleVariantIndexes = memoryVariants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => !selectedColor || variantSupportsColor(variant, selectedColor, hasVariantColorAvailability));
  const selectedImageVariant = selectedColor
    ? normalizedVariants.find((variant) => colorKey(variant.color) === colorKey(selectedColor))
    : undefined;
  const selectedImages = selectedColor
    ? selectedImageVariant?.images || generalImages
    : unified.length
      ? unified.map((item) => item.url)
      : [...overviewImages, ...generalImages];
  const normalized = selectedImages.length > 0 ? selectedImages : ["https://placehold.co/700x440?text=No+Image"];
  const active = normalized[Math.min(activeIndex, normalized.length - 1)];

  function moveImage(direction: -1 | 1) {
    setActiveIndex((index) => (index + direction + normalized.length) % normalized.length);
  }

  function selectColor(color: string | null) {
    setSelectedColor(color);
    setActiveIndex(0);
    announceProductImageColorSelection(color);
    if (color && selectedMemoryVariant && !variantSupportsColor(selectedMemoryVariant, color, hasVariantColorAvailability)) setSelectedVariantIndex(null);
  }

  function selectMemoryVariant(index: number) {
    setSelectedVariantIndex((current) => current === index ? null : index);
    if (selectedColor && !variantSupportsColor(memoryVariants[index], selectedColor, hasVariantColorAvailability)) selectColor(null);
  }

  if (controlsOnly) {
    return (
      <div className="grid gap-3">
        {visibleColors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Choose phone color">
            <span className="mr-1 text-sm font-semibold text-slate-700">Color:</span>
            {visibleColors.map((color) => (
              <button key={color} type="button" onClick={() => selectColor(colorKey(selectedColor || "") === colorKey(color) ? null : color)} aria-pressed={colorKey(selectedColor || "") === colorKey(color)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${colorKey(selectedColor || "") === colorKey(color) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
                {color}
              </button>
            ))}
          </div>
        ) : null}

        {showVariantSelector && memoryVariants.length > 0 ? (
          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">RAM / storage configuration</p>
              <div className="flex items-center gap-2">
                {selectedColor ? <span className="text-xs text-slate-500">Options available in {selectedColor}</span> : null}
                {effectiveVariantIndex !== null ? <button type="button" onClick={() => setSelectedVariantIndex(null)} className="text-xs font-semibold text-blue-700 underline">Clear selection</button> : null}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleVariantIndexes.map(({ variant, index }) => {
                return (
                  <button key={`${variantLabel(variant, index)}-${index}`} type="button" onClick={() => selectMemoryVariant(index)} aria-pressed={effectiveVariantIndex === index} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${effectiveVariantIndex === index ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                    <span className="font-semibold text-slate-800">{variantLabel(variant, index)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {!controlsOnly && !hideControls && visibleColors.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Choose phone color">
          <span className="mr-1 text-sm font-semibold text-slate-700">Color:</span>
          {visibleColors.map((color) => (
            <button key={color} type="button" onClick={() => selectColor(colorKey(selectedColor || "") === colorKey(color) ? null : color)} aria-pressed={colorKey(selectedColor || "") === colorKey(color)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${colorKey(selectedColor || "") === colorKey(color) ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}>
              {color}
            </button>
          ))}
        </div>
      ) : null}

      {!controlsOnly && !hideControls && showVariantSelector && memoryVariants.length > 0 ? (
        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">RAM / storage configuration</p>
            <div className="flex items-center gap-2">
              {selectedColor ? <span className="text-xs text-slate-500">Options available in {selectedColor}</span> : null}
              {effectiveVariantIndex !== null ? <button type="button" onClick={() => setSelectedVariantIndex(null)} className="text-xs font-semibold text-blue-700 underline">Clear selection</button> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleVariantIndexes.map(({ variant, index }) => {
              return (
                <button key={`${variantLabel(variant, index)}-${index}`} type="button" onClick={() => selectMemoryVariant(index)} aria-pressed={effectiveVariantIndex === index} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${effectiveVariantIndex === index ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                  <span className="font-semibold text-slate-800">{variantLabel(variant, index)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <div style={{ backgroundColor: background === "transparent" ? "transparent" : background }} className="relative h-72 overflow-hidden rounded-xl border border-slate-100 sm:h-80">
          <Image src={active} alt={name} fill className="object-contain" unoptimized />
          {normalized.length > 1 ? (
            <>
              <button type="button" onClick={() => moveImage(-1)} aria-label="Show previous image" className="absolute left-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-slate-800 shadow hover:bg-white">‹</button>
              <button type="button" onClick={() => moveImage(1)} aria-label="Show next image" className="absolute right-2 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-slate-800 shadow hover:bg-white">›</button>
            </>
          ) : null}
        </div>
        <div className="order-2 flex gap-2 overflow-x-auto">
          {normalized.slice(0, 8).map((image, index) => (
            <button key={`${image}-${index}`} type="button" onClick={() => setActiveIndex(index)} style={{ backgroundColor: background === "transparent" ? "transparent" : background }} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${index === activeIndex ? "border-blue-400" : "border-slate-200"}`} aria-label={`Show image ${index + 1}`}>
              <Image src={image} alt={`${name} thumbnail ${index + 1}`} fill className="object-contain p-1" unoptimized />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
