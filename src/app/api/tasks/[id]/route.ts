import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTaskLocked } from "@/lib/launch";

const ALLOWED = new Set(["todo", "done", "na"]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status || "");
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: "status must be todo|done|na" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id },
    include: {
      phase: {
        include: {
          launch: true,
          tasks: true,
        },
      },
    },
  });

  if (!task || task.phase.launch.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const phases = await prisma.phase.findMany({
    where: { launchId: task.phase.launchId },
    include: { tasks: true },
  });
  const allTasks = phases.flatMap((p) =>
    p.tasks.map((t) => ({
      ...t,
      phase: {
        key: p.key,
        isPhotoPhase: p.isPhotoPhase,
        isLivePhase: p.isLivePhase,
      },
    }))
  );
  const current = {
    ...task,
    phase: {
      key: task.phase.key,
      isPhotoPhase: task.phase.isPhotoPhase,
      isLivePhase: task.phase.isLivePhase,
    },
  };

  if (
    (status === "done" || status === "na") &&
    isTaskLocked(current, allTasks)
  ) {
    const photo =
      current.phase.isPhotoPhase || current.phase.key === "photo";
    return NextResponse.json(
      {
        error: photo
          ? "Photo Day is locked until all Photo Day gate tasks are done."
          : "Go-live is locked until all Live gate tasks are done.",
        locked: true,
      },
      { status: 423 }
    );
  }

  const updated = await prisma.task.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ task: updated });
}
