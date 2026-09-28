import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLaunchWithSop, computeProgress } from "@/lib/launch";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const launches = await prisma.launch.findMany({
    where: { userId: user.id, status: "active" },
    include: { phases: { include: { tasks: true } } },
    orderBy: { goLiveAt: "asc" },
  });

  const data = launches.map((l) => {
    const tasks = l.phases.flatMap((p) => p.tasks);
    const progress = computeProgress(tasks);
    return {
      id: l.id,
      address: l.address,
      sellerName: l.sellerName,
      goLiveAt: l.goLiveAt,
      propertyType: l.propertyType,
      status: l.status,
      progress,
    };
  });

  return NextResponse.json({ launches: data });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const address = String(body?.address || "").trim();
  const sellerName = String(body?.sellerName || "").trim();
  const sellerPhone = body?.sellerPhone ? String(body.sellerPhone).trim() : undefined;
  const sellerEmail = body?.sellerEmail ? String(body.sellerEmail).trim() : undefined;
  const propertyType = body?.propertyType ? String(body.propertyType).trim() : "residential";
  const goLiveRaw = body?.goLiveAt;

  if (!address || !sellerName || !goLiveRaw) {
    return NextResponse.json(
      { error: "address, sellerName, and goLiveAt are required" },
      { status: 400 }
    );
  }

  // Date-only (YYYY-MM-DD) → local noon to avoid UTC off-by-one
  const raw = String(goLiveRaw);
  const goLiveAt = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(raw + "T12:00:00")
    : new Date(raw);
  if (Number.isNaN(goLiveAt.getTime())) {
    return NextResponse.json({ error: "Invalid goLiveAt" }, { status: 400 });
  }

  const launch = await createLaunchWithSop({
    address,
    sellerName,
    sellerPhone,
    sellerEmail,
    goLiveAt,
    propertyType,
    userId: user.id,
  });

  return NextResponse.json({ launch: { id: launch.id } }, { status: 201 });
}
