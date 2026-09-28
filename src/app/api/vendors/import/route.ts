import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeVendorRole } from "@/lib/vendors";

type IncomingRow = {
  name?: unknown;
  role?: unknown;
  phone?: unknown;
  email?: unknown;
  notes?: unknown;
};

function normPhone(p: string | null): string {
  return (p || "").replace(/\D/g, "");
}

function dupKey(name: string, phone: string | null): string {
  return `${name.trim().toLowerCase()}|${normPhone(phone)}`;
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const incoming = Array.isArray(body.vendors) ? (body.vendors as IncomingRow[]) : null;
  if (!incoming) {
    return NextResponse.json({ error: "Expected { vendors: [...] }" }, { status: 400 });
  }
  if (incoming.length > 500) {
    return NextResponse.json({ error: "Max 500 vendors per import" }, { status: 400 });
  }

  const existing = await prisma.vendor.findMany({
    where: { userId: user.id },
    select: { name: true, phone: true },
  });
  const existingKeys = new Set(existing.map((v) => dupKey(v.name, v.phone)));

  const added: { id: string; name: string; role: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const batchKeys = new Set<string>();

  for (const raw of incoming) {
    const name = String(raw.name || "").trim();
    if (!name) {
      skipped.push({ name: "(empty)", reason: "Empty name" });
      continue;
    }
    const phone = raw.phone != null && String(raw.phone).trim() ? String(raw.phone).trim() : null;
    const email = raw.email != null && String(raw.email).trim() ? String(raw.email).trim() : null;
    const notes = raw.notes != null && String(raw.notes).trim() ? String(raw.notes).trim() : null;
    const role = normalizeVendorRole(raw.role != null ? String(raw.role) : "");

    const key = dupKey(name, phone);
    if (existingKeys.has(key) || batchKeys.has(key)) {
      skipped.push({
        name,
        reason: `Duplicate (same name+phone${batchKeys.has(key) ? " in file" : " already exists"})`,
      });
      continue;
    }

    const vendor = await prisma.vendor.create({
      data: { userId: user.id, name, role, phone, email, notes },
    });
    batchKeys.add(key);
    existingKeys.add(key);
    added.push({ id: vendor.id, name: vendor.name, role: vendor.role });
  }

  return NextResponse.json({
    added: added.length,
    skipped: skipped.length,
    vendors: added,
    skippedDetails: skipped,
  });
}
