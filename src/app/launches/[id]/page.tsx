import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computeProgress,
  isPhotoDayLocked,
  isLivePhaseLocked,
  photoDayPrereqStatus,
  livePrereqStatus,
} from "@/lib/launch";
import { Nav } from "@/components/Nav";
import { LaunchBoard } from "@/components/LaunchBoard";
import { LaunchJobsPanel } from "@/components/LaunchJobsPanel";

export const dynamic = "force-dynamic";

export default async function LaunchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

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
  if (!launch) notFound();

  const vendors = await prisma.vendor.findMany({
    where: { userId: user.id },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true },
  });

  const flat = launch.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      ...t,
      phase: {
        key: p.key,
        isPhotoPhase: p.isPhotoPhase,
        isLivePhase: p.isLivePhase,
      },
    }))
  );
  const progress = computeProgress(flat);
  const photoLocked = isPhotoDayLocked(flat);
  const photoPrereqs = photoDayPrereqStatus(flat);
  const liveLocked = isLivePhaseLocked(flat);
  const livePrereqs = livePrereqStatus(flat);

  const taskOptions = launch.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      phaseName: p.name,
    }))
  );

  return (
    <div>
      <Nav userName={user.name} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link href="/" className="inline-block text-sm text-muted hover:text-brand">
          ← Active launches
        </Link>
        <LaunchBoard
          launchId={launch.id}
          address={launch.address}
          sellerName={launch.sellerName}
          sellerPhone={launch.sellerPhone}
          sellerEmail={launch.sellerEmail}
          goLiveAt={launch.goLiveAt.toISOString()}
          propertyType={launch.propertyType}
          phases={launch.phases.map((p) => ({
            id: p.id,
            name: p.name,
            key: p.key,
            order: p.order,
            isPhotoPhase: p.isPhotoPhase,
            isLivePhase: p.isLivePhase,
            tasks: p.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              ownerType: t.ownerType,
              status: t.status,
              dueAt: t.dueAt ? t.dueAt.toISOString() : null,
              key: t.key,
              order: t.order,
              blocksPhoto: t.blocksPhoto,
              blocksLive: t.blocksLive,
            })),
          }))}
          progress={progress}
          photoLocked={photoLocked}
          photoPrereqs={photoPrereqs}
          liveLocked={liveLocked}
          livePrereqs={livePrereqs}
        />
        <LaunchJobsPanel
          launchId={launch.id}
          initialJobs={launch.vendorJobs.map((j) => ({
            id: j.id,
            scheduledAt: j.scheduledAt.toISOString(),
            accessNotes: j.accessNotes,
            confirmStatus: j.confirmStatus,
            confirmToken: j.confirmToken,
            vendor: {
              id: j.vendor.id,
              name: j.vendor.name,
              role: j.vendor.role,
              phone: j.vendor.phone,
              email: j.vendor.email,
            },
            task: j.task,
          }))}
          vendors={vendors}
          tasks={taskOptions}
          sellerPortalToken={launch.sellerPortalToken?.token ?? null}
        />
      </main>
    </div>
  );
}
