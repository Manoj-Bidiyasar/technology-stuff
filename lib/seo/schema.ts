import type { BlogPost, Product } from "@/lib/types/content";
import { toDate } from "@/lib/utils/format";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function sitePath(path: string): string {
  return `${siteUrl}${path}`;
}

export function productSchema(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    image: product.images,
    description: product.shortDescription || `${product.name} review, full specs, and comparison insights.`,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price || 0,
      availability: "https://schema.org/InStock",
      url: sitePath(`/mobile/${product.slug}`),
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.ratings?.overall || 0,
      bestRating: 10,
      worstRating: 1,
      ratingCount: 1,
    },
  };
}

export function articleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.featuredImage ? [post.featuredImage] : [],
    datePublished: toDate(post.createdAt)?.toISOString(),
    dateModified: toDate(post.updatedAt || post.createdAt)?.toISOString(),
    author: {
      "@type": "Organization",
      name: "Technology Stuff",
    },
    publisher: {
      "@type": "Organization",
      name: "Technology Stuff",
    },
    description: post.excerpt || "Technology Stuff editorial post",
    mainEntityOfPage: sitePath(`/blog/${post.slug}`),
  };
}
