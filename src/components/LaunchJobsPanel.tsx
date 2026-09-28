"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VENDOR_ROLE_LABELS, type VendorRole } from "@/lib/vendors";

export type JobVendor = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
};

export type JobTask = { id: string; title: string; key: string | null } | null;

export type JobRow = {
  id: string;
  scheduledAt: string;
  accessNotes: string | null;
  confirmStatus: string;
  confirmToken: string;
  vendor: JobVendor;
  task: JobTask;
};

type VendorOption = { id: string; name: string; role: string };
type TaskOption = { id: string; title: string; phaseName: string };

type Props = {
  launchId: string;
  initialJobs: JobRow[];
  vendors: VendorOption[];
  tasks: TaskOption[];
  sellerPortalToken: string | null;
};

function origin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function statusBadge(status: string) {
  if (status === "confirmed")
    return "bg-teal-100 text-teal-800";
  if (status === "declined")
    return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

export function LaunchJobsPanel({
  launchId,
  initialJobs,
  vendors,
  tasks,
  sellerPortalToken: initialPortalToken,
}: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [portalToken, setPortalToken] = useState(initialPortalToken);
  const [showForm, setShowForm] = useState(false);
  const [vendorId, setVendorId] = useState(vendors[0]?.id || "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [accessNotes, setAccessNotes] = useState("");
  const [taskId, setTaskId] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setBanner("Could not copy — select the URL manually");
    }
  }

  async function scheduleJob(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId || !scheduledAt) {
      setBanner("Pick a vendor and date/time");
      return;
    }
    setBusy(true);
    setBanner("");
    const res = await fetch(`/api/launches/${launchId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId,
        scheduledAt: new Date(scheduledAt).toISOString(),
        accessNotes: accessNotes || null,
        taskId: taskId || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setBanner(data.error || "Could not schedule job");
      return;
    }
    setJobs((prev) =>
      [...prev, data.job].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )
    );
    setShowForm(false);
    setAccessNotes("");
    setTaskId("");
    setScheduledAt("");
    router.refresh();
  }

  async function deleteJob(id: string) {
    if (!confirm("Remove this scheduled job?")) return;
    setBusy(true);
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBanner(data.error || "Could not delete job");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    router.refresh();
  }

  async function regenerateConfirm(id: string) {
    setBusy(true);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateToken: true }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setBanner(data.error || "Could not regenerate link");
      return;
    }
    setJobs((prev) => prev.map((j) => (j.id === id ? data.job : j)));
    router.refresh();
  }

  async function ensureSellerPortal(regenerate = false) {
    setBusy(true);
    setBanner("");
    const res = await fetch(`/api/launches/${launchId}/seller-portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setBanner(data.error || "Could not create seller portal link");
      return;
    }
    setPortalToken(data.portal.token);
    router.refresh();
  }

  const sellerUrl = portalToken ? `${origin()}/seller/${portalToken}` : null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Scheduled vendor jobs</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/launches/${launchId}/photo-packet`}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Photo-day packet
            </Link>
            {vendors.length === 0 ? (
              <Link
                href="/vendors"
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
              >
                Add vendors first
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm((s) => !s)}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
              >
                {showForm ? "Cancel" : "+ Schedule job"}
              </button>
            )}
          </div>
        </div>

        {banner && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
            {banner}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={scheduleJob}
            className="mb-4 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Vendor</span>
                <select
                  required
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (
                      {VENDOR_ROLE_LABELS[v.role as VendorRole] || v.role})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Date & time</span>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">
                  Link to board task (optional)
                </span>
                <select
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">— None —</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.phaseName}: {t.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium">Access notes</span>
                <textarea
                  value={accessNotes}
                  onChange={(e) => setAccessNotes(e.target.value)}
                  rows={2}
                  placeholder="Gate code, lockbox, pets, parking…"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Schedule
            </button>
            <p className="text-xs text-muted">
              SMS via Twilio is deferred (Week 3). You get a copyable confirm URL for dogfood.
            </p>
          </form>
        )}

        {jobs.length === 0 ? (
          <p className="text-sm text-muted">No jobs scheduled yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {jobs.map((job) => {
              const confirmUrl = `${origin()}/confirm/${job.confirmToken}`;
              return (
                <li key={job.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">
                        {job.vendor.name}{" "}
                        <span className="text-xs font-normal capitalize text-muted">
                          ({VENDOR_ROLE_LABELS[job.vendor.role as VendorRole] ||
                            job.vendor.role})
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm text-muted">
                        {format(new Date(job.scheduledAt), "EEE, MMM d · h:mm a")}
                        {job.task && (
                          <span> · Task: {job.task.title}</span>
                        )}
                      </div>
                      {job.accessNotes && (
                        <p className="mt-1 text-sm text-slate-600">{job.accessNotes}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium capitalize ${statusBadge(job.confirmStatus)}`}
                        >
                          {job.confirmStatus}
                        </span>
                        <code className="max-w-full truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">
                          {confirmUrl}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyText(`job-${job.id}`, confirmUrl)}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          {copied === `job-${job.id}` ? "Copied!" : "Copy confirm URL"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => regenerateConfirm(job.id)}
                          className="text-xs text-muted hover:text-slate-900"
                        >
                          Regenerate
                        </button>
                        <a
                          href={confirmUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted hover:text-slate-900"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => deleteJob(job.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Seller portal</h2>
        <p className="mb-3 text-sm text-muted">
          Magic link for the seller to see only their checklist and mark tasks done (optional photo).
          No email send yet — copy the URL.
        </p>
        {sellerUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {sellerUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText("seller", sellerUrl)}
              className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white"
            >
              {copied === "seller" ? "Copied!" : "Copy link"}
            </button>
            <a
              href={sellerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-brand hover:underline"
            >
              Open
            </a>
            <button
              type="button"
              disabled={busy}
              onClick={() => ensureSellerPortal(true)}
              className="text-xs text-muted hover:text-slate-900"
            >
              Regenerate
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => ensureSellerPortal(false)}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Create seller portal link
          </button>
        )}
      </section>
    </div>
  );
}
