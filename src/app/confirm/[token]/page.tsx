import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ConfirmJobClient } from "@/components/ConfirmJobClient";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const job = await prisma.vendorJob.findUnique({
    where: { confirmToken: token },
    include: {
      vendor: { select: { name: true, role: true } },
      launch: { select: { address: true } },
      task: { select: { title: true } },
    },
  });
  if (!job) notFound();

  return (
    <ConfirmJobClient
      token={token}
      job={{
        scheduledAt: job.scheduledAt.toISOString(),
        accessNotes: job.accessNotes,
        confirmStatus: job.confirmStatus,
        vendor: job.vendor,
        launch: job.launch,
        task: job.task,
      }}
    />
  );
}
