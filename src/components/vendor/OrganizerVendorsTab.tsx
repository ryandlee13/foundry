"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForOrganizer, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { getUnassignedEngagementsForOrganizer } from "@/lib/vendors/engagements";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import OrganizerVendorRequestsPage from "./OrganizerVendorRequestsPage";
import type { Booking } from "@/lib/types/spaces";

/**
 * Find Vendors as a first-class tab rather than a button buried on one row of
 * the Event Status list. Hiring vendors is half of planning an event; it
 * shouldn't take a detour through the bookings list to reach.
 *
 * Vendor requests are still anchored to a confirmed booking (`EventNeed.
 * bookingId` — see CLAUDE.md), so the tab picks the event first and then hands
 * off to the same `OrganizerVendorRequestsPage` the per-booking route renders.
 * One component, two entry points; there is no second copy of this screen to
 * keep in sync.
 */

/** Soonest event that hasn't happened yet, else the most recent past one. */
function pickDefaultBooking(bookings: Booking[], todayIso: string): Booking | null {
  if (bookings.length === 0) return null;
  const byDate = [...bookings].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  return byDate.find((booking) => booking.eventDate >= todayIso) ?? byDate[byDate.length - 1];
}

export default function OrganizerVendorsTab() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Vendors hired before there was an event to put them on. */
  const [unassignedCount, setUnassignedCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const owned = getBookingsForOrganizer(user.id);
    const confirmed = owned.filter((booking) => booking.status === "confirmed");
    const todayIso = new Date().toISOString().slice(0, 10);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllBookings(owned);
    setUnassignedCount(getUnassignedEngagementsForOrganizer(user.id).length);
    setSelectedId((current) =>
      current && confirmed.some((booking) => booking.id === current)
        ? current
        : (pickDefaultBooking(confirmed, todayIso)?.id ?? null)
    );
    setLoaded(true);
  }, [user]);

  const options = useMemo(
    () =>
      allBookings
        .filter((booking) => booking.status === "confirmed")
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [allBookings]
  );

  if (authLoading || !loaded) {
    return <LoadingState label="Loading your events…" />;
  }

  const selected = options.find((booking) => booking.id === selectedId) ?? null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Vendors</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Post what you need, compare proposals, and manage everyone you&apos;ve hired — one confirmed event at a
        time.
      </p>

      {/*
        The way back to vendors hired before there was a venue, and the way to
        attach them to an event. Shown whether or not any exist: this is also
        the entry point for *starting* a hire with no venue yet, which is the
        whole reason the unassigned flow exists.
      */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">
            Hired someone before you had a venue?
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {unassignedCount > 0
              ? `${unassignedCount} vendor${unassignedCount === 1 ? " isn't" : "s aren't"} attached to an event yet — assign ${unassignedCount === 1 ? "them" : "each of them"} to one and everybody moves into a shared conversation.`
              : "Line up vendors without a space, then attach them to an event once it's confirmed."}
          </p>
        </div>
        <Link
          href="/dashboard/organizer/vendors/unassigned"
          className="flex shrink-0 items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Vendors without an event
          {unassignedCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-paper">
              {unassignedCount}
            </span>
          )}
        </Link>
      </div>

      {!selected ? (
        <div className="mt-8">
          <EmptyState
            title="No confirmed events yet"
            description={
              allBookings.length === 0
                ? "Vendor requests attach to a confirmed booking. Find a space and send a request — once a host accepts, this is where you hire for it."
                : "A host still has to accept your request. As soon as one does, that event shows up here and you can start hiring for it."
            }
            action={
              <Link
                href={allBookings.length === 0 ? "/spaces" : "/dashboard/organizer"}
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                {allBookings.length === 0 ? "Discover spaces" : "View your bookings"}
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/*
            Only shown when there's an actual choice to make — a planner with
            one event doesn't need a dropdown that can only be set to the thing
            it's already set to.
          */}
          {options.length > 1 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label htmlFor="vendors-event" className="text-xs font-medium text-ink-soft">
                Event
              </label>
              <select
                id="vendors-event"
                value={selected.id}
                onChange={(event) => setSelectedId(event.target.value)}
                className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              >
                {options.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {formatEventLabel(booking)} — {formatEventDate(booking.eventDate)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/*
            The event is the heading and everything vendor-related sits inside
            it. With the event name as one more grey line among the request
            cards, a planner running two events couldn't tell at a glance which
            one they were looking at — so it's now a large title with the
            requests, roster, and proposals visibly nested beneath it.
          */}
          <section className="mt-6 rounded-2xl border border-line bg-paper-dim/40 p-5 sm:p-6">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              {formatEventLabel(selected)}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {formatEventDate(selected.eventDate)} · {formatTimeRange(selected.startTime, selected.endTime)} ·{" "}
              {selected.attendees} guests
            </p>

            <div className="mt-5 border-t border-line pt-5">
              {/* key: remount on switch so the embedded page reloads its own data. */}
              <OrganizerVendorRequestsPage key={selected.id} bookingId={selected.id} showHeader={false} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
