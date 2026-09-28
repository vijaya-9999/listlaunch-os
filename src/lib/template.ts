import { prisma } from "./prisma";
import { DEFAULT_SOP, type SopPhaseDef } from "./sop-template";

export type TemplatePhaseWithTasks = {
  id: string;
  name: string;
  order: number;
  key: string;
  isPhotoPhase: boolean;
  isLivePhase: boolean;
  tasks: {
    id: string;
    title: string;
    ownerType: string;
    order: number;
    key: string | null;
    dueOffsetDays: number | null;
    blocksPhoto: boolean;
    blocksLive: boolean;
  }[];
};

function slugKey(name: string, fallback: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return base || fallback;
}

/** Seed DEFAULT_SOP into the user's workspace template if empty. */
export async function ensureUserTemplate(userId: string) {
  const count = await prisma.workspaceTemplatePhase.count({ where: { userId } });
  if (count > 0) return getUserTemplate(userId);
  await writeTemplateFromDefs(userId, DEFAULT_SOP);
  return getUserTemplate(userId);
}

export async function getUserTemplate(userId: string): Promise<TemplatePhaseWithTasks[]> {
  const phases = await prisma.workspaceTemplatePhase.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    include: { tasks: { orderBy: { order: "asc" } } },
  });
  return phases;
}

async function writeTemplateFromDefs(userId: string, defs: SopPhaseDef[]) {
  for (const phaseDef of defs) {
    const phase = await prisma.workspaceTemplatePhase.create({
      data: {
        userId,
        name: phaseDef.name,
        order: phaseDef.order,
        key: phaseDef.key,
        isPhotoPhase: !!phaseDef.isPhotoPhase,
        isLivePhase: !!phaseDef.isLivePhase,
      },
    });
    for (let i = 0; i < phaseDef.tasks.length; i++) {
      const t = phaseDef.tasks[i];
      await prisma.workspaceTemplateTask.create({
        data: {
          phaseId: phase.id,
          title: t.title,
          ownerType: t.ownerType,
          order: i,
          key: t.key,
          dueOffsetDays: t.dueOffsetDays ?? null,
          blocksPhoto: !!t.blocksPhoto,
          blocksLive: !!t.blocksLive,
        },
      });
    }
  }
}

/** Wipe user's template and re-seed ListLaunch default. Does not touch open launches. */
export async function resetUserTemplate(userId: string) {
  await prisma.workspaceTemplatePhase.deleteMany({ where: { userId } });
  await writeTemplateFromDefs(userId, DEFAULT_SOP);
  return getUserTemplate(userId);
}

export type SaveTemplateInput = {
  phases: {
    id?: string;
    name: string;
    key?: string;
    order: number;
    isPhotoPhase?: boolean;
    isLivePhase?: boolean;
    tasks: {
      id?: string;
      title: string;
      ownerType: string;
      order: number;
      key?: string | null;
      dueOffsetDays?: number | null;
      blocksPhoto?: boolean;
      blocksLive?: boolean;
    }[];
  }[];
};

/**
 * Replace the entire workspace template in one transaction.
 * Open/in-progress launches are NOT modified.
 */
export async function saveUserTemplate(userId: string, input: SaveTemplateInput) {
  await prisma.$transaction(async (tx) => {
    await tx.workspaceTemplatePhase.deleteMany({ where: { userId } });

    for (const p of input.phases) {
      const key = (p.key && p.key.trim()) || slugKey(p.name, `phase_${p.order}`);
      const phase = await tx.workspaceTemplatePhase.create({
        data: {
          userId,
          name: p.name.trim() || `Phase ${p.order}`,
          order: p.order,
          key,
          isPhotoPhase: !!p.isPhotoPhase,
          isLivePhase: !!p.isLivePhase,
        },
      });

      for (const t of p.tasks) {
        const tKey =
          t.key && t.key.trim()
            ? t.key.trim()
            : slugKey(t.title, `task_${t.order}`);
        await tx.workspaceTemplateTask.create({
          data: {
            phaseId: phase.id,
            title: t.title.trim() || "Untitled task",
            ownerType: t.ownerType || "Agent",
            order: t.order,
            key: tKey,
            dueOffsetDays:
              t.dueOffsetDays === undefined || t.dueOffsetDays === null
                ? null
                : Number(t.dueOffsetDays),
            blocksPhoto: !!t.blocksPhoto,
            blocksLive: !!t.blocksLive,
          },
        });
      }
    }
  });

  return getUserTemplate(userId);
}
