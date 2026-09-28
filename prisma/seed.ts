import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes } from "date-fns";
import { randomBytes } from "crypto";
import { DEFAULT_SOP, PHOTO_DAY_PREREQ_KEYS } from "../src/lib/sop-template";

const prisma = new PrismaClient();

function publicToken() {
  return randomBytes(24).toString("base64url");
}

async function ensureTemplate(userId: string) {
  const count = await prisma.workspaceTemplatePhase.count({ where: { userId } });
  if (count > 0) return;

  for (const phaseDef of DEFAULT_SOP) {
    const phase = await prisma.workspaceTemplatePhase.create({
      data: {
        userId,
        name: phaseDef.name,
        order: phaseDef.order,
        key: phaseDef.key,
        isPhotoPhase: !!phaseDef.isPhotoPhase,
        isLivePhase: !!phaseDef.isLivePhase,
      },
    });
    for (let i = 0; i < phaseDef.tasks.length; i++) {
      const t = phaseDef.tasks[i];
      await prisma.workspaceTemplateTask.create({
        data: {
          phaseId: phase.id,
          title: t.title,
          ownerType: t.ownerType,
          order: i,
          key: t.key,
          dueOffsetDays: t.dueOffsetDays ?? null,
          blocksPhoto: !!t.blocksPhoto,
          blocksLive: !!t.blocksLive,
        },
      });
    }
  }
  console.log("Seeded workspace SOP template for user");
}

async function createLaunchFromTemplate(
  userId: string,
  data: {
    address: string;
    sellerName: string;
    sellerPhone?: string;
    sellerEmail?: string;
    goLiveAt: Date;
    propertyType?: string;
  }
) {
  const template = await prisma.workspaceTemplatePhase.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  const source =
    template.length > 0
      ? template
      : DEFAULT_SOP.map((p) => ({
          name: p.name,
          order: p.order,
          key: p.key,
          isPhotoPhase: !!p.isPhotoPhase,
          isLivePhase: !!p.isLivePhase,
          tasks: p.tasks.map((t, i) => ({
            title: t.title,
            ownerType: t.ownerType,
            order: i,
            key: t.key,
            dueOffsetDays: t.dueOffsetDays ?? null,
            blocksPhoto: !!t.blocksPhoto,
            blocksLive: !!t.blocksLive,
          })),
        }));

  const launch = await prisma.launch.create({
    data: {
      address: data.address,
      sellerName: data.sellerName,
      sellerPhone: data.sellerPhone || null,
      sellerEmail: data.sellerEmail || null,
      goLiveAt: data.goLiveAt,
      propertyType: data.propertyType || "residential",
      userId,
    },
  });

  for (const phaseDef of source) {
    const phase = await prisma.phase.create({
      data: {
        launchId: launch.id,
        name: phaseDef.name,
        order: phaseDef.order,
        key: phaseDef.key,
        isPhotoPhase: phaseDef.isPhotoPhase,
        isLivePhase: phaseDef.isLivePhase,
      },
    });

    for (const t of phaseDef.tasks) {
      const dueAt =
        t.dueOffsetDays != null ? addDays(data.goLiveAt, t.dueOffsetDays) : null;
      await prisma.task.create({
        data: {
          phaseId: phase.id,
          title: t.title,
          ownerType: t.ownerType,
          key: t.key,
          order: t.order,
          dueAt,
          status: "todo",
          blocksPhoto: t.blocksPhoto,
          blocksLive: t.blocksLive,
        },
      });
    }
  }

  return launch;
}

/** Backfill gate flags on existing launches created before template feature */
async function backfillLaunchGates() {
  await prisma.phase.updateMany({
    where: { key: "photo" },
    data: { isPhotoPhase: true },
  });
  await prisma.phase.updateMany({
    where: { key: "golive" },
    data: { isLivePhase: true },
  });
  await prisma.task.updateMany({
    where: { key: { in: [...PHOTO_DAY_PREREQ_KEYS] } },
    data: { blocksPhoto: true },
  });
  await prisma.task.updateMany({
    where: { key: "mls_signoff" },
    data: { blocksLive: true },
  });
}

async function ensureDemoVendors(userId: string) {
  const count = await prisma.vendor.count({ where: { userId } });
  if (count > 0) return;

  const demo = [
    {
      name: "Bright Clean Co.",
      role: "cleaner",
      phone: "(512) 555-0201",
      email: "hello@brightclean.example",
      notes: "Prefers mornings; brings own supplies",
    },
    {
      name: "Lens & Light Photo",
      role: "photographer",
      phone: "(512) 555-0202",
      email: "book@lenslight.example",
      notes: "48h buffer before go-live; drone available",
    },
    {
      name: "Austin Stage Studio",
      role: "stager",
      phone: "(512) 555-0203",
      email: "team@austinstage.example",
      notes: null,
    },
    {
      name: "FixIt Frank",
      role: "handyman",
      phone: "(512) 555-0204",
      email: null,
      notes: "Punch list specialist",
    },
  ];

  for (const v of demo) {
    await prisma.vendor.create({ data: { userId, ...v } });
  }
  console.log("Seeded demo vendors");
}

async function main() {
  const email = "vijaya@listlaunch.local";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Vijaya Varala",
      passwordHash,
    },
  });

  await ensureTemplate(user.id);
  await backfillLaunchGates();
  await ensureDemoVendors(user.id);

  const existing = await prisma.launch.count({ where: { userId: user.id } });
  let launchId: string | null = null;

  if (existing === 0) {
    const goLive = addDays(new Date(), 14);
    goLive.setHours(9, 0, 0, 0);

    const launch = await createLaunchFromTemplate(user.id, {
      address: "1842 Maple Ridge Dr, Austin, TX 78745",
      sellerName: "Jordan & Sam Rivera",
      sellerPhone: "(512) 555-0142",
      sellerEmail: "rivera.sellers@example.com",
      goLiveAt: goLive,
      propertyType: "residential",
    });
    launchId = launch.id;

    const intakeTasks = await prisma.task.findMany({
      where: {
        phase: { launchId: launch.id, key: "intake" },
        key: { in: ["agreement_signed", "goals_confirmed"] },
      },
    });
    for (const t of intakeTasks) {
      await prisma.task.update({ where: { id: t.id }, data: { status: "done" } });
    }

    // Seed access notes on the access task for photo packet demo
    await prisma.task.updateMany({
      where: { phase: { launchId: launch.id }, key: "access_notes" },
      data: {
        notes: "Lockbox on front porch rail · Gate code 4471 · Dog in backyard until photo day · Alarm: unset",
      },
    });

    console.log("Seeded demo launch:", launch.address);
  } else {
    const first = await prisma.launch.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    launchId = first?.id ?? null;
    console.log("Launches already exist — skip demo launch seed");
  }

  // Ensure seller portal token + a sample photo job for dogfood
  if (launchId) {
    const portal = await prisma.sellerPortalToken.findUnique({
      where: { launchId },
    });
    if (!portal) {
      await prisma.sellerPortalToken.create({
        data: { launchId, token: publicToken() },
      });
      console.log("Seeded seller portal token");
    }

    const jobCount = await prisma.vendorJob.count({ where: { launchId } });
    if (jobCount === 0) {
      const photographer = await prisma.vendor.findFirst({
        where: { userId: user.id, role: "photographer" },
      });
      const photoTask = await prisma.task.findFirst({
        where: { phase: { launchId }, key: "photographer_booked" },
      });
      if (photographer) {
        let when = addDays(new Date(), 10);
        when = setMinutes(setHours(when, 10), 0);
        await prisma.vendorJob.create({
          data: {
            launchId,
            vendorId: photographer.id,
            taskId: photoTask?.id ?? null,
            scheduledAt: when,
            accessNotes:
              "Lockbox on front porch rail · Gate code 4471 · Park on street. Call agent on arrival.",
            confirmToken: publicToken(),
            confirmStatus: "pending",
          },
        });
        console.log("Seeded sample photographer job");
      }
    }
  }

  console.log("Demo login:", email, "/ demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
