"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import {
  getThreadsForParticipant,
  getMessagesForThread,
  getUnreadMessageCount,
  isProposalThread,
} from "@/lib/vendors/messages";
import { groupThreadsByBooking } from "@/lib/vendors/threadGrouping";
import { getEngagementById } from "@/lib/vendors/engagements";
import { getProposalById } from "@/lib/vendors/proposals";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getBookingById, formatEventLabel } from "@/lib/spaces/bookings";
import { BOOKING_STATUS_LABELS } from "@/lib/spaces/labels";
import { getEffectiveProposalStatus } from "@/lib/vendors/expiration";
import { ENGAGEMENT_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/vendors/labels";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { MessageThread } from "@/lib/types/vendors";

interface ThreadSummary {
  id: string;
  thread: MessageThread;
  otherName: string;
  contextLabel: string;
  statusLabel: string;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
}

interface EventGroup {
  groupKey: string;
  eventLabel: string;
  threads: ThreadSummary[];
  mostRecentAt: string;
}

export default function MessagesInboxPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [groups, setGroups] = useState<EventGroup[]>([]);

  const refresh = useCallback(() => {
    if (!user) return;
    const threads = getThreadsForParticipant(user.id);

    const resolved = threads.map((thread) => {
      const otherId = thread.organizerId === user.id ? thread.counterpartyId : thread.organizerId;
      const otherAccount = findAccountById(otherId);
      const messages = getMessagesForThread(thread.id);
      const last = messages[messages.length - 1];

      let contextLabel: string;
      let statusLabel: string;
      let bookingId: string | null;
      let eventLabel: string;

      if (isProposalThread(thread)) {
        const need = getEventNeedById(thread.eventNeedId);
        const engagement = thread.engagementId ? getEngagementById(thread.engagementId) : undefined;
        const proposal = getProposalById(thread.proposalId);
        statusLabel = engagement
          ? ENGAGEMENT_STATUS_LABELS[engagement.status]
          : proposal
            ? PROPOSAL_STATUS_LABELS[getEffectiveProposalStatus(proposal)]
            : "";
        contextLabel = need ? need.title : "Vendor request";
        bookingId = need?.bookingId ?? null;
        const booking = need ? getBookingById(need.bookingId) : undefined;
        eventLabel = booking ? formatEventLabel(booking) : "Vendor requests";
      } else {
        const booking = getBookingById(thread.bookingId);
        statusLabel = booking ? BOOKING_STATUS_LABELS[booking.status] : "";
        contextLabel = booking ? `Venue — ${booking.venueName}` : "Venue booking";
        bookingId = thread.bookingId;
        eventLabel = booking ? formatEventLabel(booking) : "Venue booking";
      }

      const summary: ThreadSummary = {
        id: thread.id,
        thread,
        otherName: otherAccount?.name.split(" ")[0] ?? "Foundry user",
        contextLabel,
        statusLabel,
        lastMessage: last?.body ?? "No messages yet",
        lastMessageAt: last?.createdAt ?? null,
        unread: getUnreadMessageCount(thread.id, user.id),
      };

      return { bookingId, eventLabel, summary };
    });

    const grouped = groupThreadsByBooking(
      resolved.map(({ bookingId, summary }) => ({ bookingId, item: summary }))
    );

    const groupList: EventGroup[] = grouped.map(({ groupKey, items }) => {
      const eventLabel = resolved.find((r) => r.summary.thread.id === items[0].thread.id)?.eventLabel ?? "";
      const sortedThreads = [...items].sort(
        (a, b) => new Date(b.lastMessageAt ?? b.thread.createdAt).getTime() - new Date(a.lastMessageAt ?? a.thread.createdAt).getTime()
      );
      const mostRecentAt = sortedThreads.reduce(
        (latest, t) => (t.lastMessageAt ?? t.thread.createdAt) > latest ? (t.lastMessageAt ?? t.thread.createdAt) : latest,
        sortedThreads[0]?.lastMessageAt ?? sortedThreads[0]?.thread.createdAt ?? ""
      );
      return { groupKey, eventLabel, threads: sortedThreads, mostRecentAt };
    });

    groupList.sort((a, b) => new Date(b.mostRecentAt).getTime() - new Date(a.mostRecentAt).getTime());
    setGroups(groupList);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading messages…" />;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Messages</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Grouped by event — start a conversation with a vendor from their proposal, or a venue host from an accepted booking.
      </p>

      <div className="mt-8 space-y-6">
        {groups.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            description="Start a conversation with a vendor from their proposal, or accept a booking to message a planner, to begin."
          />
        ) : (
          groups.map((group) => (
            <div key={group.groupKey}>
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{group.eventLabel}</h2>
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper">
                {group.threads.map(({ thread, otherName, contextLabel, statusLabel, lastMessage, unread }) => (
                  <li key={thread.id}>
                    <Link href={`/dashboard/messages/${thread.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-paper-dim">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {contextLabel} <span className="font-normal text-ink-soft">— {otherName}</span>
                        </p>
                        <p className="mt-0.5 truncate text-sm text-ink-soft">{lastMessage}</p>
                        {statusLabel && <p className="mt-0.5 text-xs text-brass-dark">{statusLabel}</p>}
                      </div>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-paper">
                          {unread}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
