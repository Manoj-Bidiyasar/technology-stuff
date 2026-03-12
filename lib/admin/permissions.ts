export const permissionsByRole = {
  super_admin: ["all"],
  admin: ["products", "blogs", "processors", "messages", "helper"],
  editor: ["blogs"],
} as const;

export type AdminRole = keyof typeof permissionsByRole;
export type AdminCapability = "dashboard" | "products" | "blogs" | "processors" | "messages" | "users" | "helper";

export function hasCapability(role: AdminRole | string | undefined, capability: AdminCapability): boolean {
  if (!role || !(role in permissionsByRole)) return false;
  const allowed = permissionsByRole[role as AdminRole] as readonly string[];
  return allowed.includes("all") || allowed.includes(capability);
}
