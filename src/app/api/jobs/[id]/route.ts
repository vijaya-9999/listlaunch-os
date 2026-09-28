import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePublicToken } from "@/lib/tokens";

async function ownedJob(userId: string, id: string) {
  return prisma.vendorJob.findFirst({
    where: { id, launch: { userId } },
    include: {
      vendor: true,
      task: { select: { id: true, title: true, key: true } },
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await ownedJob(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    scheduledAt?: Date;
    accessNotes?: string | null;
    taskId?: string | null;
    confirmToken?: string;
    confirmStatus?: string;
  } = {};

  if (body.scheduledAt !== undefined) {
    const d = new Date(body.scheduledAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
    }
    data.scheduledAt = d;
  }
  if (body.accessNotes !== undefined) {
    data.accessNotes = body.accessNotes ? String(body.accessNotes).trim() : null;
  }
  if (body.taskId !== undefined) {
    if (body.taskId === null || body.taskId === "") {
      data.taskId = null;
    } else {
      const task = await prisma.task.findFirst({
        where: { id: String(body.taskId), phase: { launchId: existing.launchId } },
      });
      if (!task) {
        return NextResponse.json({ error: "Task not found on this launch" }, { status: 404 });
      }
      data.taskId = task.id;
    }
  }
  if (body.regenerateToken) {
    data.confirmToken = generatePublicToken();
    data.confirmStatus = "pending";
  }

  const job = await prisma.vendorJob.update({
    where: { id },
    data,
    include: {
      vendor: true,
      task: { select: { id: true, title: true, key: true } },
    },
  });
  return NextResponse.json({ job });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await ownedJob(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vendorJob.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
