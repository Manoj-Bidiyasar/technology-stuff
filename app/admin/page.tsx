import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="space-y-4">
      <section className="panel p-4 sm:p-5">
        <p className="chip">Control Center</p>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Manage products and blogs from a single panel.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/admin/products" className="panel block p-4 transition hover:border-blue-300">
          <h2 className="text-lg font-bold text-slate-900">Products</h2>
          <p className="mt-1 text-sm text-slate-600">Add, edit, delete products and update specs/ratings.</p>
        </Link>

        <Link href="/admin/blogs" className="panel block p-4 transition hover:border-blue-300">
          <h2 className="text-lg font-bold text-slate-900">Blogs</h2>
          <p className="mt-1 text-sm text-slate-600">Create articles, edit HTML content, and publish updates.</p>
        </Link>

        <Link href="/admin/processors" className="panel block p-4 transition hover:border-blue-300">
          <h2 className="text-lg font-bold text-slate-900">Processors</h2>
          <p className="mt-1 text-sm text-slate-600">Manage processor list entries, classes, and compare coverage.</p>
        </Link>
      </section>
    </main>
  );
}
