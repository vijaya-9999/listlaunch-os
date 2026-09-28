"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function Nav({ userName }: { userName?: string }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            LL
          </span>
          ListLaunch OS
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {userName && <span className="text-muted">{userName}</span>}
          <Link href="/vendors" className="text-muted hover:text-slate-900">
            Vendors
          </Link>
          <Link href="/settings" className="text-muted hover:text-slate-900">
            Edit my SOP
          </Link>
          <Link
            href="/launches/new"
            className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand-dark"
          >
            New Launch
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-muted hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
