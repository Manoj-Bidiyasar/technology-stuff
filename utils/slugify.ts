export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
