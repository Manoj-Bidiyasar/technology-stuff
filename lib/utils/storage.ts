import type { MemoryStorage, MemoryVariant, Product } from "@/lib/types/content";

export function toMemoryStorageObject(memoryStorage?: MemoryStorage): MemoryStorage {
  return {
    ram: Array.isArray(memoryStorage?.ram) ? memoryStorage?.ram : [],
    ramType: Array.isArray(memoryStorage?.ramType) ? memoryStorage?.ramType : [],
    internalStorage: Array.isArray(memoryStorage?.internalStorage) ? memoryStorage?.internalStorage : [],
    storageType: Array.isArray(memoryStorage?.storageType) ? memoryStorage?.storageType : [],
    virtualRam: Array.isArray(memoryStorage?.virtualRam) ? memoryStorage?.virtualRam : [],
    features: Array.isArray(memoryStorage?.features) ? memoryStorage?.features : [],
    expandableStorage: {
      supported: Boolean(memoryStorage?.expandableStorage?.supported),
      max: memoryStorage?.expandableStorage?.max ?? null,
      types: Array.isArray(memoryStorage?.expandableStorage?.types) ? memoryStorage?.expandableStorage?.types : [],
    },
  };
}

export function toMemoryVariants(variants?: MemoryVariant[]): MemoryVariant[] {
  if (!Array.isArray(variants)) return [];
  return variants
    .map((variant) => ({
      ram: variant?.ram || "",
      ramType: variant?.ramType || "",
      storage: variant?.storage || "",
      storageType: variant?.storageType || "",
      virtualRam: variant?.virtualRam || "",
    }))
    .filter((variant) =>
      Boolean(
        String(variant.ram || "").trim() ||
          String(variant.ramType || "").trim() ||
          String(variant.storage || "").trim() ||
          String(variant.storageType || "").trim() ||
          String(variant.virtualRam || "").trim()
      )
    );
}

export function fallbackMemoryFromProduct(
  product: Pick<Product, "memoryStorage" | "variants" | "specs">
): { memoryStorage: MemoryStorage; variants: MemoryVariant[] } {
  const memoryStorage = toMemoryStorageObject(product.memoryStorage);
  const variants = toMemoryVariants(product.variants);
  const hasMemoryStorageData =
    (memoryStorage.ram || []).length > 0 ||
    (memoryStorage.ramType || []).length > 0 ||
    (memoryStorage.internalStorage || []).length > 0 ||
    (memoryStorage.storageType || []).length > 0 ||
    (memoryStorage.virtualRam || []).length > 0 ||
    (memoryStorage.features || []).length > 0 ||
    Boolean(memoryStorage.expandableStorage?.supported) ||
    Boolean(String(memoryStorage.expandableStorage?.max || "").trim()) ||
    (memoryStorage.expandableStorage?.types || []).length > 0;

  if (variants.length > 0 || hasMemoryStorageData) {
    return { memoryStorage, variants };
  }

  const fallbackVariant: MemoryVariant = {
    ram: product.specs?.ram || "",
    storage: product.specs?.storage || "",
    ramType: "",
    storageType: "",
    virtualRam: "",
  };

  return {
    memoryStorage: {
      ram: fallbackVariant.ram ? [fallbackVariant.ram] : [],
      ramType: [],
      internalStorage: fallbackVariant.storage ? [fallbackVariant.storage] : [],
      storageType: [],
      virtualRam: [],
      features: [],
      expandableStorage: {
        supported: false,
        max: null,
        types: [],
      },
    },
    variants: fallbackVariant.ram || fallbackVariant.storage ? [fallbackVariant] : [],
  };
}
