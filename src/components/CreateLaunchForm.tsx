"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateLaunchForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      address: fd.get("address"),
      sellerName: fd.get("sellerName"),
      sellerPhone: fd.get("sellerPhone") || undefined,
      sellerEmail: fd.get("sellerEmail") || undefined,
      goLiveAt: fd.get("goLiveAt"),
      propertyType: fd.get("propertyType") || "residential",
    };
    const res = await fetch("/api/launches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create launch");
      return;
    }
    router.push(`/launches/${data.launch.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Create Launch</h1>
      <p className="text-sm text-muted">
        Sets go-live and clones the default SOP (Phases 0–6) into a board.
      </p>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Property address</span>
        <input
          name="address"
          required
          placeholder="123 Main St, City, ST 00000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium">Seller name</span>
        <input
          name="sellerName"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Seller phone</span>
          <input
            name="sellerPhone"
            type="tel"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Seller email</span>
          <input
            name="sellerEmail"
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Go-live date</span>
          <input
            name="goLiveAt"
            type="date"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Property type</span>
          <select
            name="propertyType"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            defaultValue="residential"
          >
            <option value="residential">Residential</option>
            <option value="vacant">Vacant</option>
            <option value="luxury">Luxury</option>
            <option value="new_construction">New construction</option>
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create launch & clone SOP"}
      </button>
    </form>
  );
}
