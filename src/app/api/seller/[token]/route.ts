import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
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
  if (!portal) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const tasks = portal.launch.phases.flatMap((p) =>
    p.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueAt: t.dueAt,
      notes: t.notes,
      photoUrl: t.photoUrl,
      phaseName: p.name,
    }))
  );

  return NextResponse.json({
    launch: {
      address: portal.launch.address,
      sellerName: portal.launch.sellerName,
      goLiveAt: portal.launch.goLiveAt,
    },
    tasks,
  });
}
