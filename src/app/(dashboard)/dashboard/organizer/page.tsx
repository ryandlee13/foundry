"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForOrganizer, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { getThreadForBooking, getUnreadMessageCount } from "@/lib/vendors/messages";
import { BOOKING_STATUS_LABELS } from "@/lib/spaces/labels";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, BookingStatus } from "@/lib/types/spaces";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-paper-dim text-ink-soft",
  confirmed: "bg-brass/15 text-brass-dark",
  declined: "bg-wine/10 text-wine",
};

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [threadIdByBooking, setThreadIdByBooking] = useState<Record<string, string>>({});
  const [unreadByBooking, setUnreadByBooking] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const owned = getBookingsForOrganizer(user.id);
    const threadIds: Record<string, string> = {};
    const unread: Record<string, number> = {};
    for (const booking of owned) {
      const thread = getThreadForBooking(booking.id);
      if (thread) {
        threadIds[booking.id] = thread.id;
        unread[booking.id] = getUnreadMessageCount(thread.id, user.id);
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookings(owned);
    setThreadIdByBooking(threadIds);
    setUnreadByBooking(unread);
    setLoaded(true);
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Event details</h1>
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
                    href={`/spaces/${booking.venueSlug}?from=dashboard`}
                    className="font-display text-base font-semibold text-ink hover:underline"
                  >
                    {formatEventLabel(booking)}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {formatEventDate(booking.eventDate)} · {formatTimeRange(booking.startTime, booking.endTime)} ·{" "}
                    {booking.attendees} guests
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {threadIdByBooking[booking.id] && (
                    <Link
                      href={`/dashboard/messages/${threadIdByBooking[booking.id]}`}
                      className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                    >
                      Messages
                      {(unreadByBooking[booking.id] ?? 0) > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[10px] font-bold text-paper">
                          {unreadByBooking[booking.id]}
                        </span>
                      )}
                    </Link>
                  )}
                  {booking.status === "confirmed" && (
                    <Link
                      href={`/dashboard/organizer/bookings/${booking.id}/vendors`}
                      className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                    >
                      Find vendors
                    </Link>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[booking.status]}`}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
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
