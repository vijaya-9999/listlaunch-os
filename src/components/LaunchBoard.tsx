"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OWNER_TYPES } from "@/lib/sop-template";

type Task = {
  id: string;
  title: string;
  ownerType: string;
  status: string;
  dueAt: string | null;
  key: string | null;
  order: number;
  blocksPhoto?: boolean;
  blocksLive?: boolean;
};

type Phase = {
  id: string;
  name: string;
  key: string;
  order: number;
  isPhotoPhase?: boolean;
  isLivePhase?: boolean;
  tasks: Task[];
};

type Prereq = { key: string; title: string; status: string; met: boolean };

type Props = {
  launchId: string;
  address: string;
  sellerName: string;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  goLiveAt: string;
  propertyType: string;
  phases: Phase[];
  progress: { pct: number; done: number; total: number };
  photoLocked: boolean;
  photoPrereqs: Prereq[];
  liveLocked?: boolean;
  livePrereqs?: Prereq[];
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  done: "Done",
  na: "N/A",
};

export function LaunchBoard(props: Props) {
  const router = useRouter();
  const [phases, setPhases] = useState(props.phases);
  const [photoLocked, setPhotoLocked] = useState(props.photoLocked);
  const [prereqs, setPrereqs] = useState(props.photoPrereqs);
  const [liveLocked, setLiveLocked] = useState(!!props.liveLocked);
  const [livePrereqs, setLivePrereqs] = useState(props.livePrereqs || []);
  const [progress, setProgress] = useState(props.progress);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");
  const [addingPhaseId, setAddingPhaseId] = useState<string | null>(null);
  const [oneOffTitle, setOneOffTitle] = useState("");
  const [oneOffOwner, setOneOffOwner] = useState("Agent");

  function phaseIsPhoto(phase: Phase) {
    return phase.isPhotoPhase || phase.key === "photo";
  }
  function phaseIsLive(phase: Phase) {
    return phase.isLivePhase || phase.key === "golive";
  }
  function phaseLocked(phase: Phase) {
    return (phaseIsPhoto(phase) && photoLocked) || (phaseIsLive(phase) && liveLocked);
  }

  async function setStatus(taskId: string, status: string, phase: Phase) {
    if (
      phaseLocked(phase) &&
      (status === "done" || status === "na")
    ) {
      setBanner(
        phaseIsPhoto(phase)
          ? "Photo Day is locked until all Photo Day gate tasks are done."
          : "Go-live is locked until all Live gate tasks are done."
      );
      return;
    }
    setBusyId(taskId);
    setBanner("");
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setBanner(data.error || "Could not update task");
      return;
    }

    setPhases((prev) =>
      prev.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
      }))
    );

    const refresh = await fetch(`/api/launches/${props.launchId}`);
    if (refresh.ok) {
      const body = await refresh.json();
      setPhases(body.launch.phases);
      setPhotoLocked(body.launch.photoLocked);
      setPrereqs(body.launch.photoPrereqs);
      setLiveLocked(!!body.launch.liveLocked);
      setLivePrereqs(body.launch.livePrereqs || []);
      setProgress(body.launch.progress);
    }
    router.refresh();
  }

  async function addOneOff(phaseId: string) {
    if (!oneOffTitle.trim()) return;
    setBusyId(phaseId);
    setBanner("");
    const res = await fetch(`/api/phases/${phaseId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: oneOffTitle, ownerType: oneOffOwner }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setBanner(data.error || "Could not add task");
      return;
    }
    setOneOffTitle("");
    setAddingPhaseId(null);
    const refresh = await fetch(`/api/launches/${props.launchId}`);
    if (refresh.ok) {
      const body = await refresh.json();
      setPhases(body.launch.phases);
      setProgress(body.launch.progress);
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{props.address}</h1>
            <p className="mt-1 text-sm text-muted">
              {props.sellerName}
              {props.sellerPhone ? ` · ${props.sellerPhone}` : ""}
              {props.sellerEmail ? ` · ${props.sellerEmail}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">
              Go-live {format(new Date(props.goLiveAt), "EEEE, MMM d, yyyy")} ·{" "}
              {props.propertyType}
            </p>
            <Link
              href="/settings"
              className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
            >
              Edit my SOP template
            </Link>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-brand">{progress.pct}%</div>
            <div className="text-xs text-muted">
              {progress.done}/{progress.total} actionable tasks
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </div>

      {photoLocked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Photo Day locked.</strong> Complete these first:
          <ul className="mt-2 list-inside list-disc">
            {prereqs.map((p) => (
              <li key={p.key} className={p.met ? "text-teal-700 line-through" : ""}>
                {p.title}{" "}
                <span className="text-xs uppercase tracking-wide opacity-70">
                  ({p.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {liveLocked && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <strong>Go-live locked.</strong> Complete these first:
          <ul className="mt-2 list-inside list-disc">
            {livePrereqs.map((p) => (
              <li key={p.key} className={p.met ? "text-teal-700 line-through" : ""}>
                {p.title}{" "}
                <span className="text-xs uppercase tracking-wide opacity-70">
                  ({p.status})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {banner && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
          {banner}
        </div>
      )}

      <div className="space-y-4">
        {phases.map((phase) => {
          const locked = phaseLocked(phase);
          const phaseDone = phase.tasks.filter(
            (t) => t.status === "done" || t.status === "na"
          ).length;

          return (
            <section
              key={phase.id}
              className={`rounded-xl border bg-card shadow-sm ${
                locked ? "border-slate-300 opacity-90" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  {locked && (
                    <span
                      title="Locked until prerequisites met"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-600"
                    >
                      🔒
                    </span>
                  )}
                  <h2 className="font-semibold text-slate-900">{phase.name}</h2>
                </div>
                <span className="text-xs text-muted">
                  {phaseDone}/{phase.tasks.length}
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {phase.tasks.map((task) => {
                  const due = task.dueAt ? new Date(task.dueAt) : null;
                  return (
                    <li
                      key={task.id}
                      className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                        locked ? "bg-slate-50" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-medium ${
                            task.status === "done"
                              ? "text-slate-400 line-through"
                              : task.status === "na"
                                ? "text-slate-400"
                                : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5">
                            {task.ownerType}
                          </span>
                          {task.blocksPhoto && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                              Gates Photo
                            </span>
                          )}
                          {task.blocksLive && (
                            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-teal-800">
                              Gates Live
                            </span>
                          )}
                          {due && <span>Due {format(due, "MMM d")}</span>}
                          {locked && <span className="text-warn">Locked</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {(["todo", "done", "na"] as const).map((s) => {
                          const active = task.status === s;
                          const disableComplete =
                            locked && (s === "done" || s === "na");
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={busyId === task.id || disableComplete}
                              onClick={() => setStatus(task.id, s, phase)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                                active
                                  ? s === "done"
                                    ? "bg-teal-600 text-white"
                                    : s === "na"
                                      ? "bg-slate-500 text-white"
                                      : "bg-slate-800 text-white"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              {STATUS_LABEL[s]}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2">
                {addingPhaseId === phase.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={oneOffTitle}
                      onChange={(e) => setOneOffTitle(e.target.value)}
                      placeholder="One-off task for this launch only"
                      className="min-w-[12rem] flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm"
                    />
                    <select
                      value={oneOffOwner}
                      onChange={(e) => setOneOffOwner(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                    >
                      {OWNER_TYPES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyId === phase.id}
                      onClick={() => addOneOff(phase.id)}
                      className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingPhaseId(null);
                        setOneOffTitle("");
                      }}
                      className="text-xs text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingPhaseId(phase.id)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    + Add one-off task (this launch only)
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
