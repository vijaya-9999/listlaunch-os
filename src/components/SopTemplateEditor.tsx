"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { OWNER_TYPES } from "@/lib/sop-template";

type TemplateTask = {
  id: string;
  title: string;
  ownerType: string;
  order: number;
  key: string | null;
  dueOffsetDays: number | null;
  blocksPhoto: boolean;
  blocksLive: boolean;
};

type TemplatePhase = {
  id: string;
  name: string;
  order: number;
  key: string;
  isPhotoPhase: boolean;
  isLivePhase: boolean;
  tasks: TemplateTask[];
};

type DraftTask = {
  localId: string;
  title: string;
  ownerType: string;
  dueOffsetDays: string;
  blocksPhoto: boolean;
  blocksLive: boolean;
  key: string;
};

type DraftPhase = {
  localId: string;
  name: string;
  key: string;
  isPhotoPhase: boolean;
  isLivePhase: boolean;
  expanded: boolean;
  tasks: DraftTask[];
};

function toDraft(phases: TemplatePhase[]): DraftPhase[] {
  return phases.map((p) => ({
    localId: p.id,
    name: p.name,
    key: p.key,
    isPhotoPhase: p.isPhotoPhase,
    isLivePhase: p.isLivePhase,
    expanded: true,
    tasks: p.tasks.map((t) => ({
      localId: t.id,
      title: t.title,
      ownerType: t.ownerType,
      dueOffsetDays: t.dueOffsetDays == null ? "" : String(t.dueOffsetDays),
      blocksPhoto: t.blocksPhoto,
      blocksLive: t.blocksLive,
      key: t.key || "",
    })),
  }));
}

function newLocalId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function SopTemplateEditor({ initialPhases }: { initialPhases: TemplatePhase[] }) {
  const router = useRouter();
  const [phases, setPhases] = useState<DraftPhase[]>(() => toDraft(initialPhases));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const summary = useMemo(() => {
    const tasks = phases.reduce((n, p) => n + p.tasks.length, 0);
    const photoGates = phases.flatMap((p) => p.tasks).filter((t) => t.blocksPhoto).length;
    const liveGates = phases.flatMap((p) => p.tasks).filter((t) => t.blocksLive).length;
    return { phases: phases.length, tasks, photoGates, liveGates };
  }, [phases]);

  function updatePhase(localId: string, patch: Partial<DraftPhase>) {
    setPhases((prev) => prev.map((p) => (p.localId === localId ? { ...p, ...patch } : p)));
  }

  function updateTask(phaseId: string, taskId: string, patch: Partial<DraftTask>) {
    setPhases((prev) =>
      prev.map((p) =>
        p.localId !== phaseId
          ? p
          : {
              ...p,
              tasks: p.tasks.map((t) => (t.localId === taskId ? { ...t, ...patch } : t)),
            }
      )
    );
  }

  function movePhase(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= phases.length) return;
    setPhases((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  function moveTask(phaseId: string, index: number, dir: -1 | 1) {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.localId !== phaseId) return p;
        const next = index + dir;
        if (next < 0 || next >= p.tasks.length) return p;
        const tasks = [...p.tasks];
        const [item] = tasks.splice(index, 1);
        tasks.splice(next, 0, item);
        return { ...p, tasks };
      })
    );
  }

  function addPhase() {
    setPhases((prev) => [
      ...prev,
      {
        localId: newLocalId("phase"),
        name: `Phase ${prev.length} — Custom`,
        key: `custom_${prev.length}`,
        isPhotoPhase: false,
        isLivePhase: false,
        expanded: true,
        tasks: [],
      },
    ]);
  }

  function removePhase(localId: string) {
    if (!confirm("Remove this phase and all its template tasks?")) return;
    setPhases((prev) => prev.filter((p) => p.localId !== localId));
  }

  function addTask(phaseId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.localId !== phaseId
          ? p
          : {
              ...p,
              tasks: [
                ...p.tasks,
                {
                  localId: newLocalId("task"),
                  title: "New task",
                  ownerType: "Agent",
                  dueOffsetDays: "",
                  blocksPhoto: false,
                  blocksLive: false,
                  key: "",
                },
              ],
            }
      )
    );
  }

  function removeTask(phaseId: string, taskId: string) {
    setPhases((prev) =>
      prev.map((p) =>
        p.localId !== phaseId
          ? p
          : { ...p, tasks: p.tasks.filter((t) => t.localId !== taskId) }
      )
    );
  }

  function payload() {
    return {
      phases: phases.map((p, order) => ({
        name: p.name,
        key: p.key,
        order,
        isPhotoPhase: p.isPhotoPhase,
        isLivePhase: p.isLivePhase,
        tasks: p.tasks.map((t, tOrder) => ({
          title: t.title,
          ownerType: t.ownerType,
          order: tOrder,
          key: t.key || null,
          dueOffsetDays: t.dueOffsetDays === "" ? null : Number(t.dueOffsetDays),
          blocksPhoto: t.blocksPhoto,
          blocksLive: t.blocksLive,
        })),
      })),
    };
  }

  async function save() {
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/template", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Could not save template");
      return;
    }
    setPhases(toDraft(data.phases));
    setMsg(data.note || "Saved. New launches will use this SOP; open launches unchanged.");
    router.refresh();
  }

  async function resetDefault() {
    if (
      !confirm(
        "Reset your SOP template to the ListLaunch default? Open launches will NOT change."
      )
    ) {
      return;
    }
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Could not reset");
      return;
    }
    setPhases(toDraft(data.phases));
    setMsg(data.note || "Reset to ListLaunch default.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My SOP template</h1>
            <p className="mt-1 text-sm text-muted">
              Customize phases and tasks for <strong>new</strong> launches. Editing here does
              not rewrite in-progress boards.
            </p>
            <p className="mt-2 text-xs text-muted">
              {summary.phases} phases · {summary.tasks} tasks · {summary.photoGates} Photo Day
              gates · {summary.liveGates} Live gates
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={resetDefault}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Reset to ListLaunch default
            </button>
            <button
              type="button"
              disabled={busy || phases.length === 0}
              onClick={save}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save template"}
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-900">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-danger">
          {err}
        </div>
      )}

      <div className="space-y-3">
        {phases.map((phase, pIdx) => (
          <section
            key={phase.localId}
            className="rounded-xl border border-slate-200 bg-card shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
              <button
                type="button"
                className="text-muted hover:text-slate-900"
                onClick={() => updatePhase(phase.localId, { expanded: !phase.expanded })}
                aria-label="Toggle phase"
              >
                {phase.expanded ? "▼" : "▶"}
              </button>
              <input
                value={phase.name}
                onChange={(e) => updatePhase(phase.localId, { name: e.target.value })}
                className="min-w-[12rem] flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm font-semibold"
              />
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={phase.isPhotoPhase}
                  onChange={(e) =>
                    updatePhase(phase.localId, { isPhotoPhase: e.target.checked })
                  }
                />
                Photo Day phase
              </label>
              <label className="flex items-center gap-1 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={phase.isLivePhase}
                  onChange={(e) =>
                    updatePhase(phase.localId, { isLivePhase: e.target.checked })
                  }
                />
                Live phase
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded border border-slate-200 px-2 py-0.5 text-xs"
                  onClick={() => movePhase(pIdx, -1)}
                  disabled={pIdx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-200 px-2 py-0.5 text-xs"
                  onClick={() => movePhase(pIdx, 1)}
                  disabled={pIdx === phases.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded border border-red-200 px-2 py-0.5 text-xs text-danger"
                  onClick={() => removePhase(phase.localId)}
                >
                  Remove
                </button>
              </div>
            </div>

            {phase.expanded && (
              <div className="divide-y divide-slate-100">
                {phase.tasks.map((task, tIdx) => (
                  <div
                    key={task.localId}
                    className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="space-y-2">
                      <input
                        value={task.title}
                        onChange={(e) =>
                          updateTask(phase.localId, task.localId, { title: e.target.value })
                        }
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <label className="flex items-center gap-1">
                          Owner
                          <select
                            value={task.ownerType}
                            onChange={(e) =>
                              updateTask(phase.localId, task.localId, {
                                ownerType: e.target.value,
                              })
                            }
                            className="rounded border border-slate-200 px-1 py-0.5"
                          >
                            {OWNER_TYPES.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1">
                          Due offset (days vs go-live)
                          <input
                            type="number"
                            value={task.dueOffsetDays}
                            onChange={(e) =>
                              updateTask(phase.localId, task.localId, {
                                dueOffsetDays: e.target.value,
                              })
                            }
                            placeholder="e.g. -5"
                            className="w-20 rounded border border-slate-200 px-1 py-0.5"
                          />
                        </label>
                        <label className="flex items-center gap-1 font-medium text-amber-800">
                          <input
                            type="checkbox"
                            checked={task.blocksPhoto}
                            onChange={(e) =>
                              updateTask(phase.localId, task.localId, {
                                blocksPhoto: e.target.checked,
                              })
                            }
                          />
                          Gates Photo Day
                        </label>
                        <label className="flex items-center gap-1 font-medium text-teal-800">
                          <input
                            type="checkbox"
                            checked={task.blocksLive}
                            onChange={(e) =>
                              updateTask(phase.localId, task.localId, {
                                blocksLive: e.target.checked,
                              })
                            }
                          />
                          Gates Live
                        </label>
                      </div>
                    </div>
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        className="rounded border border-slate-200 px-2 py-0.5 text-xs"
                        onClick={() => moveTask(phase.localId, tIdx, -1)}
                        disabled={tIdx === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-200 px-2 py-0.5 text-xs"
                        onClick={() => moveTask(phase.localId, tIdx, 1)}
                        disabled={tIdx === phase.tasks.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-200 px-2 py-0.5 text-xs text-danger"
                        onClick={() => removeTask(phase.localId, task.localId)}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => addTask(phase.localId)}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    + Add task
                  </button>
                </div>
              </div>
            )}
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={addPhase}
        className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
      >
        + Add phase
      </button>
    </div>
  );
}
