"use client";

import type { Booking } from "@/lib/types/spaces";

/**
 * Permanent entry point into the vendor-request builder for a confirmed
 * booking.
 *
 * Used to be a rotating "Does your event need a ___?" headline with a
 * "Not right now" dismissal remembered per booking. Both are gone: the
 * rotating blank made the panel read as an ad rather than a tool, and
 * dismissal meant an organizer who clicked it once could never find the
 * entry point here again.
 */
export default function FindVendorsPrompt({
  booking,
  onOpenBuilder,
}: {
  booking: Booking;
  onOpenBuilder: () => void;
}) {
  if (booking.status !== "confirmed") return null;

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-paper to-paper-dim p-8 text-center">
      <button
        type="button"
        onClick={onOpenBuilder}
        className="rounded-full bg-wine px-7 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
      >
        Find Vendors
      </button>
      <p className="mt-3 text-sm text-ink-soft">
        Post what you need and compare bids from vendors serving your event.
      </p>
    </div>
  );
}
