import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VENDOR_ROLE_LABELS, type VendorRole } from "@/lib/vendors";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PhotoPacketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const launch = await prisma.launch.findFirst({
    where: { id, userId: user.id },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
      vendorJobs: {
        include: { vendor: true, task: true },
        orderBy: { scheduledAt: "asc" },
      },
    },
  });
  if (!launch) notFound();

  const accessTask = launch.phases
    .flatMap((p) => p.tasks)
    .find((t) => t.key === "access_notes");

  const scheduledPhoto =
    launch.vendorJobs.find((j) => j.vendor.role === "photographer") || null;

  const blockingOpen = launch.phases
    .flatMap((p) => p.tasks.map((t) => ({ ...t, phaseName: p.name })))
    .filter((t) => t.blocksPhoto && t.status !== "done" && t.status !== "na");

  const otherOpen = launch.phases
    .flatMap((p) => p.tasks.map((t) => ({ ...t, phaseName: p.name })))
    .filter((t) => {
      if (t.blocksPhoto || t.status !== "todo") return false;
      return /clean|stage|repair|photo|intake/i.test(t.phaseName);
    })
    .slice(0, 12);

  const otherJobs = launch.vendorJobs.filter(
    (j) => j.vendor.role !== "photographer"
  );

  return (
    <div className="bg-white text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-8 print:px-0 print:py-4">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3 print:hidden">
          <Link
            href={`/launches/${launch.id}`}
            className="text-sm text-muted hover:text-brand"
          >
            ← Back to board
          </Link>
          <PrintButton />
        </div>

        <header className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            ListLaunch · Photo-day packet
          </p>
          <h1 className="mt-1 text-2xl font-bold">{launch.address}</h1>
          <p className="mt-1 text-sm text-muted">
            Seller: {launch.sellerName}
            {launch.sellerPhone ? ` · ${launch.sellerPhone}` : ""}
            {" · "}Go-live {format(launch.goLiveAt, "EEE, MMM d, yyyy")}
          </p>
          <p className="text-sm text-muted">Agent: {user.name}</p>
        </header>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Access notes
          </h2>
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
            {scheduledPhoto?.accessNotes ||
              accessTask?.notes ||
              (accessTask
                ? `Board task “${accessTask.title}” is ${
                    accessTask.status === "done" ? "complete" : "still open"
                  } — add lockbox / gate / alarm / pets notes on the photographer job or task.`
                : "No access notes yet. Add them when scheduling the photographer job.")}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Scheduled photo job
          </h2>
          {scheduledPhoto ? (
            <div className="mt-2 rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <p className="font-medium">
                {scheduledPhoto.vendor.name}{" "}
                <span className="font-normal text-muted">
                  (
                  {VENDOR_ROLE_LABELS[
                    scheduledPhoto.vendor.role as VendorRole
                  ] || scheduledPhoto.vendor.role}
                  )
                </span>
              </p>
              <p className="mt-1">
                {format(scheduledPhoto.scheduledAt, "EEEE, MMM d · h:mm a")}
              </p>
              <p className="mt-1 capitalize text-muted">
                Confirm status: {scheduledPhoto.confirmStatus}
              </p>
              {scheduledPhoto.vendor.phone && (
                <p className="mt-1">Phone: {scheduledPhoto.vendor.phone}</p>
              )}
              {scheduledPhoto.task && (
                <p className="mt-1 text-muted">
                  Linked task: {scheduledPhoto.task.title}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No photographer job scheduled yet.{" "}
              <Link
                href={`/launches/${launch.id}`}
                className="text-brand hover:underline print:hidden"
              >
                Schedule one from the board
              </Link>
              .
            </p>
          )}

          {otherJobs.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted">
                Other jobs on this launch
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {otherJobs.map((j) => (
                  <li key={j.id}>
                    {j.vendor.name} ({j.vendor.role}) —{" "}
                    {format(j.scheduledAt, "MMM d · h:mm a")} · {j.confirmStatus}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Open blocking tasks (Photo Day gates)
          </h2>
          {blockingOpen.length === 0 ? (
            <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
              All Photo Day gate tasks are done or N/A. House should be photo-ready.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-red-200">
              {blockingOpen.map((t) => (
                <li key={t.id} className="px-4 py-2 text-sm">
                  <span className="font-medium text-danger">{t.title}</span>
                  <span className="ml-2 text-xs text-muted">
                    {t.phaseName} · {t.ownerType}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {otherOpen.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Other open prep tasks
            </h2>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              {otherOpen.map((t) => (
                <li key={t.id}>
                  {t.title}{" "}
                  <span className="text-xs text-muted">
                    ({t.phaseName} · {t.ownerType})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-100 pt-4 text-xs text-muted">
          Generated by ListLaunch OS ·{" "}
          {format(new Date(), "MMM d, yyyy · h:mm a")} · Share or print this page
          for the photographer.
        </footer>
      </div>
    </div>
  );
}
