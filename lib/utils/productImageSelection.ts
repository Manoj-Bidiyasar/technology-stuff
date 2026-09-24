export const PRODUCT_IMAGE_COLOR_SELECTION_EVENT = "product-image-color-selection";

export function announceProductImageColorSelection(index: number | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<number | null>(PRODUCT_IMAGE_COLOR_SELECTION_EVENT, { detail: index }));
  }
}
