"use client";

import { useId } from "react";
import Link from "next/link";
import Dialog from "@/components/ui/Dialog";

export interface IntentOption {
  key: string;
  label: string;
  description?: string;
  /** Navigates when set; otherwise `onSelect` runs (used to chain one dialog into the next). */
  href?: string;
  onSelect?: () => void;
  emphasis?: boolean;
}

/**
 * A small "which of these are you here to do?" chooser. Used to branch the
 * homepage CTAs — first on intent (find vs. list), then on whether the
 * visitor already has an account — instead of dumping every path into the
 * hero as its own button.
 */
export default function IntentDialog({
  open,
  title,
  description,
  options,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  options: IntentOption[];
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} panelClassName="w-full max-w-sm p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
            {title}
          </h2>
          {description && <p className="mt-1.5 text-sm text-ink-soft">{description}</p>}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {options.map((option) => {
          const className = option.emphasis
            ? "block rounded-2xl bg-wine px-5 py-3.5 text-left text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            : "block rounded-2xl border border-line px-5 py-3.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-paper-dim";

          const body = (
            <>
              <span className="block">{option.label}</span>
              {option.description && (
                <span className={`mt-0.5 block text-xs font-normal ${option.emphasis ? "text-paper/75" : "text-ink-soft"}`}>
                  {option.description}
                </span>
              )}
            </>
          );

          return option.href ? (
            <Link key={option.key} href={option.href} onClick={onClose} className={className}>
              {body}
            </Link>
          ) : (
            <button key={option.key} type="button" onClick={option.onSelect} className={className}>
              {body}
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
