"use client";

import { useState } from "react";
import Image from "next/image";

type ComparisonSuggestionImageProps = {
  src: string;
  alt: string;
};

export default function ComparisonSuggestionImage({ src, alt }: ComparisonSuggestionImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="mx-auto relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {!loaded ? <div className="absolute inset-0 animate-pulse bg-slate-100" /> : null}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain p-1.5"
        unoptimized
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
