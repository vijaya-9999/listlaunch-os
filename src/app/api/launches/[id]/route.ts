import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeProgress,
  isPhotoDayLocked,
  isLivePhaseLocked,
  photoDayPrereqStatus,
  livePrereqStatus,
} from "@/lib/launch";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const launch = await prisma.launch.findFirst({
    where: { id, userId: user.id },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
      vendorJobs: {
        include: {
          vendor: true,
          task: { select: { id: true, title: true, key: true } },
        },
        orderBy: { scheduledAt: "asc" },
      },
      sellerPortalToken: true,
    },
  });
  if (!launch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const flatTasks = launch.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      ...t,
      phase: {
        key: p.key,
        isPhotoPhase: p.isPhotoPhase,
        isLivePhase: p.isLivePhase,
      },
    }))
  );
  const progress = computeProgress(flatTasks);
  const photoLocked = isPhotoDayLocked(flatTasks);
  const prereqs = photoDayPrereqStatus(flatTasks);
  const liveLocked = isLivePhaseLocked(flatTasks);
  const livePrereqs = livePrereqStatus(flatTasks);

  return NextResponse.json({
    launch: {
      ...launch,
      progress,
      photoLocked,
      photoPrereqs: prereqs,
      liveLocked,
      livePrereqs,
    },
  });
}
