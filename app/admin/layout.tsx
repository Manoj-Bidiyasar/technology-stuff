"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  {
    href: "/admin/processors",
    label: "Processors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
        <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  if (pathname === "/admin/processors") return { section: "Admin", page: "Processors" };
  if (/^\/admin\/blogs\/[^/]+$/.test(pathname)) return { section: "Admin / Blogs", page: "Edit Blog" };
  return { section: "Admin", page: "Panel" };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const crumb = getCrumb(pathname || "/admin");
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (pathname?.startsWith("/admin/login")) {
    return <div className="mx-auto min-h-screen max-w-6xl px-3 pb-6 pt-4 sm:px-4">{children}</div>;
  }

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
          <div className="mt-2 grid gap-2">
            <nav className="grid gap-1">
              {items.map((item) => (
                <AdminNavLink key={`mobile-${item.href}`} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </nav>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Logout
            </button>
          </div>
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
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
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
