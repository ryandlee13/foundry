"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import { getBookingById } from "@/lib/spaces/bookings";
import { getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import { getEngagementsForVendor, cancelEngagementByVendor } from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getThreadForEngagement, getUnreadMessageCount } from "@/lib/vendors/messages";
import { getSkillName } from "@/lib/vendors/skills";
import { ENGAGEMENT_STATUS_LABELS } from "@/lib/vendors/labels";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { Booking } from "@/lib/types/spaces";
import type { EngagementStatus, EventNeed, VendorEngagement } from "@/lib/types/vendors";

const STATUS_STYLES: Record<EngagementStatus, string> = {
  confirmed: "bg-brass/15 text-brass-dark",
  in_progress: "bg-brass/15 text-brass-dark",
  completed: "bg-green-100 text-green-800",
  canceled_by_organizer: "bg-wine/10 text-wine",
  canceled_by_vendor: "bg-wine/10 text-wine",
  disputed: "bg-wine/10 text-wine",
};

export default function VendorConfirmedGigsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [engagements, setEngagements] = useState<VendorEngagement[]>([]);
  const [needsById, setNeedsById] = useState<Record<string, EventNeed>>({});
  const [bookingsById, setBookingsById] = useState<Record<string, Booking>>({});
  const [threadIdByEngagement, setThreadIdByEngagement] = useState<Record<string, string>>({});
  const [unreadByEngagement, setUnreadByEngagement] = useState<Record<string, number>>({});

  const refresh = useCallback(() => {
    if (!user) return;
    const profile = getVendorProfileByOwnerId(user.id);
    if (!profile) {
      setLoaded(true);
      return;
    }
    const list = getEngagementsForVendor(profile.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setEngagements(list);

    const needs: Record<string, EventNeed> = {};
    const bookings: Record<string, Booking> = {};
    const threadIds: Record<string, string> = {};
    const unread: Record<string, number> = {};
    for (const engagement of list) {
      const need = getEventNeedById(engagement.eventNeedId);
      if (need) needs[engagement.id] = need;
      const booking = getBookingById(engagement.bookingId);
      if (booking) bookings[engagement.id] = booking;
      const thread = getThreadForEngagement(engagement.id);
      if (thread) {
        threadIds[engagement.id] = thread.id;
        unread[engagement.id] = getUnreadMessageCount(thread.id, user.id);
      }
    }
    setNeedsById(needs);
    setBookingsById(bookings);
    setThreadIdByEngagement(threadIds);
    setUnreadByEngagement(unread);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading your confirmed gigs…" />;
  }

  function handleCancel(engagementId: string) {
    cancelEngagementByVendor(engagementId);
    refresh();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Confirmed gigs</h1>
      <p className="mt-1 text-sm text-ink-soft">Engagements from accepted proposals.</p>

      <div className="mt-8">
        {engagements.length === 0 ? (
          <EmptyState
            title="No confirmed gigs yet"
            description="Once an organizer accepts one of your proposals, it'll show up here."
            action={
              <Link href="/dashboard/vendor/gigs" className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
                Discover gigs
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {engagements.map((engagement) => {
              const need = needsById[engagement.id];
              const booking = bookingsById[engagement.id];
              const organizer = findAccountById(engagement.organizerId);
              const unread = unreadByEngagement[engagement.id] ?? 0;
              const threadId = threadIdByEngagement[engagement.id];

              return (
                <li key={engagement.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold text-ink">
                        {need?.title ?? (need ? getSkillName(need.skillSlug) : "Engagement")}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        ${engagement.agreedAmount} · {booking ? `${booking.eventDate} · ${booking.startTime}–${booking.endTime}` : ""}
                        {organizer && ` · Organized by ${organizer.name.split(" ")[0]}`}
                        {unread > 0 && ` · ${unread} unread message${unread === 1 ? "" : "s"}`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[engagement.status]}`}>
                      {ENGAGEMENT_STATUS_LABELS[engagement.status]}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {threadId && (
                      <Link href={`/dashboard/messages/${threadId}`} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim">
                        Message
                      </Link>
                    )}
                    {(engagement.status === "confirmed" || engagement.status === "in_progress") && (
                      <button
                        type="button"
                        onClick={() => handleCancel(engagement.id)}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine transition-colors hover:bg-wine/5"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
