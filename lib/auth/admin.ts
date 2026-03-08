import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session";

function readEnv(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

export function getAdminUsername(): string {
  return readEnv("ADMIN_USERNAME", "admin");
}

export function getAdminPassword(): string {
  return readEnv("ADMIN_PASSWORD", "admin123");
}

export function getAdminSessionToken(): string {
  return readEnv("ADMIN_SESSION_TOKEN", "dev-admin-session-token");
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === getAdminUsername() && password === getAdminPassword();
}

export function isAdminAuthenticatedRequest(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  return token === getAdminSessionToken();
}

