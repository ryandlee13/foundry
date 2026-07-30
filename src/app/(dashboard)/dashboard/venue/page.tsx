"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOwnedVenuesData } from "@/hooks/useOwnedVenuesData";
import { updateBookingStatus } from "@/lib/spaces/bookings";
import BookingRequestReviewModal from "@/components/dashboard/BookingRequestReviewModal";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, Venue } from "@/lib/types/spaces";

export default function VenueDashboardPage() {
  const { user } = useAuth();
  const { loaded, venues, bookingsByVenue, refresh } = useOwnedVenuesData(user?.id);
  const [reviewing, setReviewing] = useState<{ booking: Booking; venue: Venue } | null>(null);

  const pendingByVenue = venues.map((venue) => ({
    venue,
    pending: (bookingsByVenue[venue.id] ?? []).filter((b) => b.status === "pending"),
  }));
  const allPending = pendingByVenue.flatMap((entry) =>
    entry.pending.map((booking) => ({ booking, venue: entry.venue }))
  );

  function handleAccept() {
    if (!reviewing) return;
    updateBookingStatus(reviewing.booking.id, "confirmed");
    refresh();
    setReviewing(null);
  }

  function handleDecline() {
    if (!reviewing) return;
    updateBookingStatus(reviewing.booking.id, "declined");
    refresh();
    setReviewing(null);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Venue dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your listings and the bookings against them. Listings go live immediately in this
        prototype — there&apos;s no review step yet.
      </p>

      <div className="mt-8">
        {!loaded ? (
          <LoadingState label="Loading your listings…" />
        ) : venues.length === 0 ? (
          <EmptyState
            title="No venue listings yet"
            description="Submit a venue to start receiving bookings."
            action={
              <Link
                href="/list-your-venue"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                List your venue
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {allPending.length > 0 && (
              <div className="rounded-2xl border border-brass/40 bg-brass/5 p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-wine text-xs font-bold text-paper">
                    {allPending.length}
                  </span>
                  <p className="font-display text-lg font-semibold text-ink">
                    {allPending.length === 1
                      ? "Booking request waiting on you"
                      : "Booking requests waiting on you"}
                  </p>
                </div>
                <ul className="mt-4 space-y-2">
                  {allPending.map(({ booking, venue }) => (
                    <li
                      key={booking.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {booking.organizerName} · {venue.name}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {booking.eventDate} · {booking.startTime}–{booking.endTime} ·{" "}
                          {booking.attendees} guests
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewing({ booking, venue })}
                        className="shrink-0 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
                      >
                        Review
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {venues.map((venue) => {
              const confirmed = (bookingsByVenue[venue.id] ?? []).filter(
                (b) => b.status === "confirmed"
              );
              return (
                <div key={venue.id} className="rounded-2xl border border-line bg-paper p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/spaces/${venue.slug}`}
                        className="font-display text-lg font-semibold text-ink hover:underline"
                      >
                        {venue.name}
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {venue.neighborhood}, {venue.city}
                      </p>
                    </div>
                    <span className="rounded-full bg-brass/15 px-2.5 py-1 text-xs font-semibold text-brass-dark">
                      Live
                    </span>
                  </div>

                  <div className="mt-4 border-t border-line pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Upcoming bookings
                    </p>
                    {confirmed.length === 0 ? (
                      <p className="mt-2 text-sm text-ink-soft">No confirmed bookings yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {confirmed.map((booking) => (
                          <li
                            key={booking.id}
                            className="flex items-center justify-between rounded-lg bg-paper-dim px-3.5 py-2.5 text-sm"
                          >
                            <span className="text-ink">
                              {booking.eventDate} · {booking.startTime}–{booking.endTime}
                            </span>
                            <span className="text-ink-soft">
                              {booking.organizerName} · {booking.attendees} guests
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BookingRequestReviewModal
        booking={reviewing?.booking ?? null}
        venue={reviewing?.venue ?? null}
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}
