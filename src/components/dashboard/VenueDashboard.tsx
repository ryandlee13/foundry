"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useOwnedVenuesData } from "@/hooks/useOwnedVenuesData";
import { computeVenueEarnings, selectUpcomingBookings } from "@/lib/spaces/venueEarnings";
import { getBillingActivationForOwner, VENUE_SUBSCRIPTION_PLACEHOLDER_COPY } from "@/lib/spaces/venueBilling";
import KpiCard from "./KpiCard";
import UpcomingEventCard from "./UpcomingEventCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export default function VenueDashboard({ accountId }: { accountId: string }) {
  const { loaded, venues, bookingsByVenue, pendingCount } = useOwnedVenuesData(accountId);
  const [todayIso, setTodayIso] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayIso(new Date().toISOString().slice(0, 10));
  }, []);

  if (!loaded || !todayIso) return <LoadingState label="Loading your listings…" />;

  if (venues.length === 0) {
    return (
      <EmptyState
        title="No listings yet"
        description="List your space to start receiving booking requests from organizers."
        action={
          <Link
            href="/list-your-venue"
            className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            List a place
          </Link>
        }
      />
    );
  }

  const allBookings = Object.values(bookingsByVenue).flat();
  const venuesById = Object.fromEntries(venues.map((venue) => [venue.id, venue]));
  const earnings = computeVenueEarnings(allBookings, venuesById, todayIso);
  const upcoming = selectUpcomingBookings(allBookings, todayIso);
  const billingActivation = getBillingActivationForOwner(accountId);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Estimated this month"
          value={formatMoney(earnings.monthAmount)}
          footnote={`${earnings.monthBookingCount} event${earnings.monthBookingCount === 1 ? "" : "s"} · estimated from your hourly rate`}
        />
        <KpiCard
          label="Estimated all time"
          value={formatMoney(earnings.totalAmount)}
          footnote={`Across ${earnings.totalBookingCount} completed booking${earnings.totalBookingCount === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Booking requests"
          value={pendingCount}
          footnote={pendingCount > 0 ? "Waiting on your response." : "Nothing waiting on you."}
          href="/dashboard/venue"
        />
      </div>

      <p className="rounded-xl border border-dashed border-line px-4 py-3 text-xs leading-relaxed text-ink-soft">
        Earnings are an <span className="font-semibold text-ink">estimate</span> — this prototype has no quote or
        payment step yet, so figures are calculated from each listing&apos;s hourly rate and the hours actually
        booked, not from money collected.
      </p>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Upcoming events</h2>
          <Link
            href="/list-your-venue"
            className="rounded-full bg-wine px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            List another space
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
            No confirmed bookings on the calendar yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {upcoming.map((booking) => (
              <UpcomingEventCard key={booking.id} booking={booking} venue={venuesById[booking.venueId]} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Subscription</h2>
        {billingActivation ? (
          <>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-ink">
              <span className="rounded-full bg-brass/15 px-2.5 py-0.5 text-xs font-semibold text-brass-dark">
                Active
              </span>
              since{" "}
              {new Date(billingActivation.activatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Price to be announced — nothing is charged in this prototype.
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm text-ink-soft">{VENUE_SUBSCRIPTION_PLACEHOLDER_COPY}</p>
        )}
      </section>
    </div>
  );
}
