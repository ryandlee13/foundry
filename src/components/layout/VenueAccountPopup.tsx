"use client";

import { useId } from "react";
import Link from "next/link";
import Dialog from "@/components/ui/Dialog";

/**
 * Only shown to signed-out visitors — Header.tsx checks the real (prototype)
 * session and skips straight to /dashboard/venue for anyone already signed
 * in, so both paths here assume no session exists yet.
 */
export default function VenueAccountPopup({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} panelClassName="w-full max-w-sm p-6">
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          Do you already have a venue with Foundry?
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/sign-in?next=%2Fdashboard%2Fvenue"
          onClick={onClose}
          className="rounded-full bg-wine px-5 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Yes — sign me in
        </Link>
        <Link
          href="/sign-up?role=venue_operator&next=%2Flist-your-venue"
          onClick={onClose}
          className="rounded-full border border-line px-5 py-3 text-center text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          No — I&apos;m listing my first space
        </Link>
      </div>
    </Dialog>
  );
}
