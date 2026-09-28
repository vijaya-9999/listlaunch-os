import Link from "next/link";
import { format } from "date-fns";

type Props = {
  id: string;
  address: string;
  sellerName: string;
  goLiveAt: string | Date;
  propertyType: string;
  progress: { pct: number; done: number; total: number };
};

export function LaunchCard({
  id,
  address,
  sellerName,
  goLiveAt,
  propertyType,
  progress,
}: Props) {
  const date = typeof goLiveAt === "string" ? new Date(goLiveAt) : goLiveAt;
  const pct = progress.pct;

  return (
    <Link
      href={`/launches/${id}`}
      className="block rounded-xl border border-slate-200 bg-card p-5 shadow-sm transition hover:border-brand hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{address}</h2>
          <p className="mt-1 text-sm text-muted">
            {sellerName} · {propertyType}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-brand">{pct}%</div>
          <div className="text-xs text-muted">
            {progress.done}/{progress.total} tasks
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Progress</span>
          <span>Go-live {format(date, "MMM d, yyyy")}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
