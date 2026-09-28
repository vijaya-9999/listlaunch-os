"use client";

import { useRef, useState } from "react";
import {
  downloadVendorCsvTemplate,
  parseVendorFile,
  type VendorImportRow,
} from "@/lib/vendor-import";
import { VENDOR_ROLE_LABELS, type VendorRole } from "@/lib/vendors";
import type { VendorRow } from "./VendorDirectory";

type ImportSummary = {
  added: number;
  skipped: number;
  skippedDetails: { name: string; reason: string }[];
};

export function VendorImport({
  onImported,
}: {
  onImported: (vendors: VendorRow[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<VendorImportRow[] | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [skippedEmpty, setSkippedEmpty] = useState(0);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  function reset() {
    setPreview(null);
    setParseWarnings([]);
    setSkippedEmpty(0);
    setFileName("");
    setError("");
    setSummary(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSummary(null);
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseVendorFile(file, buffer);
      setFileName(file.name);
      setPreview(parsed.rows);
      setParseWarnings(parsed.warnings);
      setSkippedEmpty(parsed.skippedEmpty);
      if (!parsed.rows.length && !parsed.warnings.length) {
        setError("No vendor rows found in file.");
      }
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Could not parse file");
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    if (!preview?.length) return;
    setBusy(true);
    setError("");
    setSummary(null);
    const res = await fetch("/api/vendors/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendors: preview.map(({ name, role, phone, email, notes }) => ({
          name,
          role,
          phone,
          email,
          notes,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Import failed");
      return;
    }
    setSummary({
      added: data.added ?? 0,
      skipped: data.skipped ?? 0,
      skippedDetails: data.skippedDetails || [],
    });
    if (Array.isArray(data.vendors) && data.vendors.length) {
      // Fetch full vendor objects for the list (import returns slim rows)
      const listRes = await fetch("/api/vendors");
      const listData = await listRes.json().catch(() => ({}));
      if (listRes.ok && Array.isArray(listData.vendors)) {
        onImported(listData.vendors);
      } else {
        onImported(
          data.vendors.map(
            (v: { id: string; name: string; role: string }): VendorRow => ({
              id: v.id,
              name: v.name,
              role: v.role,
              phone: null,
              email: null,
              notes: null,
            })
          )
        );
      }
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Import vendors</h2>
          <p className="mt-0.5 text-sm text-muted">
            Upload a CSV or Excel file. Preview rows, then commit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadVendorCsvTemplate}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Download CSV template
          </button>
          <a
            href="/vendor-import-template.csv"
            download
            className="hidden"
            aria-hidden
          >
            template
          </a>
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Import vendors
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-slate-900"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              Choose file (.csv, .xlsx, .xls)
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={onFileChange}
              disabled={busy}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-200"
            />
          </label>

          <p className="text-xs text-muted">
            Columns: <code className="rounded bg-slate-100 px-1">name</code>{" "}
            (required),{" "}
            <code className="rounded bg-slate-100 px-1">role</code>,{" "}
            <code className="rounded bg-slate-100 px-1">phone</code>,{" "}
            <code className="rounded bg-slate-100 px-1">email</code>,{" "}
            <code className="rounded bg-slate-100 px-1">notes</code>. Role
            aliases map case-insensitively; unknown → Other. Duplicates (same
            name + phone) are skipped.
          </p>

          {error && <p className="text-sm text-danger">{error}</p>}

          {parseWarnings.length > 0 && (
            <ul className="list-inside list-disc text-sm text-warn">
              {parseWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          {preview && (
            <div>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Preview{fileName ? ` — ${fileName}` : ""}
                </h3>
                <p className="text-xs text-muted">
                  {preview.length} row{preview.length === 1 ? "" : "s"} ready
                  {skippedEmpty > 0
                    ? ` · ${skippedEmpty} empty-name row${skippedEmpty === 1 ? "" : "s"} skipped`
                    : ""}
                </p>
              </div>

              {preview.length === 0 ? (
                <p className="text-sm text-muted">No importable rows.</p>
              ) : (
                <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-muted">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Role</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.map((r) => (
                        <tr key={`${r.rowNumber}-${r.name}`}>
                          <td className="px-3 py-1.5 text-muted">{r.rowNumber}</td>
                          <td className="px-3 py-1.5 font-medium">{r.name}</td>
                          <td className="px-3 py-1.5">
                            {VENDOR_ROLE_LABELS[r.role as VendorRole] || r.role}
                          </td>
                          <td className="px-3 py-1.5 text-muted">{r.phone || "—"}</td>
                          <td className="px-3 py-1.5 text-muted">{r.email || "—"}</td>
                          <td className="max-w-[12rem] truncate px-3 py-1.5 text-muted">
                            {r.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy || !preview.length}
                  onClick={commitImport}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy ? "Importing…" : `Import ${preview.length} vendor${preview.length === 1 ? "" : "s"}`}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="rounded-lg px-4 py-2 text-sm text-muted hover:text-slate-900"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {summary && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-900">
                Import complete: {summary.added} added
                {summary.skipped > 0 ? `, ${summary.skipped} skipped` : ""}.
              </p>
              {summary.skippedDetails.length > 0 && (
                <ul className="mt-2 max-h-32 list-inside list-disc overflow-auto text-muted">
                  {summary.skippedDetails.map((s, i) => (
                    <li key={i}>
                      <span className="font-medium text-slate-700">{s.name}</span>
                      {" — "}
                      {s.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
