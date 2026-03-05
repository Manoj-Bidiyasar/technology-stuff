"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/mobile", label: "Mobiles" },
  { href: "/tablets", label: "Tablets" },
  { href: "/processors", label: "Processors" },
  { href: "/blog", label: "Blog" },
  { href: "/admin", label: "Admin" },
];

export default function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-2 md:flex">
      {navItems.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition lg:text-sm ${
              isActive ? "bg-blue-700 text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
