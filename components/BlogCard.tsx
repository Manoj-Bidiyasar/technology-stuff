import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/types/content";

export default function BlogCard({ post }: { post: BlogPost }) {
  const image = post.featuredImage || "https://placehold.co/900x520?text=Blog+Post";

  return (
    <Link href={`/blog/${post.slug}`} className="panel block overflow-hidden p-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
      <div className="relative h-44 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
        <Image src={image} alt={post.title} fill className="object-cover" unoptimized />
      </div>
      <h3 className="mt-3 line-clamp-2 text-lg font-bold text-slate-900">{post.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.excerpt || "Read full article"}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {(post.tags || []).slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            #{tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
