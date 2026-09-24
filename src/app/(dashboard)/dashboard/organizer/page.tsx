"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForOrganizer, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { getThreadForBooking, getUnreadMessageCount } from "@/lib/vendors/messages";
import { getEngagementsForBooking, getUnassignedEngagementsForOrganizer } from "@/lib/vendors/engagements";
import { getEventNeedsForBooking, computeEventNeedPhase } from "@/lib/vendors/eventNeeds";
import { getProposalsForNeed } from "@/lib/vendors/proposals";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { getSkillName } from "@/lib/vendors/skills";
import { summarizeEventVendors, type EventVendorSummary } from "@/lib/vendors/eventVendorSummary";
import { ENGAGEMENT_STATUS_LABELS, EVENT_NEED_PHASE_LABELS } from "@/lib/vendors/labels";
import { ensureBookingConversation } from "@/lib/spaces/bookingWorkflow";
import { BOOKING_STATUS_LABELS } from "@/lib/spaces/labels";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, BookingStatus } from "@/lib/types/spaces";

/** Per-booking vendor detail, resolved once on load rather than during render. */
interface VendorDetail {
  summary: EventVendorSummary;
  requests: { id: string; title: string; phaseLabel: string; bidCount: number }[];
  vendors: { id: string; name: string; statusLabel: string }[];
}

/*
 * Confirmed is green, not brass: it's the one status that means "this is
 * settled, stop worrying about it", and in brass it read as the same
 * in-progress amber as everything else on the page. Same green the vendor
 * layer already uses for a filled request and a completed engagement.
 */
const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-paper-dim text-ink-soft",
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-wine/10 text-wine",
};

export default function OrganizerDashboardPage() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [threadIdByBooking, setThreadIdByBooking] = useState<Record<string, string>>({});
  const [unreadByBooking, setUnreadByBooking] = useState<Record<string, number>>({});
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [vendorDetailByBooking, setVendorDetailByBooking] = useState<Record<string, VendorDetail>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const owned = getBookingsForOrganizer(user.id);
    const threadIds: Record<string, string> = {};
    const unread: Record<string, number> = {};
    const vendorDetails: Record<string, VendorDetail> = {};
    for (const booking of owned) {
      /*
       * Read here, not in the expanded panel: resolving needs, proposals, and
       * vendor profiles during render would hit localStorage once per row per
       * render — the same smell already fixed on the Find Vendors page.
       */
      const needs = getEventNeedsForBooking(booking.id);
      const engagements = getEngagementsForBooking(booking.id);
      vendorDetails[booking.id] = {
        summary: summarizeEventVendors({ needs, engagements }),
        requests: needs.map((need) => {
          const proposals = getProposalsForNeed(need.id);
          return {
            id: need.id,
            title: need.title || `Looking for a ${getSkillName(need.skillSlug)}`,
            phaseLabel: EVENT_NEED_PHASE_LABELS[computeEventNeedPhase(need, proposals)],
            bidCount: proposals.length,
          };
        }),
        vendors: engagements.map((engagement) => ({
          id: engagement.id,
          name: getVendorProfileById(engagement.vendorProfileId)?.displayName ?? "Vendor",
          statusLabel: ENGAGEMENT_STATUS_LABELS[engagement.status],
        })),
      };

      /*
       * Opening the thread here, rather than only on click, is what makes a
       * confirmed booking's conversation simply appear in Messages for the
       * planner. Idempotent and side-effect-light: it creates the row and
       * notifies nobody (only sendMessage notifies), and it no-ops on a
       * pending booking or a seed venue with no host account.
       */
      if (booking.status === "confirmed") ensureBookingConversation(booking.id, user.id);
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
    setVendorDetailByBooking(vendorDetails);
    setUnassignedCount(getUnassignedEngagementsForOrganizer(user.id).length);
    setLoaded(true);
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Event status</h1>
      <p className="mt-1 text-sm text-ink-soft">Your venue booking requests.</p>

      {/*
        Only when there's actually something waiting to be attached. This page
        is about bookings; a standing advert for the unassigned flow belongs on
        the Vendors tab, where it always shows.
      */}
      {unassignedCount > 0 && (
        <Link
          href="/dashboard/organizer/vendors/unassigned"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brass/40 bg-brass/5 px-5 py-4 transition-colors hover:bg-brass/10"
        >
          <span className="text-sm text-ink">
            <span className="font-semibold">
              {unassignedCount} vendor{unassignedCount === 1 ? "" : "s"}
            </span>{" "}
            {unassignedCount === 1 ? "isn't" : "aren't"} attached to an event yet.
          </span>
          <span className="shrink-0 text-sm font-semibold text-brass-dark">Assign to an event →</span>
        </Link>
      )}

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
            {bookings.map((booking) => {
              const detail = vendorDetailByBooking[booking.id];
              const expanded = expandedId === booking.id;
              const panelId = `booking-detail-${booking.id}`;
              return (
                <li key={booking.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/*
                      The summary is the toggle, not a link. The action buttons
                      beside it can't live inside a <button> (nested interactive
                      elements), so they sit outside it in the same row — which
                      is also why the venue link moved into the panel below.
                    */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : booking.id)}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      className="-my-1 min-w-0 flex-1 rounded-lg px-1 py-1 text-left transition-colors hover:bg-paper-dim"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="font-display text-base font-semibold text-ink">
                          {formatEventLabel(booking)}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          className={`h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform ${expanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.25}
                          aria-hidden
                        >
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {formatEventDate(booking.eventDate)} ·{" "}
                        {formatTimeRange(booking.startTime, booking.endTime)} · {booking.attendees} guests
                      </span>
                      {detail && (
                        <span className="block text-xs text-brass-dark">{detail.summary.headline}</span>
                      )}
                    </button>
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
                      {/*
                        Every booking except a declined one. This used to require
                        `confirmed`, which meant a planner waiting on a host saw no
                        way to start lining up vendors — the wait is exactly when
                        they want to. Declined stays excluded: there's no event
                        there to hire for.
                      */}
                      {booking.status !== "declined" && (
                        <Link
                          href={`/dashboard/organizer/bookings/${booking.id}/vendors`}
                          className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                        >
                          Vendors
                        </Link>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[booking.status]}`}
                      >
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </span>
                    </div>
                  </div>

                  {expanded && (
                    <div id={panelId} className="mt-4 space-y-4 border-t border-line pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-ink-soft">
                          At <span className="font-medium text-ink">{booking.venueName}</span>
                        </span>
                        <Link
                          href={`/spaces/${booking.venueSlug}?from=dashboard`}
                          className="text-xs font-semibold text-brass-dark hover:underline"
                        >
                          View the space →
                        </Link>
                      </div>

                      {booking.organizerNote && (
                        <div className="rounded-lg bg-paper-dim px-3.5 py-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                            Your note to the host
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{booking.organizerNote}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          Vendor requests
                        </p>
                        {!detail || detail.requests.length === 0 ? (
                          <p className="mt-1.5 text-sm text-ink-soft">
                            No vendor requests yet for this event.
                          </p>
                        ) : (
                          <ul className="mt-1.5 space-y-1.5">
                            {detail.requests.map((request) => (
                              <li key={request.id} className="flex flex-wrap justify-between gap-2 text-sm">
                                <span className="text-ink">{request.title}</span>
                                <span className="text-xs text-ink-soft">
                                  {request.phaseLabel} · {request.bidCount} bid
                                  {request.bidCount === 1 ? "" : "s"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {detail && detail.vendors.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                            Vendors
                          </p>
                          <ul className="mt-1.5 space-y-1.5">
                            {detail.vendors.map((vendor) => (
                              <li key={vendor.id} className="flex flex-wrap justify-between gap-2 text-sm">
                                <span className="text-ink">{vendor.name}</span>
                                <span className="text-xs text-ink-soft">{vendor.statusLabel}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
