"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getVenuesOwnedBy } from "@/lib/spaces/submittedVenues";
import { getBookingsForVenue } from "@/lib/spaces/bookings";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, Venue } from "@/lib/types/spaces";

export default function VenueDashboardPage() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookingsByVenue, setBookingsByVenue] = useState<Record<string, Booking[]>>({});

  useEffect(() => {
    // localStorage reads are client-only — see AuthProvider.tsx for the
    // same hydration-safety reasoning.
    if (!user) return;
    const owned = getVenuesOwnedBy(user.id);
    const bookings: Record<string, Booking[]> = {};
    for (const venue of owned) {
      bookings[venue.id] = getBookingsForVenue(venue.id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVenues(owned);
    setBookingsByVenue(bookings);
    setLoaded(true);
  }, [user]);

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
          <div className="space-y-6">
            {venues.map((venue) => {
              const bookings = bookingsByVenue[venue.id] ?? [];
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
                    {bookings.length === 0 ? (
                      <p className="mt-2 text-sm text-ink-soft">No bookings yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {bookings.map((booking) => (
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
    </div>
  );
}
