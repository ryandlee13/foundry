"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EVENT_ROOM_BLOCK_COPY,
  getEventRoomReadiness,
  openEventRoom,
  type EventRoomReadiness,
} from "@/lib/spaces/eventRoom";
import { getEventThreadForBooking, getUnreadMessageCount } from "@/lib/vendors/messages";

/**
 * The organizer's way into the three-way room for one event.
 *
 * Lives on the Find Vendors page because that's where a planner already is
 * when they've just confirmed a vendor — the moment they'd otherwise start a
 * group text to introduce them to the venue.
 *
 * Shows why it isn't available yet rather than hiding: "you can do this once a
 * vendor confirms" is useful, a missing button isn't.
 */
export default function EventRoomPanel({ bookingId, userId }: { bookingId: string; userId: string }) {
  const router = useRouter();
  const [readiness, setReadiness] = useState<EventRoomReadiness | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setReadiness(getEventRoomReadiness(bookingId, userId));
    const thread = getEventThreadForBooking(bookingId);
    setThreadId(thread?.id ?? null);
    setUnread(thread ? getUnreadMessageCount(thread.id, userId) : 0);
  }, [bookingId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (!readiness) return null;
  // Someone who isn't the organizer has no business seeing this control at all.
  if (readiness.reason === "not_organizer") return null;

  function handleOpen() {
    try {
      // Re-callable on purpose: it syncs in anyone who confirmed since the
      // room was created, so hiring a second vendor later just works.
      const { thread } = openEventRoom(bookingId, userId);
      router.push(`/dashboard/messages/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the event room.");
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-paper px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold text-ink">Event room</p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {threadId
              ? "Your venue and confirmed vendors, all in one conversation."
              : readiness.ready
                ? "Introduce your venue and your confirmed vendors to each other, so load-in and timing get sorted in one place."
                : EVENT_ROOM_BLOCK_COPY[readiness.reason ?? "no_confirmed_vendor"]}
          </p>
        </div>

        {(readiness.ready || threadId) && (
          <button
            type="button"
            onClick={threadId ? () => router.push(`/dashboard/messages/${threadId}`) : handleOpen}
            className="shrink-0 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            {threadId ? "Go to event room" : "Open event room"}
            {unread > 0 && (
              <span className="ml-2 rounded-full bg-paper px-1.5 text-[11px] font-bold text-wine">{unread}</span>
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-wine">{error}</p>}
    </div>
  );
}
