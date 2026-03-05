import Link from "next/link";

export default function AdminBlogLegacyEditPage() {
  return (
    <main className="space-y-3">
      <section className="panel p-4">
        <h1 className="text-xl font-bold text-slate-900">Blog editing moved</h1>
        <p className="mt-2 text-sm text-slate-600">Use the inline editor in /admin/blogs for add/edit/delete operations.</p>
      </section>
      <Link href="/admin/blogs" className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
        Back to Blog Manager
      </Link>
    </main>
  );
}
