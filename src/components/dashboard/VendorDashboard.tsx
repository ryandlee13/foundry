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

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export default function VendorDashboard({ accountId }: { accountId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [earnings, setEarnings] = useState<VendorEarnings | null>(null);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
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
    for (const engagement of engagements) {
      if (engagement.status !== "confirmed" && engagement.status !== "in_progress") continue;
      const booking = getBookingById(engagement.bookingId);
      if (!booking || booking.eventDate < todayIso) continue;
      upcomingBookings.push(booking);
      const venue = getVenueById(booking.venueId);
      if (venue) venues[booking.venueId] = venue;
    }
    upcomingBookings.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    setProfile(found);
    setEarnings(computeVendorEarnings(engagements, todayIso));
    setUpcoming(upcomingBookings);
    setVenuesById(venues);
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
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Made this month"
          value={formatMoney(earnings.monthAmount)}
          footnote="From gigs completed this month."
        />
        <KpiCard
          label="Made all time"
          value={formatMoney(earnings.totalAmount)}
          footnote={
            earnings.rateBasedCount > 0
              ? `${earnings.rateBasedCount} hourly/day-rate gig${earnings.rateBasedCount === 1 ? "" : "s"} not included — those are rates, not totals.`
              : "Across every completed gig."
          }
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
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
            No confirmed gigs on the calendar yet.
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
