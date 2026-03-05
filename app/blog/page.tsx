import type { Metadata } from "next";
import BlogCard from "@/components/BlogCard";
import Pagination from "@/components/ui/Pagination";
import { listPublishedBlogs } from "@/lib/firestore/blogs";

type BlogPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Blog",
  description: "Latest mobile news, review explainers, and buying guides.",
};

export default async function BlogListPage({ searchParams }: BlogPageProps) {
  const query = await searchParams;
  const page = Number(query.page || 1);
  const rows = await listPublishedBlogs(page, 8);

  return (
    <main className="mobile-container py-6 sm:py-8">
      <section className="panel p-4 sm:p-6">
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Blog and News</h1>
        <p className="mt-2 text-sm text-slate-600">Editorial stories, launch coverage, and buying guides.</p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {rows.items.map((post) => (
          <BlogCard key={post.slug} post={post} />
        ))}
      </section>

      <Pagination page={rows.page} totalPages={rows.totalPages} basePath="/blog" searchParams={{}} />
    </main>
  );
}
