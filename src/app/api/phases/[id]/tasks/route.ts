import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addOneOffTask } from "@/lib/launch";
import { OWNER_TYPES } from "@/lib/sop-template";

/** Add a one-off task to a single launch phase (does not change workspace template). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: phaseId } = await params;
  const body = await req.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const ownerType = String(body?.ownerType || "Agent");

  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }
  if (!OWNER_TYPES.includes(ownerType as (typeof OWNER_TYPES)[number])) {
    return NextResponse.json({ error: "invalid ownerType" }, { status: 400 });
  }

  const phase = await prisma.phase.findFirst({
    where: { id: phaseId },
    include: { launch: true },
  });
  if (!phase || phase.launch.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const task = await addOneOffTask(phaseId, { title, ownerType });
  return NextResponse.json({ task }, { status: 201 });
}
