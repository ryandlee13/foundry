"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getVendorProfileByOwnerId,
  publishVendorProfile,
  unpublishVendorProfile,
  canToggleOwnVisibility,
} from "@/lib/vendors/profiles";
import { getEngagementsForVendor } from "@/lib/vendors/engagements";
import { computeVendorEarnings, type VendorEarnings } from "@/lib/vendors/vendorEarnings";
import { getBookingById } from "@/lib/spaces/bookings";
import { getVenueById } from "@/lib/spaces/submittedVenues";
import KpiCard from "./KpiCard";
import UpcomingEventCard from "./UpcomingEventCard";
import VendorProfileSummary from "./VendorProfileSummary";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import type { Booking, Venue } from "@/lib/types/spaces";
import type { VendorProfile } from "@/lib/types/vendors";
import { formatMoney } from "@/lib/ui/format";
import { INTERACTIVE_CARD } from "@/lib/ui/interactive";
import UpNextStrip from "@/components/events/UpNextStrip";
import { buildVendorUpNext } from "@/lib/events/upNextData";
import type { UpNextItem } from "@/lib/events/upNext";

export default function VendorDashboard({ accountId }: { accountId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [upNext, setUpNext] = useState<UpNextItem[]>([]);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [earnings, setEarnings] = useState<VendorEarnings | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  /** Confirmed gigs with no venue attached — see the refresh loop. */
  const [awaitingVenue, setAwaitingVenue] = useState(0);
  const [venuesById, setVenuesById] = useState<Record<string, Venue>>({});

  const refresh = useCallback(() => {
    const found = getVendorProfileByOwnerId(accountId);
    if (!found) {
      setProfile(null);
      setLoaded(true);
      return;
    }

    const engagements = getEngagementsForVendor(found.id);
    const todayIso = new Date().toISOString().slice(0, 10);

    const upcomingBookings: Booking[] = [];
    const venues: Record<string, Venue> = {};
    /*
     * Gigs the vendor is hired for that have no venue attached yet.
     *
     * These used to vanish: the loop below skipped anything `getBookingById`
     * couldn't resolve, and a null bookingId resolves to undefined — so a
     * confirmed, agreed, booked gig simply wasn't on the dashboard anywhere.
     * They can't go in "Upcoming events" (there's no date to sort them by, and
     * UpcomingEventCard needs a Booking), so they're counted and linked out to
     * the confirmed-gigs page where they now have their own section.
     */
    let awaitingVenueCount = 0;
    for (const engagement of engagements) {
      if (engagement.status !== "confirmed" && engagement.status !== "in_progress") continue;
      const booking = getBookingById(engagement.bookingId);
      if (!booking) {
        awaitingVenueCount += 1;
        continue;
      }
      if (booking.eventDate < todayIso) continue;
      upcomingBookings.push(booking);
      const venue = getVenueById(booking.venueId);
      if (venue) venues[booking.venueId] = venue;
    }
    upcomingBookings.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    setProfile(found);
    setEarnings(computeVendorEarnings(engagements, todayIso));
    setUpcoming(upcomingBookings);
    setAwaitingVenue(awaitingVenueCount);
    setVenuesById(venues);
    setUpNext(buildVendorUpNext(accountId));
    setLoaded(true);
  }, [accountId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  function handleToggleVisibility() {
    if (!profile) return;
    try {
      if (profile.status === "published") {
        unpublishVendorProfile(profile.id);
      } else {
        publishVendorProfile(profile.id);
      }
      refresh();
    } catch {
      // publishVendorProfile throws when the profile isn't complete enough —
      // the profile card's Edit link is the way out, so there's nothing to do here.
    }
  }

  if (!loaded) return <LoadingState label="Loading your gigs…" />;

  if (!profile || !earnings) {
    return (
      <EmptyState
        title="No vendor profile yet"
        description="Set up a profile and list what you do — organizers and venue owners can then find you and request your services."
        action={
          <Link
            href="/dashboard/vendor/onboarding"
            className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Create vendor profile
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      {/*
        What's waiting on this person. Unanswered terms sit at the top: they
        hold the organizer's hire open and freeze every competing proposal on
        that request until the vendor acts.
      */}
      <UpNextStrip items={upNext} />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Made this month"
          value={formatMoney(earnings.monthAmount)}
          footnote="From gigs completed this month."
          href="/dashboard/vendor/finances"
        />
        <KpiCard
          label="Made all time"
          value={formatMoney(earnings.totalAmount)}
          footnote={
            earnings.rateBasedCount > 0
              ? `${earnings.rateBasedCount} hourly/day-rate gig${earnings.rateBasedCount === 1 ? "" : "s"} not included — those are rates, not totals.`
              : "Across every completed gig."
          }
          href="/dashboard/vendor/finances"
        />
        <KpiCard
          label="Gigs completed"
          value={earnings.completedGigCount}
          footnote={`${earnings.upcomingGigCount} still ahead.`}
          href="/dashboard/vendor/confirmed"
        />
      </div>

      <VendorProfileSummary
        profile={profile}
        canToggleVisibility={canToggleOwnVisibility(profile)}
        onToggleVisibility={handleToggleVisibility}
      />

      <section>
        <h2 className="font-display text-lg font-semibold text-ink">Upcoming events</h2>

        {/*
          Hired, but with nowhere to be yet. Called out above the calendar
          rather than inside it: these have no date, and a planner attaching
          them to a venue is what turns them into a row below.
        */}
        {awaitingVenue > 0 && (
          <Link
            href="/dashboard/vendor/confirmed"
            className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brass/40 bg-brass/5 px-5 py-4 ${INTERACTIVE_CARD}`}
          >
            <span className="text-sm text-ink">
              <span className="font-semibold">
                {awaitingVenue} confirmed gig{awaitingVenue === 1 ? "" : "s"}
              </span>{" "}
              {awaitingVenue === 1 ? "has" : "have"} no venue yet, so {awaitingVenue === 1 ? "it isn't" : "they aren't"}{" "}
              on the calendar below.
            </span>
            <span className="shrink-0 text-sm font-semibold text-brass-dark">See the details →</span>
          </Link>
        )}

        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
            {awaitingVenue > 0
              ? "Nothing with a confirmed date yet — the gigs above are waiting on a venue."
              : "No confirmed gigs on the calendar yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {upcoming.map((booking) => (
              <UpcomingEventCard key={booking.id} booking={booking} venue={venuesById[booking.venueId]} />
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/vendor/gigs"
          className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Find a gig
        </Link>
        <Link
          href="/dashboard/vendor/onboarding?step=2"
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          List another service
        </Link>
      </div>
      <p className="-mt-5 text-xs text-ink-soft">
        Every service you list is another way organizers and venue owners can find you and request your work
        directly.
      </p>
    </div>
  );
}
