"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { hasCapability, type AdminCapability, type AdminRole } from "@/lib/admin/permissions";

type NavItem = {
  href: string;
  label: string;
  capability: AdminCapability;
};

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard", capability: "dashboard" },
  { href: "/admin/products", label: "Products", capability: "products" },
  { href: "/admin/blogs", label: "Blogs", capability: "blogs" },
  { href: "/admin/processors", label: "Processors", capability: "processors" },
];

type Viewer = {
  email?: string;
  role?: AdminRole;
};

function prettyRole(role?: string): string {
  return String(role || "admin").replaceAll("_", " ").toUpperCase();
}

function prettyName(email?: string): string {
  const raw = String(email || "").split("@")[0] || "Admin User";
  return raw
    .split(/[.\-_]/g)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function SidebarLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2.5 text-sm leading-none transition ${
        active
          ? "border border-blue-200 bg-gradient-to-r from-blue-100 to-blue-50 font-extrabold text-blue-900"
          : "text-slate-800 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const visibleItems = useMemo(() => {
    if (!role) return items;
    return items.filter((item) => hasCapability(role, item.capability));
  }, [role]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const response = await fetch("/api/admin/profile", { cache: "no-store" });
        const json = (await response.json()) as { viewer?: Viewer };
        if (!active) return;
        if (response.ok && json.viewer) {
          setViewer(json.viewer);
          setRole(json.viewer.role || null);
        } else {
          setViewer(null);
          setRole(null);
          if (response.status === 401 && !pathname?.startsWith("/admin/login")) {
            const loginUrl = `/admin/login?next=${encodeURIComponent(pathname || "/admin")}`;
            router.replace(loginUrl);
          }
        }
      } catch {
        if (!active) return;
        setViewer(null);
        setRole(null);
      } finally {
        if (active) setProfileLoaded(true);
      }
    }
    loadProfile().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!profileLoaded || !pathname || pathname.startsWith("/admin/login")) return;
    if (!role) return;
    if (pathname.startsWith("/admin/processor-") && hasCapability(role, "processors")) return;
    const allowed = visibleItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    if (!allowed) router.replace("/admin");
  }, [pathname, profileLoaded, role, router, visibleItems]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  if (pathname?.startsWith("/admin/login")) {
    return <div className="mx-auto min-h-screen max-w-6xl px-3 pb-6 pt-4 sm:px-4">{children}</div>;
  }

  const dashboardItem = visibleItems.find((item) => item.href === "/admin");
  const contentItems = visibleItems.filter((item) => item.href !== "/admin");

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      <div className="h-1 w-full bg-blue-700" />

      <div className="grid gap-4 p-2 sm:p-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-4 lg:h-fit">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{prettyName(viewer?.email)}</p>
                <p className="mt-2 text-sm text-slate-500">{viewer?.email || "admin@local"}</p>
              </div>
              <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                {prettyRole(role || undefined)}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200 bg-white p-2 shadow-sm">
            {dashboardItem ? (
              <SidebarLink href={dashboardItem.href} label={dashboardItem.label} active={pathname === dashboardItem.href} />
            ) : null}
          </section>

          <section className="rounded-2xl border border-cyan-200 bg-[#f8fbff] p-2 shadow-sm">
            <div className="space-y-1">
              {contentItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-fuchsia-200 bg-[#fbf8ff] p-2 shadow-sm">
            <p className="px-3 py-2 text-base font-bold text-slate-700">Users</p>
            <p className="px-3 pb-2 text-xs text-slate-500">Role templates and team controls (next step).</p>
          </section>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 hover:bg-rose-100"
          >
            Logout
          </button>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-[#f4f6fa] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <p className="text-sm font-bold text-slate-900">Admin Menu</p>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              {mobileOpen ? "Close" : "Open"}
            </button>
          </div>
          {mobileOpen ? (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-2 lg:hidden">
              {visibleItems.map((item) => (
                <SidebarLink
                  key={`mobile-${item.href}`}
                  href={item.href}
                  label={item.label}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                />
              ))}
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </div>
  );
}
