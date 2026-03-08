"use client";

import { usePathname } from "next/navigation";
import SearchBar from "@/components/SearchBar";

type Props = {
  suggestions: Array<{ name: string; slug: string; brand: string; deviceType?: string }>;
  variant?: "desktop" | "mobile";
};

export default function LayoutHeaderSearch({ suggestions, variant = "desktop" }: Props) {
  const pathname = usePathname();
  const isMobileList = pathname === "/mobile";
  const isMobileDetail = Boolean(pathname && pathname.startsWith("/mobile/"));
  const isTabletList = pathname === "/tablets";
  const isTabletDetail = Boolean(pathname && pathname.startsWith("/tablets/"));
  const isTabletCompareSlug = Boolean(pathname && pathname.startsWith("/tablets/compare/"));
  const isCompareSlug = Boolean(pathname && pathname.startsWith("/compare/"));
  const isProcessorList = pathname === "/processors";
  const isProcessorCompareSlug = Boolean(pathname && pathname.startsWith("/processors/compare/"));
  const isProcessorDetail = Boolean(pathname && pathname.startsWith("/processors/") && !pathname.startsWith("/processors/compare/"));
  const isProcessorRoute = isProcessorList || isProcessorCompareSlug || isProcessorDetail;
  const shouldShow = isMobileList || isMobileDetail || isTabletList || isTabletDetail || isCompareSlug || isTabletCompareSlug || isProcessorRoute;
  const placeholder = isTabletList || isTabletDetail || isTabletCompareSlug
    ? "Search tablets"
    : isProcessorRoute
      ? "Search processors"
      : "Search mobiles";

  if (!shouldShow) return null;

  if (variant === "mobile") {
    return (
      <div className="mt-3 lg:hidden">
        <SearchBar
          suggestions={suggestions}
          placeholder={placeholder}
          className="max-w-none"
          compact
          iconButton
          hideLeadingIcon
          directNavigate
        />
      </div>
    );
  }

  return (
    <div className="mx-2 hidden max-w-[300px] flex-1 lg:block">
      <SearchBar
        suggestions={suggestions}
        placeholder={placeholder}
        className="max-w-none"
        compact
        iconButton
        hideLeadingIcon
        directNavigate
      />
    </div>
  );
}
