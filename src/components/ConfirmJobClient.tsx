"use client";

import { format } from "date-fns";
import { useState } from "react";
import { VENDOR_ROLE_LABELS, type VendorRole } from "@/lib/vendors";

type Props = {
  token: string;
  job: {
    scheduledAt: string;
    accessNotes: string | null;
    confirmStatus: string;
    vendor: { name: string; role: string };
    launch: { address: string };
    task: { title: string } | null;
  };
};

export function ConfirmJobClient({ token, job: initial }: Props) {
  const [status, setStatus] = useState(initial.confirmStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function respond(action: "confirm" | "decline") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/confirm/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setStatus(data.job.confirmStatus);
  }

  const done = status === "confirmed" || status === "declined";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          LL
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Job confirmation</h1>
        <p className="mt-1 text-sm text-muted">ListLaunch OS — vendor confirm link</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">Property</p>
        <p className="text-lg font-semibold text-slate-900">{initial.launch.address}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Vendor</dt>
            <dd className="text-right font-medium">
              {initial.vendor.name}
              <span className="block text-xs font-normal capitalize text-muted">
                {VENDOR_ROLE_LABELS[initial.vendor.role as VendorRole] ||
                  initial.vendor.role}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">When</dt>
            <dd className="text-right font-medium">
              {format(new Date(initial.scheduledAt), "EEEE, MMM d · h:mm a")}
            </dd>
          </div>
          {initial.task && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Linked task</dt>
              <dd className="text-right font-medium">{initial.task.title}</dd>
            </div>
          )}
        </dl>

        {initial.accessNotes && (
          <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <strong className="block text-xs uppercase tracking-wide text-amber-800">
              Access notes
            </strong>
            {initial.accessNotes}
          </div>
        )}

        {done ? (
          <div
            className={`mt-6 rounded-lg px-4 py-3 text-center text-sm font-medium ${
              status === "confirmed"
                ? "bg-teal-50 text-teal-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            You {status === "confirmed" ? "confirmed" : "declined"} this job. Thank you!
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => respond("confirm")}
              className="rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => respond("decline")}
              className="rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        )}
        {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
