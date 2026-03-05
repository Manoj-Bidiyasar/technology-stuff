"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type ImageGalleryModalButtonProps = {
  images: string[];
  name: string;
};

export default function ImageGalleryModalButton({ images, name }: ImageGalleryModalButtonProps) {
  const normalized = useMemo(() => {
    const valid = (images || []).filter(Boolean);
    return valid.length > 0 ? valid : ["https://placehold.co/900x600?text=No+Image"];
  }, [images]);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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

            <div className="relative h-[44vh] min-h-[260px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
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
                  } bg-slate-50`}
                  aria-label={`Show gallery image ${index + 1}`}
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
