"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import {
  getThreadsForParticipant,
  getMessagesForThread,
  getUnreadMessageCount,
  isEventThread,
  isProposalThread,
} from "@/lib/vendors/messages";
import { groupThreadsByBooking } from "@/lib/vendors/threadGrouping";
import { getEngagementById } from "@/lib/vendors/engagements";
import { getProposalById } from "@/lib/vendors/proposals";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getBookingById, getBookingsForOrganizer, formatEventLabel } from "@/lib/spaces/bookings";
import { ensureEventRoom } from "@/lib/spaces/eventRoom";
import { getEffectiveProposalStatus } from "@/lib/vendors/expiration";
import { getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import {
  resolveBookingTone,
  resolveEngagementTone,
  resolveProposalTone,
  type StatusDescriptor,
  type ViewerRole,
} from "@/lib/ui/statusTone";
import { summarizeTurn, type TurnSummary } from "@/lib/ui/whoseTurn";
import { formatRelativeListTime } from "@/lib/ui/format";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { MessageThread } from "@/lib/types/vendors";
import { INTERACTIVE_ROW } from "@/lib/ui/interactive";

interface ThreadSummary {
  id: string;
  thread: MessageThread;
  otherName: string;
  contextLabel: string;
  status: StatusDescriptor | null;
  /** What this thread is waiting on — see src/lib/ui/whoseTurn.ts. */
  turn: TurnSummary;
  lastMessage: string;
  lastMessageAt: string | null;
  unread: number;
  kind: FilterKey;
}

/**
 * The inbox filters.
 *
 * "Needs my reply" is the one that earns its place: with four conversations per
 * event across two events, the question a planner actually arrives with is
 * "what is waiting on me", and answering it meant opening every thread.
 */
type FilterKey = "venue" | "vendor" | "event";
type Filter = "all" | "mine" | FilterKey;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Needs my reply" },
  { key: "venue", label: "Venues" },
  { key: "vendor", label: "Vendors" },
  { key: "event", label: "Event rooms" },
];

interface EventGroup {
  groupKey: string;
  eventLabel: string;
  threads: ThreadSummary[];
  mostRecentAt: string;
}

/** "Priya, Marcus + 1 more" — the room's other members from this viewer's seat. */
function describeRoomMembers(participantIds: string[], viewerId: string, organizerId: string): string {
  const names = [organizerId, ...participantIds]
    .filter((id, index, all) => id !== viewerId && all.indexOf(id) === index)
    .map((id) => findAccountById(id)?.name.split(" ")[0] ?? "Foundry user");

  if (names.length === 0) return "Just you so far";
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, 2).join(", ")} + ${names.length - 2} more`;
}

export default function MessagesInboxPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [groups, setGroups] = useState<EventGroup[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const refresh = useCallback(() => {
    if (!user) return;

    /*
     * The event room is meant to be simply *there* once a vendor confirms —
     * there's no button that opens one. Doing it here as well as on the vendor's
     * confirm action means a planner finds the conversation waiting in their
     * inbox rather than depending on which page someone happened to load.
     * Idempotent and quiet: no-ops unless the booking is confirmed, the venue
     * has a host account, and a vendor has confirmed.
     */
    for (const booking of getBookingsForOrganizer(user.id)) {
      if (booking.status === "confirmed") ensureEventRoom(booking.id);
    }

    const threads = getThreadsForParticipant(user.id);

    const resolved = threads.map((thread) => {
      const messages = getMessagesForThread(thread.id);
      const last = messages[messages.length - 1];

      // An event room has no single "other person" — name the room by who's in
      // it instead of arbitrarily picking one participant.
      const otherName = isEventThread(thread)
        ? describeRoomMembers(thread.participantIds, user.id, thread.organizerId)
        : (findAccountById(thread.organizerId === user.id ? thread.counterpartyId : thread.organizerId)?.name.split(
            " "
          )[0] ?? "Foundry user");

      let contextLabel: string;
      let status: StatusDescriptor | null;
      let bookingId: string | null;
      let eventLabel: string;
      let kind: FilterKey;

      /*
       * The viewer's seat in THIS thread, which is what the tone mapping and
       * whose-turn both key on. A venue operator hosts a booking thread but is
       * only a participant in an event room, so it can't be read off their
       * app-wide role — same rule MessageThreadView follows.
       */
      const roleOf = (accountId: string): ViewerRole => {
        if (accountId === thread.organizerId) return "organizer";
        return getVendorProfileByOwnerId(accountId) ? "vendor" : "venue_operator";
      };
      const viewerRole = roleOf(user.id);
      const nameOf = (accountId: string) =>
        findAccountById(accountId)?.name.split(" ")[0] ?? "Foundry user";

      let engagementStatusForTurn: Parameters<typeof summarizeTurn>[0]["engagementStatus"] = null;

      if (isEventThread(thread)) {
        const booking = getBookingById(thread.bookingId);
        status = booking ? resolveBookingTone(booking.status, viewerRole) : null;
        contextLabel = "Event room";
        bookingId = thread.bookingId;
        eventLabel = booking ? formatEventLabel(booking) : "Event room";
        kind = "event";
      } else if (isProposalThread(thread)) {
        const need = getEventNeedById(thread.eventNeedId);
        const engagement = thread.engagementId ? getEngagementById(thread.engagementId) : undefined;
        const proposal = getProposalById(thread.proposalId);
        status = engagement
          ? resolveEngagementTone(engagement.status, viewerRole)
          : proposal
            ? resolveProposalTone(getEffectiveProposalStatus(proposal), viewerRole)
            : null;
        engagementStatusForTurn = engagement?.status ?? null;
        contextLabel = need ? need.title : "Vendor request";
        bookingId = need?.bookingId ?? null;
        const booking = need ? getBookingById(need.bookingId) : undefined;
        eventLabel = booking ? formatEventLabel(booking) : "Vendor requests";
        kind = "vendor";
      } else {
        const booking = getBookingById(thread.bookingId);
        status = booking ? resolveBookingTone(booking.status, viewerRole) : null;
        contextLabel = booking ? `Venue — ${booking.venueName}` : "Venue booking";
        bookingId = thread.bookingId;
        eventLabel = booking ? formatEventLabel(booking) : "Venue booking";
        kind = "venue";
      }

      const turn = summarizeTurn({
        messages,
        viewer: viewerRole,
        senderRoleOf: roleOf,
        senderNameOf: nameOf,
        engagementStatus: engagementStatusForTurn,
      });

      const summary: ThreadSummary = {
        id: thread.id,
        thread,
        otherName,
        contextLabel,
        status,
        turn,
        lastMessage: last?.body ?? "No messages yet",
        lastMessageAt: last?.createdAt ?? null,
        unread: getUnreadMessageCount(thread.id, user.id),
        kind,
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

  /*
   * Filtering happens per thread, then empty groups are dropped — an event
   * whose only conversation is filtered out shouldn't leave its heading behind
   * with nothing under it.
   */
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      threads: group.threads.filter((summary) => {
        if (filter === "all") return true;
        if (filter === "mine") return summary.turn.isViewersTurn;
        return summary.kind === filter;
      }),
    }))
    .filter((group) => group.threads.length > 0);

  const needsReplyCount = groups.reduce(
    (total, group) => total + group.threads.filter((summary) => summary.turn.isViewersTurn).length,
    0
  );

  if (authLoading || !loaded) {
    return <LoadingState label="Loading messages…" />;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Messages</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Grouped by event. Once a booking is confirmed, you and the venue can message each other here — plus any
        vendor you&apos;ve started a conversation with.
      </p>

      {/*
        Filters, with the count on "Needs my reply" because that's the number
        someone opening this page is actually looking for.
      */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          const count = key === "mine" ? needsReplyCount : null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-ink text-paper"
                  : "border border-line bg-paper text-ink-soft hover:border-brass hover:text-ink"
              }`}
            >
              {label}
              {count !== null && count > 0 && (
                <span
                  className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    active ? "bg-paper text-ink" : "bg-act text-paper"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-6">
        {visibleGroups.length === 0 ? (
          groups.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              description="Book a venue — the conversation with your host opens as soon as they confirm. Vendor conversations start from their proposal."
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
            /* A filter matching nothing is a different situation from an empty
               inbox, and offering "Discover spaces" here would be a non-sequitur. */
            <EmptyState
              title={filter === "mine" ? "Nothing waiting on you" : "No conversations in this view"}
              description={
                filter === "mine"
                  ? "Every conversation is up to date — anything you owe someone an answer on will show up here."
                  : "Try another filter to see the rest of your conversations."
              }
              action={
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
                >
                  Show all conversations
                </button>
              }
            />
          )
        ) : (
          visibleGroups.map((group) => (
            <div key={group.groupKey}>
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{group.eventLabel}</h2>
              <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-paper">
                {group.threads.map(
                  ({ thread, otherName, contextLabel, status, turn, lastMessage, lastMessageAt, unread }) => (
                    <li key={thread.id}>
                      <Link
                        href={`/dashboard/messages/${thread.id}`}
                        className={`flex items-start justify-between gap-3 px-5 py-4 ${INTERACTIVE_ROW}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2">
                            {/*
                              Unread carries weight, not just a counter on the
                              right. A bolded row and a dot are readable while
                              scanning a list; a number on the far edge isn't.
                            */}
                            {unread > 0 && (
                              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-act" />
                            )}
                            <span className={`truncate ${unread > 0 ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                              {contextLabel}
                            </span>
                            <span className="shrink-0 text-sm font-normal text-ink-soft">— {otherName}</span>
                          </p>
                          <p
                            className={`mt-0.5 truncate text-sm ${
                              unread > 0 ? "font-medium text-ink" : "text-ink-soft"
                            }`}
                          >
                            {lastMessage}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            {/*
                              The whose-turn badge beats the raw state when
                              there is one: "Your signature needed" is more use
                              than "Confirmed".
                            */}
                            {turn.status ? <StatusBadge descriptor={turn.status} /> : status ? <StatusBadge descriptor={status} /> : null}
                            {turn.detail && <span className="text-xs text-ink-soft">{turn.detail}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {/* Already computed for sorting; it was never shown,
                              so every conversation looked equally recent. */}
                          <span className="text-xs text-ink-soft">{formatRelativeListTime(lastMessageAt)}</span>
                          {unread > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-paper">
                              {unread}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
