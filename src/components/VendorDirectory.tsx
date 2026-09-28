"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VENDOR_ROLES, VENDOR_ROLE_LABELS, type VendorRole } from "@/lib/vendors";
import { VendorImport } from "./VendorImport";

export type VendorRow = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

const emptyForm = {
  name: "",
  role: "cleaner" as VendorRole,
  phone: "",
  email: "",
  notes: "",
};

export function VendorDirectory({ initialVendors }: { initialVendors: VendorRow[] }) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function startEdit(v: VendorRow) {
    setEditingId(v.id);
    setForm({
      name: v.name,
      role: (VENDOR_ROLES.includes(v.role as VendorRole) ? v.role : "other") as VendorRole,
      phone: v.phone || "",
      email: v.email || "",
      notes: v.notes || "",
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      name: form.name,
      role: form.role,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes || null,
    };
    const res = await fetch(
      editingId ? `/api/vendors/${editingId}` : "/api/vendors",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not save vendor");
      return;
    }
    if (editingId) {
      setVendors((prev) => prev.map((v) => (v.id === editingId ? data.vendor : v)));
    } else {
      setVendors((prev) =>
        [...prev, data.vendor].sort((a, b) =>
          a.role === b.role ? a.name.localeCompare(b.name) : a.role.localeCompare(b.role)
        )
      );
    }
    cancelEdit();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this vendor? Jobs linked to them will also be removed.")) return;
    setBusy(true);
    const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete");
      return;
    }
    setVendors((prev) => prev.filter((v) => v.id !== id));
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <VendorImport
        onImported={(list) => {
          setVendors(list);
          router.refresh();
        }}
      />
      <form
        onSubmit={save}
        className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm"
      >
        <h2 className="mb-3 font-semibold text-slate-900">
          {editingId ? "Edit vendor" : "Add vendor"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-1">
            <span className="mb-1 block font-medium">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              placeholder="Bright Clean Co."
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Role</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as VendorRole })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
            >
              {VENDOR_ROLES.map((r) => (
                <option key={r} value={r}>
                  {VENDOR_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Phone</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              placeholder="(512) 555-0100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              placeholder="hello@vendor.com"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
              placeholder="Preferred days, rates, gate code prefs…"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {editingId ? "Save changes" : "Add vendor"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg px-4 py-2 text-sm text-muted hover:text-slate-900"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {vendors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-muted">
          No vendors yet. Add your cleaner, photographer, and stager to schedule jobs on launches.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-card shadow-sm">
          {vendors.map((v) => (
            <li key={v.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-medium text-slate-900">{v.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 capitalize">
                    {VENDOR_ROLE_LABELS[v.role as VendorRole] || v.role}
                  </span>
                  {v.phone && <span>{v.phone}</span>}
                  {v.email && <span>{v.email}</span>}
                </div>
                {v.notes && <p className="mt-1 text-sm text-muted">{v.notes}</p>}
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => startEdit(v)}
                  className="text-brand hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(v.id)}
                  className="text-danger hover:underline disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
