import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { CreateLaunchForm } from "@/components/CreateLaunchForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function NewLaunchPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div>
      <Nav userName={user.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link href="/" className="mb-4 inline-block text-sm text-muted hover:text-brand">
          ← Active launches
        </Link>
        <CreateLaunchForm />
      </main>
    </div>
  );
}
