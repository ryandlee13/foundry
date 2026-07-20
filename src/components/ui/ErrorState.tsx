import type { ReactNode } from "react";

export default function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-wine/25 bg-wine/5 px-6 py-16 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wine/15 text-wine">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 8v5M12 16.5h.01" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8.5" />
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
