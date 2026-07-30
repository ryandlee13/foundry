"use client";

import { useEffect, useId, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { findAccountById } from "@/lib/auth/storage";
import { getPastRentalsForOrganizer } from "@/lib/spaces/bookings";
import type { Account } from "@/lib/auth/types";
import type { Booking, Venue } from "@/lib/types/spaces";

export default function BookingRequestReviewModal({
  booking,
  venue,
  open,
  onClose,
  onAccept,
  onDecline,
}: {
  booking: Booking | null;
  venue: Venue | null;
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const titleId = useId();
  const [organizer, setOrganizer] = useState<Account | null>(null);
  const [pastRentals, setPastRentals] = useState<Booking[]>([]);

  useEffect(() => {
    if (!open || !booking) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrganizer(findAccountById(booking.organizerId) ?? null);
    setPastRentals(getPastRentalsForOrganizer(booking.organizerId, booking.id));
  }, [open, booking]);

  if (!booking || !venue) return null;

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} panelClassName="w-full max-w-md p-6">
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          Review request
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

      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine/10 font-display text-base font-semibold text-wine">
          {(organizer?.name ?? booking.organizerName).charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-display text-base font-semibold text-ink">
            {organizer?.name ?? booking.organizerName}
          </p>
          {organizer?.email && <p className="text-xs text-ink-soft">{organizer.email}</p>}
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-paper-dim px-3.5 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Requested</p>
        <p className="mt-1 text-sm font-medium text-ink">{venue.name}</p>
        <p className="text-xs text-ink-soft">
          {booking.eventDate} · {booking.startTime}–{booking.endTime} · {booking.attendees} guests
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Past rentals on Foundry
        </p>
        {pastRentals.length === 0 ? (
          <p className="mt-1.5 text-sm text-ink-soft">No past rentals yet.</p>
        ) : (
          <ul className="mt-1.5 space-y-1 text-sm text-ink">
            {pastRentals.map((rental) => (
              <li key={rental.id} className="flex justify-between">
                <span>{rental.venueName}</span>
                <span className="text-ink-soft">{rental.eventDate}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(venue.rules.coiRequired || venue.rules.securityDepositRequired) && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Application</p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink">
            {venue.rules.coiRequired && (
              <li className="flex items-center gap-1.5">
                <span className={booking.coiAgreed ? "text-brass-dark" : "text-wine"}>
                  {booking.coiAgreed ? "✓" : "✗"}
                </span>
                Certificate of Insurance
              </li>
            )}
            {venue.rules.securityDepositRequired && (
              <li className="flex items-center gap-1.5">
                <span className={booking.depositAgreed ? "text-brass-dark" : "text-wine"}>
                  {booking.depositAgreed ? "✓" : "✗"}
                </span>
                Security deposit
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onDecline}
          className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Accept
        </button>
      </div>
    </Dialog>
  );
}
