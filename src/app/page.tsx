import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeProgress } from "@/lib/launch";
import { Nav } from "@/components/Nav";
import { LaunchCard } from "@/components/LaunchCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const launches = await prisma.launch.findMany({
    where: { userId: user.id, status: "active" },
    include: { phases: { include: { tasks: true } } },
    orderBy: { goLiveAt: "asc" },
  });

  return (
    <div>
      <Nav userName={user.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Active Launches</h1>
            <p className="mt-1 text-sm text-muted">
              Backward-plan from go-live. Photo Day stays locked until gate tasks are done.{" "}
              <Link href="/settings" className="text-brand hover:underline">
                Edit my SOP template
              </Link>
            </p>
          </div>
          <Link
            href="/launches/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            + New Launch
          </Link>
        </div>

        {launches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-slate-700">No active launches yet.</p>
            <Link href="/launches/new" className="mt-3 inline-block text-brand hover:underline">
              Create your first launch
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {launches.map((l) => {
              const tasks = l.phases.flatMap((p) => p.tasks);
              const progress = computeProgress(tasks);
              return (
                <LaunchCard
                  key={l.id}
                  id={l.id}
                  address={l.address}
                  sellerName={l.sellerName}
                  goLiveAt={l.goLiveAt}
                  propertyType={l.propertyType}
                  progress={progress}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
