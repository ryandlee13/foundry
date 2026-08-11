"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOwnedVenuesData } from "@/hooks/useOwnedVenuesData";
import { acceptBookingRequest, declineBookingRequest, startBookingConversation } from "@/lib/spaces/bookingWorkflow";
import { getBillingActivationForOwner } from "@/lib/spaces/venueBilling";
import BookingRequestReviewModal from "@/components/dashboard/BookingRequestReviewModal";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, Venue } from "@/lib/types/spaces";

function formatLiveSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function VenueDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { loaded, venues, bookingsByVenue, threadIdByBooking, unreadByBooking, refresh } = useOwnedVenuesData(user?.id);
  const [reviewing, setReviewing] = useState<{ booking: Booking; venue: Venue } | null>(null);

  const billingActivation = user ? getBillingActivationForOwner(user.id) : undefined;

  const pendingByVenue = venues.map((venue) => ({
    venue,
    pending: (bookingsByVenue[venue.id] ?? []).filter((b) => b.status === "pending"),
  }));
  const allPending = pendingByVenue.flatMap((entry) =>
    entry.pending.map((booking) => ({ booking, venue: entry.venue }))
  );

  function handleAccept() {
    if (!reviewing) return;
    acceptBookingRequest(reviewing.booking.id);
    refresh();
    setReviewing(null);
  }

  function handleDecline() {
    if (!reviewing) return;
    declineBookingRequest(reviewing.booking.id);
    refresh();
    setReviewing(null);
  }

  function handleGoToMessages(bookingId: string) {
    if (!user) return;
    const existingThreadId = threadIdByBooking[bookingId];
    if (existingThreadId) {
      router.push(`/dashboard/messages/${existingThreadId}`);
      return;
    }
    try {
      const { thread } = startBookingConversation(bookingId, user.id);
      router.push(`/dashboard/messages/${thread.id}`);
    } catch {
      // Swallow — the button is only rendered for confirmed bookings the
      // owner actually owns, so this should be unreachable in practice.
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Venue dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Your listings and the bookings against them. Listings go live immediately in this
            prototype — there&apos;s no admin review step yet.
          </p>
        </div>
        {loaded && venues.length > 0 && (
          <Link
            href="/list-your-venue"
            className="shrink-0 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            List another space
          </Link>
        )}
      </div>

      <div className="mt-8">
        {!loaded ? (
          <LoadingState label="Loading your listings…" />
        ) : venues.length === 0 ? (
          <EmptyState
            title="No venue listings yet"
            description="Submit a venue to start receiving bookings."
            action={
              <Link
                href="/list-your-venue"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                List your venue
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {allPending.length > 0 && (
              <div className="rounded-2xl border border-brass/40 bg-brass/5 p-6">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-wine text-xs font-bold text-paper">
                    {allPending.length}
                  </span>
                  <p className="font-display text-lg font-semibold text-ink">
                    {allPending.length === 1
                      ? "Booking request waiting on you"
                      : "Booking requests waiting on you"}
                  </p>
                </div>
                <ul className="mt-4 space-y-2">
                  {allPending.map(({ booking, venue }) => (
                    <li
                      key={booking.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-paper px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {booking.organizerName} · {venue.name}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {booking.eventDate} · {booking.startTime}–{booking.endTime} ·{" "}
                          {booking.attendees} guests
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewing({ booking, venue })}
                        className="shrink-0 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
                      >
                        Review
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {venues.map((venue) => {
              const confirmed = (bookingsByVenue[venue.id] ?? []).filter(
                (b) => b.status === "confirmed"
              );
              return (
                <div key={venue.id} className="rounded-2xl border border-line bg-paper p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/spaces/${venue.slug}`}
                        className="font-display text-lg font-semibold text-ink hover:underline"
                      >
                        {venue.name}
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {venue.neighborhood}, {venue.city}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        Live since {formatLiveSince(venue.publishedAt ?? venue.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-brass/15 px-2.5 py-1 text-xs font-semibold text-brass-dark">
                        Live
                      </span>
                      <Link
                        href={`/dashboard/venue/listings/${venue.id}`}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-line pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Upcoming bookings
                    </p>
                    {confirmed.length === 0 ? (
                      <p className="mt-2 text-sm text-ink-soft">No confirmed bookings yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {confirmed.map((booking) => {
                          const unread = unreadByBooking[booking.id] ?? 0;
                          const hasThread = Boolean(threadIdByBooking[booking.id]);
                          return (
                            <li
                              key={booking.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper-dim px-3.5 py-2.5 text-sm"
                            >
                              <div>
                                <span className="text-ink">
                                  {booking.eventDate} · {booking.startTime}–{booking.endTime}
                                </span>
                                <span className="ml-2 text-ink-soft">
                                  {booking.organizerName} · {booking.attendees} guests
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleGoToMessages(booking.id)}
                                className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                              >
                                {hasThread ? "Open conversation" : "Go to messages"}
                                {unread > 0 && (
                                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[10px] font-bold text-paper">
                                    {unread}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}

            {billingActivation && (
              <p className="text-center text-xs text-ink-soft">
                Listing subscription active since {formatLiveSince(billingActivation.activatedAt)} · price not set
                yet · nothing is charged in this prototype.
              </p>
            )}
          </div>
        )}
      </div>

      <BookingRequestReviewModal
        booking={reviewing?.booking ?? null}
        venue={reviewing?.venue ?? null}
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    </div>
  );
}
