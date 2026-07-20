import type { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-paper px-6 py-16 text-center">
      <svg
        viewBox="0 0 24 24"
        className="h-10 w-10 text-line"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden
      >
        <rect x="3.5" y="6.5" width="17" height="14" rx="2" />
        <path d="M3.5 10.5h17M8 3.5v4M16 3.5v4" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-display text-lg font-semibold text-ink">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-ink-soft">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
