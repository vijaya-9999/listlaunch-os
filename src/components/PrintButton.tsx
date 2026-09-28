"use client";

export function PrintButton({ label = "Print / share" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark print:hidden"
    >
      {label}
    </button>
  );
}
