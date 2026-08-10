"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingById, formatEventLabel } from "@/lib/spaces/bookings";
import { getVenueBySlugAnywhere } from "@/lib/spaces/submittedVenues";
import {
  getEventNeedsForBooking,
  pauseEventNeed,
  resumeEventNeed,
  closeEventNeed,
  cancelEventNeed,
  computeEventNeedPhase,
} from "@/lib/vendors/eventNeeds";
import { publishEventNeedAndNotifyVendors } from "@/lib/vendors/publishing";
import { getProposalsForNeed, ensureExpiringDiscussionNotificationsForOrganizer } from "@/lib/vendors/proposals";
import { getEngagementsForBooking, completeEngagement, cancelEngagementByOrganizer } from "@/lib/vendors/engagements";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { getThreadForEngagement, getUnreadMessageCount } from "@/lib/vendors/messages";
import { getSkillName } from "@/lib/vendors/skills";
import { formatDeadlineDate } from "@/lib/vendors/expiration";
import { EVENT_NEED_STATUS_LABELS, ENGAGEMENT_STATUS_LABELS, EVENT_NEED_PHASE_LABELS } from "@/lib/vendors/labels";
import Dialog from "@/components/ui/Dialog";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import FindVendorsPrompt from "./FindVendorsPrompt";
import VendorNeedsBuilder from "./VendorNeedsBuilder";
import type { Booking } from "@/lib/types/spaces";
import type { EngagementStatus, EventNeed, EventNeedStatus, VendorEngagement, VendorProfile } from "@/lib/types/vendors";

const STATUS_STYLES: Record<EventNeedStatus, string> = {
  draft: "bg-paper-dim text-ink-soft",
  published: "bg-green-100 text-green-800",
  paused: "bg-brass/15 text-brass-dark",
  filled: "bg-brass/15 text-brass-dark",
  closed: "bg-paper-dim text-ink-soft",
  canceled: "bg-wine/10 text-wine",
};

const ENGAGEMENT_STATUS_STYLES: Record<EngagementStatus, string> = {
  confirmed: "bg-brass/15 text-brass-dark",
  in_progress: "bg-brass/15 text-brass-dark",
  completed: "bg-green-100 text-green-800",
  canceled_by_organizer: "bg-wine/10 text-wine",
  canceled_by_vendor: "bg-wine/10 text-wine",
  disputed: "bg-wine/10 text-wine",
};

export default function OrganizerVendorRequestsPage({ bookingId }: { bookingId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [publicLocation, setPublicLocation] = useState("San Francisco");
  const [coordinates, setCoordinates] = useState({ lat: 37.7749, lng: -122.4194 });
  const [needs, setNeeds] = useState<EventNeed[]>([]);
  const [bidCounts, setBidCounts] = useState<Record<string, number>>({});
  const [engagements, setEngagements] = useState<VendorEngagement[]>([]);
  const [vendorsById, setVendorsById] = useState<Record<string, VendorProfile>>({});
  const [unreadByEngagement, setUnreadByEngagement] = useState<Record<string, number>>({});
  const [threadIdByEngagement, setThreadIdByEngagement] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);

  const refresh = useCallback(() => {
    if (!user) return;
    const found = getBookingById(bookingId);
    setBooking(found ?? null);
    if (found) {
      ensureExpiringDiscussionNotificationsForOrganizer(user.id);
      const venue = getVenueBySlugAnywhere(found.venueSlug);
      if (venue) {
        setPublicLocation(venue.neighborhood);
        setCoordinates(venue.coordinates);
      }
      const list = getEventNeedsForBooking(bookingId);
      setNeeds(list);
      const counts: Record<string, number> = {};
      for (const need of list) counts[need.id] = getProposalsForNeed(need.id).length;
      setBidCounts(counts);

      const roster = getEngagementsForBooking(bookingId);
      setEngagements(roster);
      const vendors: Record<string, VendorProfile> = {};
      const unread: Record<string, number> = {};
      const threadIds: Record<string, string> = {};
      for (const engagement of roster) {
        const vendor = getVendorProfileById(engagement.vendorProfileId);
        if (vendor) vendors[engagement.id] = vendor;
        const thread = getThreadForEngagement(engagement.id);
        if (thread) {
          unread[engagement.id] = getUnreadMessageCount(thread.id, user.id);
          threadIds[engagement.id] = thread.id;
        }
      }
      setVendorsById(vendors);
      setUnreadByEngagement(unread);
      setThreadIdByEngagement(threadIds);
    }
    setLoaded(true);
  }, [user, bookingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading vendor requests…" />;
  }

  if (!user) return null;

  if (!booking) {
    return <ErrorState title="Booking not found" description="This booking may have been removed." />;
  }

  if (booking.organizerId !== user.id) {
    return <ErrorState title="Not authorized" description="You can only manage vendor requests for your own bookings." />;
  }

  function handleAction(needId: string, action: "publish" | "pause" | "resume" | "close" | "cancel") {
    if (action === "publish") publishEventNeedAndNotifyVendors(needId);
    if (action === "pause") pauseEventNeed(needId);
    if (action === "resume") resumeEventNeed(needId);
    if (action === "close") closeEventNeed(needId);
    if (action === "cancel") cancelEventNeed(needId);
    refresh();
  }

  function handleMarkComplete(engagementId: string) {
    completeEngagement(engagementId);
    refresh();
  }

  function handleCancelEngagement(engagementId: string) {
    cancelEngagementByOrganizer(engagementId);
    refresh();
  }

  return (
    <div>
      <Link href="/dashboard/organizer" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to organizer dashboard
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Find vendors</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatEventLabel(booking)} · {booking.startTime}–{booking.endTime}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Looking for a ___
        </button>
      </div>

      <div className="mt-6">
        <FindVendorsPrompt booking={booking} onOpenBuilder={() => setFormOpen(true)} />
      </div>

      <div className="mt-8">
        {needs.length === 0 ? (
          <EmptyState
            title="No vendor requests yet"
            description={`Post "Looking for a ___" to start receiving proposals from matching vendors.`}
          />
        ) : (
          <ul className="space-y-3">
            {needs.map((need) => (
              <li key={need.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-ink">
                      {need.title || `Looking for a ${getSkillName(need.skillSlug)}`}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {getSkillName(need.skillSlug)} · {need.positionsFilled}/{need.positionsAvailable} filled ·{" "}
                      {bidCounts[need.id] ?? 0} bid{(bidCounts[need.id] ?? 0) === 1 ? "" : "s"} · Proposals due{" "}
                      {formatDeadlineDate(need.proposalDeadline)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-brass-dark">
                      {EVENT_NEED_PHASE_LABELS[computeEventNeedPhase(need, getProposalsForNeed(need.id))]}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[need.status]}`}>
                    {EVENT_NEED_STATUS_LABELS[need.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/organizer/bookings/${bookingId}/vendors/${need.id}/proposals`}
                    className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                  >
                    View proposals
                  </Link>
                  {need.status === "draft" && (
                    <button type="button" onClick={() => handleAction(need.id, "publish")} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                      Publish
                    </button>
                  )}
                  {need.status === "published" && (
                    <button type="button" onClick={() => handleAction(need.id, "pause")} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                      Pause
                    </button>
                  )}
                  {need.status === "paused" && (
                    <button type="button" onClick={() => handleAction(need.id, "resume")} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                      Resume
                    </button>
                  )}
                  {(need.status === "published" || need.status === "paused") && (
                    <button type="button" onClick={() => handleAction(need.id, "close")} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                      Close
                    </button>
                  )}
                  {need.status !== "canceled" && need.status !== "filled" && need.status !== "closed" && (
                    <button type="button" onClick={() => handleAction(need.id, "cancel")} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine transition-colors hover:bg-wine/5">
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {engagements.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">Vendor roster</h2>
          <ul className="mt-3 space-y-3">
            {engagements.map((engagement) => {
              const vendor = vendorsById[engagement.id];
              const unread = unreadByEngagement[engagement.id] ?? 0;
              return (
                <li key={engagement.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold text-ink">{vendor?.displayName ?? "Vendor"}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        ${engagement.agreedAmount} · {engagement.eventNeedId in bidCounts ? getSkillName(needs.find((n) => n.id === engagement.eventNeedId)?.skillSlug ?? "other") : ""}
                        {unread > 0 && ` · ${unread} unread message${unread === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${ENGAGEMENT_STATUS_STYLES[engagement.status]}`}>
                      {ENGAGEMENT_STATUS_LABELS[engagement.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {threadIdByEngagement[engagement.id] && (
                      <Link href={`/dashboard/messages/${threadIdByEngagement[engagement.id]}`} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                        Message
                      </Link>
                    )}
                    {(engagement.status === "confirmed" || engagement.status === "in_progress") && (
                      <>
                        <button type="button" onClick={() => handleMarkComplete(engagement.id)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                          Mark complete
                        </button>
                        <button type="button" onClick={() => handleCancelEngagement(engagement.id)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine transition-colors hover:bg-wine/5">
                          Cancel
                        </button>
                      </>
                    )}
                    {engagement.status === "completed" && (
                      <Link href={`/dashboard/organizer/reviews/${engagement.id}`} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                        Leave a review
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} labelledBy="vendor-request-form-title" panelClassName="w-full max-w-xl p-6 sm:p-8">
        <h2 id="vendor-request-form-title" className="font-display text-xl font-semibold text-ink">
          Find vendors
        </h2>
        <div className="mt-4">
          <VendorNeedsBuilder
            booking={booking}
            organizerId={user.id}
            publicLocation={publicLocation}
            coordinates={coordinates}
            eventLabel={formatEventLabel(booking)}
            onDone={() => {
              setFormOpen(false);
              refresh();
            }}
            onCancel={() => setFormOpen(false)}
          />
        </div>
      </Dialog>
    </div>
  );
}
