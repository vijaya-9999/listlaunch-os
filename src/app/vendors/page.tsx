import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";
import { VendorDirectory } from "@/components/VendorDirectory";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const vendors = await prisma.vendor.findMany({
    where: { userId: user.id },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <Nav userName={user.name} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="mb-2 inline-block text-sm text-muted hover:text-brand">
            ← Active launches
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">Vendors</h1>
          <p className="mt-1 text-sm text-muted">
            Your cleaner, stager, handyman, photographer, and landscaper contacts. Add one-by-one
            or import a CSV / Excel file. Schedule them from any launch board.
          </p>
        </div>
        <VendorDirectory initialVendors={vendors} />
      </main>
    </div>
  );
}
