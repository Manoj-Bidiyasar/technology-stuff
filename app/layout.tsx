import type { Metadata } from "next";
import Link from "next/link";
import { Sora, Space_Mono } from "next/font/google";
import MainNav from "@/components/MainNav";
import LayoutHeaderSearch from "@/components/LayoutHeaderSearch";
import { listHeaderSuggestionsCached } from "@/lib/firestore/products";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Technology Stuff | Mobile Reviews and Comparisons",
    template: "%s | Technology Stuff",
  },
  description:
    "Mobile phone reviews, complete specifications, side-by-side comparisons, and buying guides.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headerSuggestions = await listHeaderSuggestionsCached();

  return (
    <html lang="en">
      <body className={`${sora.variable} ${spaceMono.variable} antialiased`}>
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur">
          <div className="mobile-container py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
                  TS
                </span>
                <span className="text-sm font-extrabold tracking-wide text-slate-900 sm:text-base">Technology Stuff</span>
              </Link>
              <LayoutHeaderSearch
                variant="desktop"
                suggestions={headerSuggestions}
              />
              <MainNav />
            </div>

            <LayoutHeaderSearch
              variant="mobile"
              suggestions={headerSuggestions}
            />
          </div>
        </header>

        {children}

        <footer className="mt-10 border-t border-white/60 bg-white/80">
          <div className="mobile-container py-5 text-xs text-slate-600 sm:text-sm">
            <p>Technology Stuff | Reviews, specs, comparisons and buying guides.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
