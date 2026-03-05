"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type ProductImageGalleryProps = {
  images: string[];
  name: string;
};

export default function ProductImageGallery({ images, name }: ProductImageGalleryProps) {
  const normalized = useMemo(() => {
    const valid = (images || []).filter(Boolean);
    return valid.length > 0 ? valid : ["https://placehold.co/700x440?text=No+Image"];
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const active = normalized[Math.min(activeIndex, normalized.length - 1)];

  return (
    <div className="grid gap-2 sm:grid-cols-[72px_minmax(0,1fr)]">
      <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:max-h-64 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden">
        {normalized.slice(0, 8).map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-slate-50 ${
              index === activeIndex ? "border-blue-400" : "border-slate-200"
            }`}
            aria-label={`Show image ${index + 1}`}
          >
            <Image src={image} alt={`${name} thumbnail ${index + 1}`} fill className="object-cover" unoptimized />
          </button>
        ))}
      </div>

      <div className="order-1 relative h-64 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:order-2">
        <Image src={active} alt={name} fill className="object-contain" unoptimized />
      </div>
    </div>
  );
}
