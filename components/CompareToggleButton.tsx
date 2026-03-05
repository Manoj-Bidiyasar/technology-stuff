"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addToCompareSelection,
  getCompareSelection,
  getCompareSelectionEventName,
  isInCompareSelection,
  removeFromCompareSelection,
} from "@/lib/utils/compareSelection";

type CompareToggleButtonProps = {
  slug: string;
  name: string;
  image?: string;
  price?: number;
  deviceType?: "smartphone" | "tablet";
};

export default function CompareToggleButton({ slug, name, image, price, deviceType = "smartphone" }: CompareToggleButtonProps) {
  const [selected, setSelected] = useState(false);
  const [full, setFull] = useState(false);

  const eventName = useMemo(() => getCompareSelectionEventName(deviceType), [deviceType]);

  useEffect(() => {
    function syncState() {
      const items = getCompareSelection(deviceType);
      setSelected(isInCompareSelection(slug, deviceType));
      setFull(items.length >= 3 && !items.some((item) => item.slug === slug));
    }
    syncState();
    window.addEventListener(eventName, syncState);
    window.addEventListener("storage", syncState);
    return () => {
      window.removeEventListener(eventName, syncState);
      window.removeEventListener("storage", syncState);
    };
  }, [deviceType, eventName, slug]);

  return (
    <button
      type="button"
      onClick={() => {
        if (selected) {
          removeFromCompareSelection(slug, deviceType);
          return;
        }
        if (full) return;
        addToCompareSelection({ slug, name, image, price }, deviceType);
      }}
      disabled={full}
      className={`text-sm font-bold ${
        selected ? "text-blue-700" : "text-orange-600 hover:text-orange-700"
      } disabled:cursor-not-allowed disabled:text-slate-400`}
      aria-label={selected ? `Remove ${name} from compare` : `Add ${name} to compare`}
      title={full ? "You can compare up to 3 phones" : undefined}
    >
      {selected ? "Added" : "+ Compare"}
    </button>
  );
}
