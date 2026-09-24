"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isSupported, logEvent } from "firebase/analytics";
import { app } from "@/lib/firebase/client";

export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    void isSupported()
      .then(async (supported) => {
        if (!supported || cancelled) return;

        const { getAnalytics } = await import("firebase/analytics");
        if (cancelled) return;

        const analytics = getAnalytics(app);
        logEvent(analytics, "page_view", {
          page_path: `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`,
          page_location: window.location.href,
          page_title: document.title,
        });
      })
      .catch((error: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Firebase Analytics could not be initialized.", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}
