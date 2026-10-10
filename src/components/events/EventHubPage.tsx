"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingById, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { ensureBookingConversation } from "@/lib/spaces/bookingWorkflow";
import { ensureEventRoom, describeEventRoomForBooking, EVENT_ROOM_STATE_COPY } from "@/lib/spaces/eventRoom";
import { resolveEventProgress } from "@/lib/events/eventProgressData";
import { getThreadForBooking, getEventThreadForBooking, getUnreadMessageCount, getMessagesForThread } from "@/lib/vendors/messages";
import { getEngagementsForBooking } from "@/lib/vendors/engagements";
import { getThreadForEngagement } from "@/lib/vendors/messages";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { resolveBookingTone } from "@/lib/ui/statusTone";
import { formatRelativeListTime } from "@/lib/ui/format";
import { INTERACTIVE_ROW } from "@/lib/ui/interactive";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EventProgressStepper from "./EventProgressStepper";
import LedgerTable from "@/components/finance/LedgerTable";
import { resolveEventLedger } from "@/lib/finance/eventLedgerData";
import type { EventLedger } from "@/lib/finance/eventLedger";
import OrganizerVendorRequestsPage from "@/components/vendor/OrganizerVendorRequestsPage";
import type { EventProgress } from "@/lib/events/eventProgress";
import type { Booking } from "@/lib/types/spaces";

/**
 * One page per event: where it stands, who's working it, and every
 * conversation about it.
 *
 * This is the "single view" the app didn't have. Before it, answering "is this
 * event ready" meant the bookings list for the venue, the Vendors tab for the
 * roster, Messages for the contract, and nothing at all for reviews.
 *
 * The vendor section embeds `OrganizerVendorRequestsPage` with
 * `showHeader={false}` — the same one-component-two-entry-points pattern
 * `OrganizerVendorsTab` already uses, so there is no second copy of that
 * screen to keep in sync.
 */

interface ThreadRow {
  id: string;
  title: string;
  subtitle: string;
  unread: number;
  lastAt: string | null;
}

export default function EventHubPage({ bookingId }: { bookingId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [progress, setProgress] = useState<EventProgress | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [ledger, setLedger] = useState<EventLedger | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    const found = getBookingById(bookingId) ?? null;
    setBooking(found);

    if (!found || found.organizerId !== user.id) {
      setLoaded(true);
      return;
    }

    /*
     * Same two calls the organizer dashboard and Messages already make on
     * load. Both are idempotent and quiet, and running them here means a
     * planner who lands on the hub first still finds the conversations
     * waiting rather than depending on which page they happened to open.
     */
    if (found.status === "confirmed") {
      ensureBookingConversation(found.id, user.id);
      ensureEventRoom(found.id);
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    setProgress(resolveEventProgress(bookingId, todayIso));
    setLedger(resolveEventLedger(bookingId, user.id));

    const rows: ThreadRow[] = [];
    const venueThread = getThreadForBooking(bookingId);
    if (venueThread) {
      rows.push({
        id: venueThread.id,
        title: `Venue — ${found.venueName}`,
        subtitle: "You and the host",
        unread: getUnreadMessageCount(venueThread.id, user.id),
        lastAt: getMessagesForThread(venueThread.id).at(-1)?.createdAt ?? null,
      });
    }

    const room = getEventThreadForBooking(bookingId);
    if (room) {
      rows.push({
        id: room.id,
        title: "Event room",
        subtitle: `You, the venue, and ${room.participantIds.length - 1} vendor${room.participantIds.length - 1 === 1 ? "" : "s"}`,
        unread: getUnreadMessageCount(room.id, user.id),
        lastAt: getMessagesForThread(room.id).at(-1)?.createdAt ?? null,
      });
    }

    for (const engagement of getEngagementsForBooking(bookingId)) {
      const thread = getThreadForEngagement(engagement.id);
      if (!thread) continue;
      const vendor = getVendorProfileById(engagement.vendorProfileId);
      rows.push({
        id: thread.id,
        title: vendor?.displayName ?? "Vendor",
        subtitle: "Vendor conversation",
        unread: getUnreadMessageCount(thread.id, user.id),
        lastAt: getMessagesForThread(thread.id).at(-1)?.createdAt ?? null,
      });
    }

    setThreads(rows);
    setLoaded(true);
  }, [bookingId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) return <LoadingState label="Loading this event…" />;

  /*
   * Ownership is checked here as UX only — the real gate is Phase 2
   * server-side authorization (docs/SECURITY.md #3). Same posture as every
   * other dashboard page in this prototype.
   */
  if (!user || !booking || booking.organizerId !== user.id) {
    return (
      <ErrorState
        title="Event not found"
        description="This event doesn't exist, or it isn't one of yours."
      />
    );
  }

  const roomState = describeEventRoomForBooking(bookingId);

  return (
    <div>
      <Link href="/dashboard/organizer" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to event status
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {formatEventLabel(booking)}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatEventDate(booking.eventDate)} · {formatTimeRange(booking.startTime, booking.endTime)} ·{" "}
            {booking.attendees} guests · {booking.venueName}
          </p>
        </div>
        <StatusBadge descriptor={resolveBookingTone(booking.status, "organizer")} />
      </header>

      {progress && (
        <section className="mt-6 rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <EventProgressStepper progress={progress} />
        </section>
      )}

      {ledger && (
        <section className="mt-6 rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-ink">Budget</h2>
            <Link
              href="/dashboard/organizer/finances"
              className="text-xs font-semibold text-brass-dark hover:underline"
            >
              All events →
            </Link>
          </div>
          <div className="mt-4">
            <LedgerTable ledger={ledger} />
          </div>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Conversations</h2>
        {threads.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-soft">
            {EVENT_ROOM_STATE_COPY[roomState].body}
          </p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`/dashboard/messages/${thread.id}`}
                    className={`flex items-center justify-between gap-3 px-5 py-3.5 ${INTERACTIVE_ROW}`}
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm ${thread.unread > 0 ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                        {thread.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-soft">{thread.subtitle}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-ink-soft">{formatRelativeListTime(thread.lastAt)}</span>
                      {thread.unread > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-paper">
                          {thread.unread}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Why the three-way room isn't here, when it isn't. */}
            {roomState !== "open" && (
              <p className="mt-2 px-1 text-xs text-ink-soft">
                {EVENT_ROOM_STATE_COPY[roomState].title}. {EVENT_ROOM_STATE_COPY[roomState].body}
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <OrganizerVendorRequestsPage bookingId={bookingId} showHeader={false} />
      </section>
    </div>
  );
}
