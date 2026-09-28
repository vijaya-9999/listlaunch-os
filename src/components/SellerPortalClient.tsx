"use client";

import { format } from "date-fns";
import { useState } from "react";

type SellerTask = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  notes: string | null;
  photoUrl: string | null;
  phaseName: string;
};

type Props = {
  token: string;
  launch: { address: string; sellerName: string; goLiveAt: string };
  initialTasks: SellerTask[];
};

export function SellerPortalClient({ token, launch, initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function markDone(taskId: string, file?: File | null) {
    setBusyId(taskId);
    setError("");
    let res: Response;
    if (file && file.size > 0) {
      const fd = new FormData();
      fd.set("status", "done");
      fd.set("photo", file);
      res = await fetch(`/api/seller/${token}/tasks/${taskId}`, {
        method: "PATCH",
        body: fd,
      });
    } else {
      res = await fetch(`/api/seller/${token}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
    }
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not update task");
      return;
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: data.task.status,
              photoUrl: data.task.photoUrl ?? t.photoUrl,
            }
          : t
      )
    );
  }

  async function undo(taskId: string) {
    setBusyId(taskId);
    setError("");
    const res = await fetch(`/api/seller/${token}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "todo" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Could not update task");
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: "todo" } : t))
    );
  }

  const open = tasks.filter((t) => t.status === "todo").length;
  const done = tasks.filter((t) => t.status === "done" || t.status === "na").length;

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background px-4 py-8">
      <div className="mb-6">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          LL
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Your listing checklist</h1>
        <p className="mt-1 text-sm text-muted">
          Hi {launch.sellerName} — {launch.address}
        </p>
        <p className="text-sm text-muted">
          Target go-live {format(new Date(launch.goLiveAt), "EEEE, MMM d")}
        </p>
        <p className="mt-2 text-xs text-muted">
          {done} done · {open} still open
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-muted">
          No seller tasks on this launch yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((task) => {
            const isDone = task.status === "done" || task.status === "na";
            return (
              <li
                key={task.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  isDone ? "border-teal-200" : "border-slate-200"
                }`}
              >
                <div className="text-xs font-medium uppercase tracking-wide text-muted">
                  {task.phaseName}
                </div>
                <div
                  className={`mt-1 text-base font-medium ${
                    isDone ? "text-slate-400 line-through" : "text-slate-900"
                  }`}
                >
                  {task.title}
                </div>
                {task.dueAt && (
                  <div className="mt-0.5 text-xs text-muted">
                    Due {format(new Date(task.dueAt), "MMM d")}
                  </div>
                )}
                {task.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={task.photoUrl}
                    alt="Completion photo"
                    className="mt-3 max-h-48 w-full rounded-lg object-cover"
                  />
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!isDone ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === task.id}
                        onClick={() => markDone(task.id)}
                        className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                      >
                        Mark done
                      </button>
                      <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Done + photo
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          disabled={busyId === task.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) markDone(task.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === task.id}
                      onClick={() => undo(task.id)}
                      className="text-sm text-muted hover:text-slate-900"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
