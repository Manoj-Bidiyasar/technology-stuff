"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { announceProductImageColorSelection, PRODUCT_IMAGE_COLOR_SELECTION_EVENT } from "@/lib/utils/productImageSelection";
import type { ProductGeneralVariant, ProductImageItem } from "@/lib/types/content";

type ImageGalleryModalButtonProps = {
  images: string[];
  allColorImages?: string[];
  imageVariants?: Array<{ color: string; images: string[] }>;
  imageItems?: ProductImageItem[];
  colors?: string[];
  memoryVariants?: ProductGeneralVariant[];
  name: string;
  background?: string;
};

export default function ImageGalleryModalButton({ images, allColorImages = [], imageVariants = [], imageItems = [], colors = [], memoryVariants = [], name, background = "#ffffff" }: ImageGalleryModalButtonProps) {
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
  const hasVariantColorAvailability = memoryVariants.some((variant) => Array.isArray(variant.colors));
  const availableImageVariants = hasVariantColorAvailability
    ? normalizedVariants.filter((imageVariant) => memoryVariants.some((variant) => !Array.isArray(variant.colors) || variant.colors.some((color) => color.trim().toLocaleLowerCase() === imageVariant.color.trim().toLocaleLowerCase())))
    : normalizedVariants;

  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    const handleSelection = (event: Event) => {
      const color = (event as CustomEvent<string | null>).detail;
      setSelectedColor(color);
      setActiveIndex(0);
    };
    window.addEventListener(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, handleSelection);
    return () => window.removeEventListener(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, handleSelection);
  }, []);

  const selectedVariant = selectedColor === null ? undefined : normalizedVariants.find((variant) => variant.color.trim().toLocaleLowerCase() === selectedColor.trim().toLocaleLowerCase());
  const selectedImages = selectedColor !== null
    ? selectedVariant?.images || generalImages
    : unified.length
      ? unified.map((item) => item.url)
      : [...overviewImages, ...generalImages];
  const normalized = selectedImages.length > 0
    ? selectedImages
    : ["https://placehold.co/900x600?text=No+Image"];
  const active = normalized[Math.min(activeIndex, normalized.length - 1)];

  function moveImage(direction: -1 | 1) {
    setActiveIndex((index) => (index + direction + normalized.length) % normalized.length);
  }

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveImage(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveImage(1);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, normalized.length]);

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

            {availableImageVariants.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Choose phone color">
                <span className="mr-1 text-sm font-semibold text-slate-700">Color:</span>
                {availableImageVariants.map((variant, index) => (
                  <button
                    key={`${variant.color}-${index}`}
                    type="button"
                    onClick={() => {
                      const nextColor = selectedColor?.trim().toLocaleLowerCase() === variant.color.trim().toLocaleLowerCase() ? null : variant.color;
                      setSelectedColor(nextColor);
                      setActiveIndex(0);
                      announceProductImageColorSelection(nextColor);
                    }}
                    aria-pressed={selectedColor?.trim().toLocaleLowerCase() === variant.color.trim().toLocaleLowerCase()}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selectedColor?.trim().toLocaleLowerCase() === variant.color.trim().toLocaleLowerCase() ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"}`}
                  >
                    {variant.color}
                  </button>
                ))}
              </div>
            ) : null}

            <div style={{ backgroundColor: background === "transparent" ? "transparent" : background }} className="relative h-[44vh] min-h-[260px] overflow-hidden rounded-xl border border-slate-200">
              <Image src={active} alt={name} fill className="object-contain" unoptimized />
              {normalized.length > 1 ? <>
                <button type="button" onClick={() => moveImage(-1)} aria-label="Previous image" title="Previous image (←)" className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-800 shadow hover:bg-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button type="button" onClick={() => moveImage(1)} aria-label="Next image" title="Next image (→)" className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white/90 text-slate-800 shadow hover:bg-white">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </> : null}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {normalized.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
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
