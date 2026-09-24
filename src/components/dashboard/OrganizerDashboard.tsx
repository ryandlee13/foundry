"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBookingsForOrganizer } from "@/lib/spaces/bookings";
import { getVenueById } from "@/lib/spaces/submittedVenues";
import { selectUpcomingBookings } from "@/lib/spaces/venueEarnings";
import { getEngagementsForOrganizer } from "@/lib/vendors/engagements";
import { ensureBookingConversation } from "@/lib/spaces/bookingWorkflow";
import { getThreadForBooking, getUnreadMessageCount } from "@/lib/vendors/messages";
import KpiCard from "./KpiCard";
import UpcomingEventCard from "./UpcomingEventCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, Venue } from "@/lib/types/spaces";

export default function OrganizerDashboard({ accountId }: { accountId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venuesById, setVenuesById] = useState<Record<string, Venue>>({});
  const [vendorsPartneredCount, setVendorsPartneredCount] = useState(0);
  const [todayIso, setTodayIso] = useState("");
  const [threadIdByBooking, setThreadIdByBooking] = useState<Record<string, string>>({});
  const [unreadByBooking, setUnreadByBooking] = useState<Record<string, number>>({});

  useEffect(() => {
    const owned = getBookingsForOrganizer(accountId);
    const venues: Record<string, Venue> = {};
    const threadIds: Record<string, string> = {};
    const unread: Record<string, number> = {};
    for (const booking of owned) {
      const venue = getVenueById(booking.venueId);
      if (venue) venues[booking.venueId] = venue;
      // Either party may open the conversation on a confirmed booking, so the
      // planner's copy is simply there rather than waiting on the host.
      if (booking.status === "confirmed") ensureBookingConversation(booking.id, accountId);
      const thread = getThreadForBooking(booking.id);
      if (thread) {
        threadIds[booking.id] = thread.id;
        unread[booking.id] = getUnreadMessageCount(thread.id, accountId);
      }
    }

    // A "partner" is a distinct vendor who actually committed to one of this
    // organizer's events — not everyone who ever bid.
    const engagements = getEngagementsForOrganizer(accountId).filter(
      (engagement) =>
        engagement.status === "confirmed" ||
        engagement.status === "in_progress" ||
        engagement.status === "completed"
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBookings(owned);
    setVenuesById(venues);
    setVendorsPartneredCount(new Set(engagements.map((e) => e.vendorProfileId)).size);
    setThreadIdByBooking(threadIds);
    setUnreadByBooking(unread);
    setTodayIso(new Date().toISOString().slice(0, 10));
    setLoaded(true);
  }, [accountId]);

  if (!loaded) return <LoadingState label="Loading your events…" />;

  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const upcoming = selectUpcomingBookings(bookings, todayIso);
  const eventsThrown = confirmed.filter((booking) => booking.eventDate < todayIso).length;

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No events yet"
        description="Find a space for your first event — book it, then build out your vendor roster from the same dashboard."
        action={
          <Link
            href="/spaces"
            className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Discover new spaces
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Events thrown"
          value={eventsThrown}
          footnote={eventsThrown === 0 ? "Your first one is still ahead." : "Confirmed events that have happened."}
          href="/dashboard/organizer"
        />
        <KpiCard
          label="Vendors partnered with"
          value={vendorsPartneredCount}
          footnote="Distinct vendors who confirmed a deal with you."
          href="/dashboard/organizer"
        />
        <KpiCard label="Upcoming events" value={upcoming.length} footnote="Confirmed and still ahead." />
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Upcoming events</h2>
          <Link
            href="/spaces"
            className="rounded-full bg-wine px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Plan an Event
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
            Nothing on the calendar right now.{" "}
            <Link href="/spaces" className="font-semibold text-brass-dark hover:underline">
              Discover new spaces
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.map((booking) => (
              <UpcomingEventCard
                key={booking.id}
                booking={booking}
                venue={venuesById[booking.venueId]}
                trailing={
                  <div className="flex items-center gap-2">
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
                    <Link
                      href={`/dashboard/organizer/bookings/${booking.id}/vendors`}
                      className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                    >
                      Vendors
                    </Link>
                  </div>
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
