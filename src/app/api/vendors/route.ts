import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isVendorRole } from "@/lib/vendors";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendors = await prisma.vendor.findMany({
    where: { userId: user.id },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ vendors });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const role = String(body.role || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!isVendorRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const vendor = await prisma.vendor.create({
    data: {
      userId: user.id,
      name,
      role,
      phone: body.phone ? String(body.phone).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
    },
  });
  return NextResponse.json({ vendor }, { status: 201 });
}
