import type { Product } from "@/lib/types/content";

export type MockPhone = {
  name: string;
  brand: string;
  slug: string;
  image: string;
  note?: string;
};

export const mockPhones: MockPhone[] = [
  { name: "Xiaomi 14 Civi", brand: "Xiaomi", slug: "xiaomi-14-civi-blue", image: "/mock-phones/xiaomi-14-civi-blue.jpg", note: "Flagship | 2024" },
  { name: "Redmi Note 50 Pro Max", brand: "Xiaomi", slug: "xiaomi-14-civi-close", image: "/mock-phones/xiaomi-14-civi-close.jpg", note: "Flagship | 2024" },
  { name: "Nothing Phone 2a Plus", brand: "Nothing", slug: "xiaomi-14", image: "/mock-phones/xiaomi-14.jpg", note: "Flagship | 2024" },
  { name: "OnePlus Nord CE 5 Lite", brand: "OnePlus", slug: "realme-blue", image: "/mock-phones/realme-blue.png", note: "Midrange | 2024" },
  { name: "Samsung Galaxy F55", brand: "Samsung", slug: "realme-gold", image: "/mock-phones/realme-gold.png", note: "Midrange | 2024" },
  { name: "iQOO Neo 7", brand: "iQOO", slug: "iqoo-neo-7", image: "/mock-phones/iqoo-neo-7.png", note: "Gaming | 2024" },
  { name: "Samsung Galaxy Z Fold 6", brand: "Samsung", slug: "xiaomi-14-civi-black", image: "/mock-phones/xiaomi-14-civi-black.jpg", note: "Flagship | 2024" },
];

export function getMockProductBySlug(slug: string): (Product & { id?: string }) | null {
  const match = mockPhones.find((item) => item.slug === slug);
  if (!match) return null;
  return {
    id: `mock-${match.slug}`,
    deviceType: "smartphone",
    name: match.name,
    slug: match.slug,
    brand: match.brand,
    price: 0,
    status: "published",
    shortDescription: "Mock preview product",
    images: [match.image],
    specs: {
      processor: "Spec coming soon",
      ram: "Spec coming soon",
      storage: "Spec coming soon",
      battery: "Spec coming soon",
      display: "Spec coming soon",
      os: "Spec coming soon",
    },
    ratings: {
      overall: 0,
      performance: 0,
      camera: 0,
      battery: 0,
      display: 0,
    },
    affiliateLinks: {},
  };
}
