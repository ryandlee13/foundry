"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForOrganizer } from "@/lib/spaces/bookings";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking } from "@/lib/types/spaces";

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookings(getBookingsForOrganizer(user.id));
    setLoaded(true);
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Organizer dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">Your confirmed venue bookings.</p>

      <div className="mt-8">
        {!loaded ? (
          <LoadingState label="Loading your bookings…" />
        ) : bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            description="Browse Discover Spaces to find a venue and book it."
            action={
              <Link
                href="/spaces"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Discover spaces
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex items-center justify-between rounded-2xl border border-line bg-paper px-5 py-4"
              >
                <div>
                  <Link
                    href={`/spaces/${booking.venueSlug}`}
                    className="font-display text-base font-semibold text-ink hover:underline"
                  >
                    {booking.venueName}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {booking.eventDate} · {booking.startTime}–{booking.endTime} ·{" "}
                    {booking.attendees} guests
                  </p>
                </div>
                <span className="rounded-full bg-brass/15 px-2.5 py-1 text-xs font-semibold text-brass-dark">
                  Confirmed
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
