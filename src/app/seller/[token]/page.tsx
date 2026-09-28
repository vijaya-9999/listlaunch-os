import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SellerPortalClient } from "@/components/SellerPortalClient";

export const dynamic = "force-dynamic";

export default async function SellerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const portal = await prisma.sellerPortalToken.findUnique({
    where: { token },
    include: {
      launch: {
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              tasks: {
                where: { ownerType: "Seller" },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!portal) notFound();

  const tasks = portal.launch.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: t.dueAt ? t.dueAt.toISOString() : null,
      notes: t.notes,
      photoUrl: t.photoUrl,
      phaseName: p.name,
    }))
  );

  return (
    <SellerPortalClient
      token={token}
      launch={{
        address: portal.launch.address,
        sellerName: portal.launch.sellerName,
        goLiveAt: portal.launch.goLiveAt.toISOString(),
      }}
      initialTasks={tasks}
    />
  );
}
