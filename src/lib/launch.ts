import { addDays } from "date-fns";
import { prisma } from "./prisma";
import { DEFAULT_SOP } from "./sop-template";
import { ensureUserTemplate } from "./template";

export type CreateLaunchInput = {
  address: string;
  sellerName: string;
  sellerPhone?: string;
  sellerEmail?: string;
  goLiveAt: Date;
  propertyType?: string;
  userId: string;
};

/** Clone phases/tasks from the user's workspace template (fallback: DEFAULT_SOP). */
export async function createLaunchWithSop(input: CreateLaunchInput) {
  const template = await ensureUserTemplate(input.userId);
  const source =
    template.length > 0
      ? template
      : DEFAULT_SOP.map((p) => ({
          id: p.key,
          name: p.name,
          order: p.order,
          key: p.key,
          isPhotoPhase: !!p.isPhotoPhase,
          isLivePhase: !!p.isLivePhase,
          tasks: p.tasks.map((t, i) => ({
            id: t.key,
            title: t.title,
            ownerType: t.ownerType,
            order: i,
            key: t.key,
            dueOffsetDays: t.dueOffsetDays ?? null,
            blocksPhoto: !!t.blocksPhoto,
            blocksLive: !!t.blocksLive,
          })),
        }));

  return prisma.$transaction(async (tx) => {
    const launch = await tx.launch.create({
      data: {
        address: input.address,
        sellerName: input.sellerName,
        sellerPhone: input.sellerPhone || null,
        sellerEmail: input.sellerEmail || null,
        goLiveAt: input.goLiveAt,
        propertyType: input.propertyType || "residential",
        userId: input.userId,
      },
    });

    for (const phaseDef of source) {
      const phase = await tx.phase.create({
        data: {
          launchId: launch.id,
          name: phaseDef.name,
          order: phaseDef.order,
          key: phaseDef.key,
          isPhotoPhase: phaseDef.isPhotoPhase,
          isLivePhase: phaseDef.isLivePhase,
        },
      });

      for (const t of phaseDef.tasks) {
        const dueAt =
          t.dueOffsetDays != null ? addDays(input.goLiveAt, t.dueOffsetDays) : null;
        await tx.task.create({
          data: {
            phaseId: phase.id,
            title: t.title,
            ownerType: t.ownerType,
            key: t.key,
            order: t.order,
            dueAt,
            status: "todo",
            blocksPhoto: t.blocksPhoto,
            blocksLive: t.blocksLive,
          },
        });
      }
    }

    return launch;
  });
}

export function computeProgress(
  tasks: { status: string }[]
): { done: number; total: number; pct: number } {
  const actionable = tasks.filter((t) => t.status !== "na");
  const total = actionable.length;
  const done = actionable.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export type TaskLike = {
  title?: string;
  id: string;
  key: string | null;
  status: string;
  blocksPhoto?: boolean;
  blocksLive?: boolean;
  phase: { key: string; isPhotoPhase?: boolean; isLivePhase?: boolean };
};

function isMet(status: string) {
  return status === "done" || status === "na";
}

/** Photo Day locked until every task with blocksPhoto=true is done/na */
export function isPhotoDayLocked(allTasks: TaskLike[]): boolean {
  const gates = allTasks.filter((t) => t.blocksPhoto);
  if (gates.length === 0) return false;
  return gates.some((t) => !isMet(t.status));
}

/** Live phase locked until every task with blocksLive=true is done/na */
export function isLivePhaseLocked(allTasks: TaskLike[]): boolean {
  const gates = allTasks.filter((t) => t.blocksLive);
  if (gates.length === 0) return false;
  return gates.some((t) => !isMet(t.status));
}

export function isTaskLocked(task: TaskLike, allTasks: TaskLike[]): boolean {
  const inPhoto =
    task.phase.isPhotoPhase ||
    task.phase.key === "photo";
  const inLive =
    task.phase.isLivePhase ||
    task.phase.key === "golive";

  if (inPhoto && isPhotoDayLocked(allTasks)) return true;
  if (inLive && isLivePhaseLocked(allTasks)) return true;
  return false;
}

export function photoDayPrereqStatus(allTasks: TaskLike[]) {
  return allTasks
    .filter((t) => t.blocksPhoto)
    .map((t) => ({
      key: t.key ?? t.id,
      title: t.title ?? t.key ?? "Prerequisite",
      status: t.status,
      met: isMet(t.status),
    }));
}

export function livePrereqStatus(allTasks: TaskLike[]) {
  return allTasks
    .filter((t) => t.blocksLive)
    .map((t) => ({
      key: t.key ?? t.id,
      title: t.title ?? t.key ?? "Prerequisite",
      status: t.status,
      met: isMet(t.status),
    }));
}

/** Add a one-off task to a single launch phase (does not touch workspace template). */
export async function addOneOffTask(
  phaseId: string,
  data: { title: string; ownerType?: string }
) {
  const max = await prisma.task.aggregate({
    where: { phaseId },
    _max: { order: true },
  });
  const order = (max._max.order ?? -1) + 1;
  return prisma.task.create({
    data: {
      phaseId,
      title: data.title.trim() || "One-off task",
      ownerType: data.ownerType || "Agent",
      order,
      status: "todo",
      key: `oneoff_${Date.now()}`,
      blocksPhoto: false,
      blocksLive: false,
    },
  });
}
