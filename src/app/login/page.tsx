"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: fd.get("email"),
      password: fd.get("password"),
      name: fd.get("name") || undefined,
    };
    const res = await fetch(
      mode === "login" ? "/api/auth/login" : "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Auth failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            LL
          </div>
          <h1 className="text-2xl font-semibold">ListLaunch OS</h1>
          <p className="mt-1 text-sm text-muted">
            Week 2 dogfood — email/password (local SQLite, no cloud required)
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Name</span>
              <input
                name="name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                placeholder="Your name"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue="vijaya@listlaunch.local"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Password</span>
            <input
              name="password"
              type="password"
              required
              defaultValue="demo1234"
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading
              ? "…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                className="text-brand hover:underline"
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button
                type="button"
                className="text-brand hover:underline"
                onClick={() => setMode("login")}
              >
                Log in
              </button>
            </>
          )}
        </p>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-muted">
          <strong className="text-slate-700">Demo:</strong> vijaya@listlaunch.local / demo1234
        </div>
      </div>
    </div>
  );
}
