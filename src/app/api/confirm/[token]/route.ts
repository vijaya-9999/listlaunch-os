import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const job = await prisma.vendorJob.findUnique({
    where: { confirmToken: token },
    include: {
      vendor: { select: { name: true, role: true, phone: true, email: true } },
      launch: {
        select: { address: true, goLiveAt: true, sellerName: true },
      },
      task: { select: { id: true, title: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  return NextResponse.json({
    job: {
      id: job.id,
      scheduledAt: job.scheduledAt,
      accessNotes: job.accessNotes,
      confirmStatus: job.confirmStatus,
      vendor: job.vendor,
      launch: {
        address: job.launch.address,
        goLiveAt: job.launch.goLiveAt,
      },
      task: job.task,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const job = await prisma.vendorJob.findUnique({
    where: { confirmToken: token },
  });
  if (!job) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "").toLowerCase();
  if (action !== "confirm" && action !== "decline") {
    return NextResponse.json(
      { error: "action must be confirm or decline" },
      { status: 400 }
    );
  }

  const confirmStatus = action === "confirm" ? "confirmed" : "declined";
  const updated = await prisma.vendorJob.update({
    where: { id: job.id },
    data: { confirmStatus },
    include: {
      vendor: { select: { name: true, role: true } },
      launch: { select: { address: true } },
    },
  });

  console.log(
    `[VendorJob] ${updated.vendor.name} ${confirmStatus} job at ${updated.launch.address}`
  );

  return NextResponse.json({
    job: {
      id: updated.id,
      confirmStatus: updated.confirmStatus,
      scheduledAt: updated.scheduledAt,
      vendor: updated.vendor,
      launch: updated.launch,
    },
  });
}
