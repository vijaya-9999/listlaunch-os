import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ensureUserTemplate } from "@/lib/template";
import { Nav } from "@/components/Nav";
import { SopTemplateEditor } from "@/components/SopTemplateEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const phases = await ensureUserTemplate(user.id);

  return (
    <div>
      <Nav userName={user.name} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/" className="mb-4 inline-block text-sm text-muted hover:text-brand">
          ← Active launches
        </Link>
        <SopTemplateEditor
          initialPhases={phases.map((p) => ({
            id: p.id,
            name: p.name,
            order: p.order,
            key: p.key,
            isPhotoPhase: p.isPhotoPhase,
            isLivePhase: p.isLivePhase,
            tasks: p.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              ownerType: t.ownerType,
              order: t.order,
              key: t.key,
              dueOffsetDays: t.dueOffsetDays,
              blocksPhoto: t.blocksPhoto,
              blocksLive: t.blocksLive,
            })),
          }))}
        />
      </main>
    </div>
  );
}
