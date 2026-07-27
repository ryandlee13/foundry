"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForOrganizer } from "@/lib/spaces/bookings";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, BookingStatus } from "@/lib/types/spaces";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-paper-dim text-ink-soft",
  confirmed: "bg-brass/15 text-brass-dark",
  declined: "bg-wine/10 text-wine",
};

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
};

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
      <p className="mt-1 text-sm text-ink-soft">Your venue booking requests.</p>

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
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4"
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
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/organizer/bookings/${booking.id}/vendors`}
                    className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                  >
                    Find vendors
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[booking.status]}`}
                  >
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
