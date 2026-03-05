"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const items: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M3 13h8V3H3v10Zm10 8h8V11h-8v10ZM3 21h8v-6H3v6Zm10-10h8V3h-8v8Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="m12 2 8 4v12l-8 4-8-4V6l8-4Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 6.5 12 11l8-4.5M12 11v11" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    href: "/admin/blogs",
    label: "Blogs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
];

function AdminNavLink({ href, label, icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && pathname?.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        isActive ? "bg-[color:var(--brand)] text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function getCrumb(pathname: string): { section: string; page: string } {
  if (pathname === "/admin") return { section: "Admin", page: "Dashboard" };
  if (pathname === "/admin/products") return { section: "Admin", page: "Products" };
  if (pathname === "/admin/blogs") return { section: "Admin", page: "Blogs" };
  if (/^\/admin\/blogs\/[^/]+$/.test(pathname)) return { section: "Admin / Blogs", page: "Edit Blog" };
  return { section: "Admin", page: "Panel" };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const crumb = getCrumb(pathname || "/admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-3 pb-6 pt-4 sm:px-4">
      <section className="panel mb-3 p-2 sm:hidden">
        <div className="flex items-center justify-between">
          <p className="px-2 text-sm font-bold text-slate-900">Admin Navigation</p>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
        {mobileOpen ? (
          <nav className="mt-2 grid gap-1">
            {items.map((item) => (
              <AdminNavLink key={`mobile-${item.href}`} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </nav>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="panel hidden h-fit p-3 sm:block sm:sticky sm:top-4">
          <p className="chip">Admin Panel</p>
          <nav className="mt-3 grid gap-1">
            {items.map((item) => (
              <AdminNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
            ))}
          </nav>
        </aside>

        <div className="space-y-3">
          <section className="panel p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{crumb.section}</p>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg">{crumb.page}</h1>
          </section>
          {children}
        </div>
      </div>
    </div>
  );
}
