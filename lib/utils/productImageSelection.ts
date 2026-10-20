export const PRODUCT_IMAGE_COLOR_SELECTION_EVENT = "product-image-color-selection";

export function announceProductImageColorSelection(color: string | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<string | null>(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, { detail: color }));
  }
}
