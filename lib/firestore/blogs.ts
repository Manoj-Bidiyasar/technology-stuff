import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { BlogPost } from "@/lib/types/content";

const blogsRef = adminDb.collection("blogs");

function normalizeBlog(input: Partial<BlogPost>): BlogPost {
  return {
    title: input.title || "",
    slug: input.slug || "",
    excerpt: input.excerpt || "",
    content: input.content || "",
    featuredImage: input.featuredImage || "",
    tags: Array.isArray(input.tags) ? input.tags : [],
    categories: Array.isArray(input.categories) ? input.categories : [],
    status: input.status || "draft",
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export type BlogListResult = {
  items: BlogPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listPublishedBlogs(page = 1, pageSize = 10): Promise<BlogListResult> {
  const snapshot = await blogsRef.where("status", "==", "published").limit(300).get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as BlogPost) }));

  items.sort((a, b) => {
    const left = Number(a.createdAt && typeof a.createdAt === "object" && "seconds" in a.createdAt ? a.createdAt.seconds : 0);
    const right = Number(b.createdAt && typeof b.createdAt === "object" && "seconds" in b.createdAt ? b.createdAt.seconds : 0);
    return right - left;
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (Math.max(1, page) - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: Math.max(1, page),
    pageSize,
    totalPages,
  };
}

export async function listLatestBlogs(limit = 4): Promise<BlogPost[]> {
  const rows = await listPublishedBlogs(1, limit);
  return rows.items;
}

export async function getPublishedBlogBySlug(slug: string): Promise<BlogPost | null> {
  const snapshot = await blogsRef
    .where("status", "==", "published")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...(snapshot.docs[0].data() as BlogPost) };
}

export async function listRelatedBlogs(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const snapshot = await blogsRef.where("status", "==", "published").limit(300).get();
  const items = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as BlogPost) }))
    .filter((item) => item.slug !== post.slug);

  const tags = new Set(post.tags || []);
  items.sort((a, b) => {
    const aScore = (a.tags || []).filter((tag) => tags.has(tag)).length;
    const bScore = (b.tags || []).filter((tag) => tags.has(tag)).length;
    return bScore - aScore;
  });

  return items.slice(0, limit);
}

export async function listAllBlogsAdmin(): Promise<BlogPost[]> {
  const snapshot = await blogsRef.limit(300).get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as BlogPost) }));
  items.sort((a, b) => a.title.localeCompare(b.title));
  return items;
}

export async function getBlogById(id: string): Promise<BlogPost | null> {
  const doc = await blogsRef.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as BlogPost) };
}

export async function createBlog(data: BlogPost): Promise<string> {
  const payload = normalizeBlog(data);
  const ref = await blogsRef.add({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateBlog(id: string, data: Partial<BlogPost>): Promise<void> {
  const payload = normalizeBlog(data);
  await blogsRef.doc(id).update({
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteBlog(id: string): Promise<void> {
  await blogsRef.doc(id).delete();
}
