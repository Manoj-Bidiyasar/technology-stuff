import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import BlogCard from "@/components/BlogCard";
import { getPublishedBlogBySlug, listRelatedBlogs } from "@/lib/firestore/blogs";
import { articleSchema } from "@/lib/seo/schema";

type BlogDetailProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BlogDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);

  if (!post) return { title: "Blog not found" };

  return {
    title: post.title,
    description: post.excerpt || "Read the full blog post",
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const { slug } = await params;
  const post = await getPublishedBlogBySlug(slug);

  if (!post) {
    return (
      <main className="mobile-container py-8">
        <section className="panel p-5 text-sm text-slate-600">Blog post not found.</section>
      </main>
    );
  }

  const related = await listRelatedBlogs(post, 3);

  return (
    <main className="mobile-container py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema(post)) }} />

      <article className="panel p-4 sm:p-6">
        <Link href="/blog" className="text-sm font-semibold text-blue-700">Back to blog</Link>

        <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">{post.title}</h1>
        {post.excerpt ? <p className="mt-2 text-sm text-slate-600">{post.excerpt}</p> : null}

        <div className="relative mt-4 h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-80">
          <Image src={post.featuredImage || "https://placehold.co/1200x700?text=Blog"} alt={post.title} fill className="object-cover" unoptimized />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(post.tags || []).map((tag) => (
            <span key={tag} className="chip">#{tag}</span>
          ))}
        </div>

        <div className="prose mt-6 max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-li:text-slate-700">
          <div dangerouslySetInnerHTML={{ __html: post.content || "<p>Content coming soon.</p>" }} />
        </div>
      </article>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-extrabold text-slate-900">Related posts</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <BlogCard key={item.slug} post={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
