import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ensureUserTemplate,
  resetUserTemplate,
  saveUserTemplate,
  type SaveTemplateInput,
} from "@/lib/template";
import { OWNER_TYPES } from "@/lib/sop-template";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const phases = await ensureUserTemplate(user.id);
  return NextResponse.json({ phases, ownerTypes: OWNER_TYPES });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.phases)) {
    return NextResponse.json({ error: "phases array required" }, { status: 400 });
  }

  const input: SaveTemplateInput = {
    phases: body.phases.map(
      (
        p: {
          id?: string;
          name?: string;
          key?: string;
          order?: number;
          isPhotoPhase?: boolean;
          isLivePhase?: boolean;
          tasks?: {
            id?: string;
            title?: string;
            ownerType?: string;
            order?: number;
            key?: string | null;
            dueOffsetDays?: number | null;
            blocksPhoto?: boolean;
            blocksLive?: boolean;
          }[];
        },
        idx: number
      ) => ({
        id: p.id,
        name: String(p.name || `Phase ${idx}`),
        key: p.key,
        order: typeof p.order === "number" ? p.order : idx,
        isPhotoPhase: !!p.isPhotoPhase,
        isLivePhase: !!p.isLivePhase,
        tasks: Array.isArray(p.tasks)
          ? p.tasks.map((t, tIdx) => ({
              id: t.id,
              title: String(t.title || "Untitled"),
              ownerType: String(t.ownerType || "Agent"),
              order: typeof t.order === "number" ? t.order : tIdx,
              key: t.key ?? null,
              dueOffsetDays:
                t.dueOffsetDays === undefined || t.dueOffsetDays === null
                  ? null
                  : Number(t.dueOffsetDays),
              blocksPhoto: !!t.blocksPhoto,
              blocksLive: !!t.blocksLive,
            }))
          : [],
      })
    ),
  };

  if (input.phases.length === 0) {
    return NextResponse.json({ error: "At least one phase required" }, { status: 400 });
  }

  const phases = await saveUserTemplate(user.id, input);
  return NextResponse.json({
    phases,
    note: "Template saved. Existing launches are unchanged; new launches will use this SOP.",
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body?.action === "reset") {
    const phases = await resetUserTemplate(user.id);
    return NextResponse.json({
      phases,
      note: "Reset to ListLaunch default. Existing launches are unchanged.",
    });
  }

  // ensure
  const phases = await ensureUserTemplate(user.id);
  return NextResponse.json({ phases });
}

