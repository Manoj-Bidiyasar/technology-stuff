"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { announceProductImageColorSelection, PRODUCT_IMAGE_COLOR_SELECTION_EVENT } from "@/lib/utils/productImageSelection";
import type { ProductImageItem } from "@/lib/types/content";

type ImageGalleryModalButtonProps = {
  images: string[];
  allColorImages?: string[];
  imageVariants?: Array<{ color: string; images: string[] }>;
  imageItems?: ProductImageItem[];
  colors?: string[];
  name: string;
  background?: string;
};

export default function ImageGalleryModalButton({ images, allColorImages = [], imageVariants = [], imageItems = [], colors = [], name, background = "#ffffff" }: ImageGalleryModalButtonProps) {
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

  const [open, setOpen] = useState(false);
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
    : ["https://placehold.co/900x600?text=No+Image"];
  const active = normalized[Math.min(activeIndex, normalized.length - 1)];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        Gallery
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${name} image gallery`}
        >
          <div
            className="w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{name} Gallery</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {normalizedVariants.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Choose phone color">
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

            <div style={{ backgroundColor: background === "transparent" ? "transparent" : background }} className="relative h-[44vh] min-h-[260px] overflow-hidden rounded-xl border border-slate-200">
              <Image src={active} alt={name} fill className="object-contain" unoptimized />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
              {normalized.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative h-16 overflow-hidden rounded-lg border ${
                    index === activeIndex ? "border-blue-500" : "border-slate-200"
                  }`}
                  aria-label={`Show gallery image ${index + 1}`}
                  style={{ backgroundColor: background === "transparent" ? "transparent" : background }}
                >
                  <Image src={image} alt={`${name} ${index + 1}`} fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
