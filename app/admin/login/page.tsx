"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { getOrCreateAdminDeviceId } from "@/lib/admin/sessionClient";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugStep, setDebugStep] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setDebugStep("Starting login...");
    try {
      setDebugStep("Checking email/password...");
      const credential = await signInWithEmailAndPassword(auth, username.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      const deviceId = getOrCreateAdminDeviceId();
      setDebugStep("Creating admin session...");
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          deviceId,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent || "unknown" : "unknown",
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        const code = String(json?.error || "");
        if (code === "session/device-not-allowed") {
          throw new Error(`This device is not allowed. Device ID: ${deviceId}`);
        }
        if (code === "user-profile-missing") throw new Error("Admin profile missing. Create admin_users/{uid} first.");
        if (code === "user-not-active") throw new Error("Your admin account is not active.");
        if (code === "user-role-not-allowed") throw new Error("Your role is not allowed for admin panel.");
        throw new Error(code || "Login failed.");
      }
      setDebugStep("Redirecting...");
      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch (err) {
      const code = String((err as { code?: string } | undefined)?.code || "");
      if (
        code.includes("auth/invalid-credential") ||
        code.includes("auth/wrong-password") ||
        code.includes("auth/user-not-found")
      ) {
        setError("Invalid email or password.");
      } else if (code.includes("auth/invalid-email")) {
        setError("Enter a valid email.");
      } else {
        setError(err instanceof Error ? err.message : "Login failed.");
      }
      setDebugStep("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <section className="panel w-full p-5 sm:p-6">
        <p className="chip">Admin Access</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to manage products, blogs, and processors.</p>

        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Email</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
          {debugStep ? <p className="text-xs text-slate-500">{debugStep}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
