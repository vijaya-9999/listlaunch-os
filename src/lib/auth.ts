import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SESSION_COOKIE = "ll_session";
const SECRET =
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  "listlaunch-dev-secret-change-me";

type SessionPayload = { userId: string; email: string; exp: number };

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encodeSession(data: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, email: string) {
  const token = encodeSession({
    userId,
    email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function requireUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  return user;
}
