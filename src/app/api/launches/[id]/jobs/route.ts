import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePublicToken } from "@/lib/tokens";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const launch = await prisma.launch.findFirst({ where: { id, userId: user.id } });
  if (!launch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const jobs = await prisma.vendorJob.findMany({
    where: { launchId: id },
    include: {
      vendor: true,
      task: { select: { id: true, title: true, key: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });
  return NextResponse.json({ jobs });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const launch = await prisma.launch.findFirst({ where: { id, userId: user.id } });
  if (!launch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const vendorId = String(body.vendorId || "").trim();
  const scheduledAtRaw = body.scheduledAt;
  if (!vendorId) return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
  if (!scheduledAtRaw) {
    return NextResponse.json({ error: "Date/time is required" }, { status: 400 });
  }
  const scheduledAt = new Date(scheduledAtRaw);
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, userId: user.id },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  let taskId: string | null = null;
  if (body.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: String(body.taskId), phase: { launchId: id } },
    });
    if (!task) return NextResponse.json({ error: "Task not found on this launch" }, { status: 404 });
    taskId = task.id;
  }

  const job = await prisma.vendorJob.create({
    data: {
      launchId: id,
      vendorId,
      taskId,
      scheduledAt,
      accessNotes: body.accessNotes ? String(body.accessNotes).trim() : null,
      confirmToken: generatePublicToken(),
      confirmStatus: "pending",
    },
    include: {
      vendor: true,
      task: { select: { id: true, title: true, key: true } },
    },
  });

  // Dogfood: no Twilio — log confirm URL for optional copy/paste emailing
  console.log(
    `[VendorJob] Confirm link for ${vendor.name}: /confirm/${job.confirmToken}`
  );

  return NextResponse.json({ job }, { status: 201 });
}
