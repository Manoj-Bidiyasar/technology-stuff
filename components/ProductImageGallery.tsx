"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { announceProductImageColorSelection, PRODUCT_IMAGE_COLOR_SELECTION_EVENT } from "@/lib/utils/productImageSelection";
import type { ProductImageItem } from "@/lib/types/content";

type ProductImageGalleryProps = {
  images: string[];
  allColorImages?: string[];
  imageVariants?: Array<{ color: string; images: string[] }>;
  imageItems?: ProductImageItem[];
  colors?: string[];
  name: string;
  background?: string;
};

export default function ProductImageGallery({ images, allColorImages = [], imageVariants = [], imageItems = [], colors = [], name, background = "#ffffff" }: ProductImageGalleryProps) {
  const unified = imageItems.filter((item) => item.url?.trim());
  const normalizedVariants = useMemo(() => {
    if (unified.length) {
      const map = new Map<string, { color: string; images: string[] }>();
      const displayName = (value: string) => colors.find((color) => color.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase()) || value.trim();
      unified.filter((item) => item.color.trim() && item.color.toLowerCase() !== "all colors").forEach((item) => {
        const key = item.color.trim().toLowerCase();
        const group = map.get(key);
        if (group) group.images.push(item.url);
        else map.set(key, { color: displayName(item.color), images: [item.url] });
      });
      return Array.from(map.values());
    }
    return imageVariants.filter((variant) => variant.color.trim() && variant.images.some(Boolean)).map((variant) => ({ ...variant, images: variant.images.filter(Boolean) }));
  }, [colors, imageVariants, unified]);
  const overviewImages = useMemo(() => unified.length
    ? unified.filter((item) => item.purpose === "All colors" || item.color.toLowerCase() === "all colors").map((item) => item.url)
    : allColorImages.filter(Boolean), [allColorImages, unified]);
  const generalImages = useMemo(() => unified.length
    ? unified.filter((item) => !item.color.trim() || item.color.toLowerCase() === "all colors").map((item) => item.url)
    : (images || []).filter(Boolean), [images, unified]);

  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const handleSelection = (event: Event) => {
      const index = (event as CustomEvent<number | null>).detail;
      setSelectedColorIndex(index);
      setActiveIndex(0);
    };
    window.addEventListener(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, handleSelection);
    return () => window.removeEventListener(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, handleSelection);
  }, []);
  const selectedVariant = selectedColorIndex === null ? undefined : normalizedVariants[Math.min(selectedColorIndex, Math.max(0, normalizedVariants.length - 1))];
  const selectedImages = selectedColorIndex !== null && selectedVariant
    ? selectedVariant.images
    : [...overviewImages, ...generalImages];
  const normalized = selectedImages.length > 0
    ? selectedImages
    : ["https://placehold.co/700x440?text=No+Image"];
  const active = normalized[Math.min(activeIndex, normalized.length - 1)];

  return (
    <div className="grid gap-3">
      {normalizedVariants.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Choose phone color">
          <span className="mr-1 text-sm font-semibold text-slate-700">Color:</span>
          {overviewImages.length > 0 ? (
            <button
              type="button"
              onClick={() => { setSelectedColorIndex(null); setActiveIndex(0); announceProductImageColorSelection(null); }}
              aria-pressed={selectedColorIndex === null}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selectedColorIndex === null ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
            >
              All colors
            </button>
          ) : null}
          {normalizedVariants.map((variant, index) => (
            <button
              key={`${variant.color}-${index}`}
              type="button"
              onClick={() => { setSelectedColorIndex(index); setActiveIndex(0); announceProductImageColorSelection(index); }}
              aria-pressed={selectedColorIndex === index}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selectedColorIndex === index ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
            >
              {variant.color}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
      <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:max-h-64 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
        {normalized.slice(0, 8).map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            style={{ backgroundColor: background === "transparent" ? "transparent" : background }}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
              index === activeIndex ? "border-blue-400" : "border-slate-200"
            }`}
            aria-label={`Show image ${index + 1}`}
          >
            <Image src={image} alt={`${name} thumbnail ${index + 1}`} fill className="object-contain p-1" unoptimized />
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: background === "transparent" ? "transparent" : background }} className="order-1 relative h-64 overflow-hidden rounded-xl border border-slate-100 sm:order-2">
        <Image src={active} alt={name} fill className="object-contain" unoptimized />
      </div>
      </div>
    </div>
  );
}
