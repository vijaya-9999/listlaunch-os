import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVendorRole } from "@/lib/vendors";

async function ownedVendor(userId: string, id: string) {
  return prisma.vendor.findFirst({ where: { id, userId } });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const vendor = await ownedVendor(user.id, id);
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vendor });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await ownedVendor(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    name?: string;
    role?: string;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
  } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (body.role !== undefined) {
    const role = String(body.role).trim();
    if (!isVendorRole(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = role;
  }
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null;
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;

  const vendor = await prisma.vendor.update({ where: { id }, data });
  return NextResponse.json({ vendor });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await ownedVendor(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
