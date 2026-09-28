import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { ensureUserTemplate } from "@/lib/template";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const name = String(body?.name || "").trim() || "Agent";
  const password = String(body?.password || "");
  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: "Email and password (6+ chars) required" },
      { status: 400 }
    );
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
  });
  await ensureUserTemplate(user.id);
  await createSession(user.id, user.email);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
}
