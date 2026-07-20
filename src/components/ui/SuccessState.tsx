import type { ReactNode } from "react";

export default function SuccessState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-paper px-6 py-16 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brass/15 text-brass-dark">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
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
