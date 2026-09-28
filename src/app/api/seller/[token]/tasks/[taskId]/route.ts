import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Vercel filesystem is ephemeral — store small photos as data URLs on Task.photoUrl */
const ON_VERCEL = process.env.VERCEL === "1";
const MAX_BYTES_LOCAL = 8 * 1024 * 1024;
const MAX_BYTES_VERCEL = Math.floor(1.5 * 1024 * 1024);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ token: string; taskId: string }> }
) {
  const { token, taskId } = await params;
  const portal = await prisma.sellerPortalToken.findUnique({
    where: { token },
    include: { launch: true },
  });
  if (!portal) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      ownerType: "Seller",
      phase: { launchId: portal.launchId },
    },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") || "";
  let status: string | undefined;
  let photoUrl: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const statusField = form.get("status");
    if (statusField) status = String(statusField);
    const file = form.get("photo");
    if (file && typeof file !== "string" && "arrayBuffer" in file) {
      const f = file as File;
      if (f.size > 0) {
        if (!ALLOWED_MIME.has(f.type)) {
          return NextResponse.json(
            { error: "Photo must be JPEG, PNG, WebP, or GIF" },
            { status: 400 }
          );
        }
        const maxBytes = ON_VERCEL ? MAX_BYTES_VERCEL : MAX_BYTES_LOCAL;
        if (f.size > maxBytes) {
          return NextResponse.json(
            {
              error: ON_VERCEL
                ? "Photo must be under 1.5MB on this host"
                : "Photo must be under 8MB",
            },
            { status: 400 }
          );
        }
        const buf = Buffer.from(await f.arrayBuffer());
        if (ON_VERCEL) {
          // Persist inline — no durable disk on Vercel serverless
          photoUrl = `data:${f.type};base64,${buf.toString("base64")}`;
        } else {
          const ext =
            f.type === "image/png"
              ? "png"
              : f.type === "image/webp"
                ? "webp"
                : f.type === "image/gif"
                  ? "gif"
                  : "jpg";
          const name = `${randomBytes(12).toString("hex")}.${ext}`;
          const dir = path.join(process.cwd(), "public", "uploads");
          await mkdir(dir, { recursive: true });
          await writeFile(path.join(dir, name), buf);
          photoUrl = `/uploads/${name}`;
        }
      }
    }
  } else {
    const body = await req.json().catch(() => ({}));
    if (body.status) status = String(body.status);
  }

  if (status && status !== "todo" && status !== "done" && status !== "na") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(status ? { status } : {}),
      ...(photoUrl ? { photoUrl } : {}),
    },
  });

  return NextResponse.json({
    task: {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      photoUrl: updated.photoUrl,
      notes: updated.notes,
      dueAt: updated.dueAt,
    },
  });
}
