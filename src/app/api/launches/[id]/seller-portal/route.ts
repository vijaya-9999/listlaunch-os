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

  let portal = await prisma.sellerPortalToken.findUnique({ where: { launchId: id } });
  if (!portal) {
    portal = await prisma.sellerPortalToken.create({
      data: { launchId: id, token: generatePublicToken() },
    });
  }
  return NextResponse.json({ portal });
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
  const regenerate = !!body.regenerate;

  let portal = await prisma.sellerPortalToken.findUnique({ where: { launchId: id } });
  if (!portal) {
    portal = await prisma.sellerPortalToken.create({
      data: { launchId: id, token: generatePublicToken() },
    });
  } else if (regenerate) {
    portal = await prisma.sellerPortalToken.update({
      where: { launchId: id },
      data: { token: generatePublicToken() },
    });
  }

  console.log(`[SellerPortal] Link for ${launch.address}: /seller/${portal.token}`);
  return NextResponse.json({ portal });
}
