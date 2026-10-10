"use client";

import { attachmentKindOf, groupMessages } from "@/lib/vendors/messageGroups";
import { formatChatTime, formatDaySeparator, initialsFor } from "@/lib/ui/format";
import type { ChatMessage } from "@/lib/types/vendors";

/**
 * The conversation itself: days, then clusters, then bubbles.
 *
 * Split out of MessageThreadView because that file owns the thread's data and
 * every action on it, and the rendering of the stream is a self-contained job
 * that only needs messages and a way to name a sender.
 *
 * Grouping is done by `groupMessages()` (pure, tested) rather than inline, so
 * the clustering rules — same sender, five minutes, never across midnight,
 * attachments stand alone — can be reasoned about without a browser.
 */

/** Where someone sits in *this* thread, which is not their app-wide role. */
export interface ThreadSeat {
  kind: "planner" | "venue" | "vendor";
  /** "Planner", "Venue", "Vendor · DJ" — the chip text. */
  label: string;
}

const SEAT_CLASSES: Record<ThreadSeat["kind"], string> = {
  planner: "bg-wine/10 text-wine",
  venue: "bg-brass/15 text-brass-dark",
  vendor: "bg-ok-bg text-ok",
};

function Avatar({ name, seat }: { name: string; seat: ThreadSeat | null }) {
  return (
    <span
      aria-hidden
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
        seat ? SEAT_CLASSES[seat.kind] : "bg-paper-dim text-ink-soft"
      }`}
    >
      {initialsFor(name)}
    </span>
  );
}

export default function MessageStream({
  messages,
  viewerId,
  nameFor,
  seatFor,
  showSenders,
  onJumpToOffer,
}: {
  messages: ChatMessage[];
  viewerId: string;
  nameFor: (accountId: string) => string;
  /** Null for a 1:1 thread, where who's speaking is never ambiguous. */
  seatFor: ((accountId: string) => ThreadSeat | null) | null;
  /**
   * Event rooms only. A 1:1 thread doesn't need a name over every cluster —
   * there are two people in it and the bubble's side already says which.
   */
  showSenders: boolean;
  onJumpToOffer: (messageId: string) => void;
}) {
  const days = groupMessages(messages);

  return (
    <div className="space-y-5">
      {days.map((day) => (
        <div key={day.dayKey}>
          {/*
            A date heading per day, so the bubbles don't each have to carry one.
            That repetition is what made the stream read as a log.
          */}
          <div className="flex items-center gap-3" role="separator">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              {formatDaySeparator(day.representativeAt)}
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-4 space-y-3">
            {day.clusters.map((cluster) => {
              const isMine = cluster.senderId === viewerId;
              const senderName = nameFor(cluster.senderId);
              const seat = seatFor ? seatFor(cluster.senderId) : null;

              return (
                <div
                  key={cluster.id}
                  className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                >
                  {showSenders && !isMine && <Avatar name={senderName} seat={seat} />}

                  <div className={`flex min-w-0 max-w-[78%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                    {/*
                      Named once per cluster, with the role beside it. A
                      four-person room with an unlabelled 11px name was the
                      hardest thing in the app to scan — "is the venue or the
                      DJ asking about load-in?" took re-reading the message.
                    */}
                    {showSenders && !isMine && (
                      <p className="mb-1 flex items-center gap-1.5 px-1">
                        <span className="text-[11px] font-semibold text-ink">{senderName}</span>
                        {seat && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${SEAT_CLASSES[seat.kind]}`}
                          >
                            {seat.label}
                          </span>
                        )}
                      </p>
                    )}

                    <div className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>
                      {cluster.messages.map((message) => {
                        const attachment = attachmentKindOf(message);
                        return (
                          <div
                            key={message.id}
                            /*
                              The exact time lives on `title` rather than on
                              screen: available when someone actually wants it,
                              absent the other 99% of the time.
                            */
                            title={new Date(message.createdAt).toLocaleString()}
                            className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                              isMine ? "bg-wine text-paper" : "bg-paper-dim text-ink"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>

                            {attachment && (
                              /*
                                A button, not a label. The card with the actual
                                numbers is in the offers column; this jumps to
                                it and flashes it, so a pointer that used to be
                                inert text now does the thing it describes.
                              */
                              <button
                                type="button"
                                onClick={() => onJumpToOffer(message.id)}
                                aria-label="Show this in Offers and agreements"
                                className={`mt-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold underline-offset-2 transition-colors hover:underline ${
                                  isMine ? "text-paper/90 hover:text-paper" : "text-brass-dark"
                                }`}
                              >
                                {attachment === "contract"
                                  ? "View the agreement"
                                  : attachment === "deal"
                                    ? "View these terms"
                                    : "View this offer"}
                                <span aria-hidden>→</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* One timestamp for the cluster, not one per message. */}
                    <p className="mt-1 px-1 text-[10px] text-ink-soft">{formatChatTime(cluster.startedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
