"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForVenue, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { estimateBookingValue } from "@/lib/spaces/venueEarnings";
import { resolveContractState } from "@/lib/spaces/bookingContracts";
import { getVenuesOwnedBy } from "@/lib/spaces/submittedVenues";
import { getThreadForBooking, getMessagesForThread } from "@/lib/vendors/messages";
import { resolveBookingTone } from "@/lib/ui/statusTone";
import { formatMoney } from "@/lib/ui/format";
import StatusBadge from "@/components/ui/StatusBadge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { LEDGER_FOOTNOTE, type LineItemBasis } from "@/lib/finance/eventLedger";
import { formatMonthKey } from "@/lib/finance/vendorLedger";
import type { BookingContractAttachment, BookingProposalAttachment } from "@/lib/types/vendors";
import type { Booking, BookingStatus } from "@/lib/types/spaces";

/**
 * A venue owner's bookings as money, grouped by listing then by month.
 *
 * Uses the same precedence as the planner's ledger — **signed contract >
 * accepted offer > estimate** — so the two sides of a booking never show
 * different figures for it. Where the estimate is the basis, the "estimated"
 * language from `venueEarnings.ts` is kept verbatim: a `Booking` has no price
 * column, so an unquoted booking's value really is only our arithmetic.
 */

interface VenueBookingRow {
  bookingId: string;
  eventLabel: string;
  eventDate: string;
  amount: number;
  basis: LineItemBasis;
  basisNote: string;
  status: BookingStatus;
}

interface MonthGroup {
  monthKey: string;
  rows: VenueBookingRow[];
  firmSubtotal: number;
  estimatedSubtotal: number;
}

interface ListingGroup {
  venueId: string;
  venueName: string;
  months: MonthGroup[];
  firmTotal: number;
  estimatedTotal: number;
}

/** Signed contract > accepted offer > estimate, matching the planner's ledger. */
function resolveRow(booking: Booking, estimate: number): VenueBookingRow {
  const thread = getThreadForBooking(booking.id);
  const messages = thread ? getMessagesForThread(thread.id) : [];

  const contracts = messages
    .map((message) => message.contract)
    .filter((contract): contract is BookingContractAttachment => Boolean(contract));
  const signed = resolveContractState(contracts).signed;

  if (signed?.totalAmount !== null && signed?.totalAmount !== undefined) {
    return {
      bookingId: booking.id,
      eventLabel: formatEventLabel(booking),
      eventDate: booking.eventDate,
      amount: signed.totalAmount,
      basis: "firm",
      basisNote: "From the agreement you both signed.",
      status: booking.status,
    };
  }

  const accepted = messages
    .map((message) => message.proposal)
    .filter((proposal): proposal is BookingProposalAttachment => Boolean(proposal))
    .filter((proposal) => proposal.kind === "revised_terms" && proposal.status === "accepted")
    .sort((a, b) => (a.respondedAt ?? "").localeCompare(b.respondedAt ?? ""));
  const latest = accepted[accepted.length - 1];

  if (latest?.estimatedTotal !== null && latest?.estimatedTotal !== undefined) {
    return {
      bookingId: booking.id,
      eventLabel: formatEventLabel(booking),
      eventDate: booking.eventDate,
      amount: latest.estimatedTotal,
      basis: "firm",
      basisNote: "From the terms the planner accepted.",
      status: booking.status,
    };
  }

  return {
    bookingId: booking.id,
    eventLabel: formatEventLabel(booking),
    eventDate: booking.eventDate,
    amount: estimate,
    basis: "estimate",
    basisNote:
      "A booking carries no agreed price until you send terms, so this is your lowest hourly rate times the hours booked.",
    status: booking.status,
  };
}

export default function VenueFinancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [listings, setListings] = useState<ListingGroup[]>([]);

  useEffect(() => {
    if (!user) return;

    const groups: ListingGroup[] = getVenuesOwnedBy(user.id).map((venue) => {
      const rows = getBookingsForVenue(venue.id)
        .filter((booking) => booking.status !== "declined")
        .map((booking) => resolveRow(booking, estimateBookingValue(booking, venue)));

      const byMonth = new Map<string, VenueBookingRow[]>();
      for (const row of rows) {
        const key = row.eventDate.slice(0, 7);
        byMonth.set(key, [...(byMonth.get(key) ?? []), row]);
      }

      const months: MonthGroup[] = [...byMonth.entries()]
        // Newest month first: an owner checking figures is looking at what
        // just happened or is about to.
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([monthKey, monthRows]) => ({
          monthKey,
          rows: [...monthRows].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
          firmSubtotal: monthRows.reduce((t, r) => (r.basis === "firm" ? t + r.amount : t), 0),
          estimatedSubtotal: monthRows.reduce((t, r) => (r.basis === "estimate" ? t + r.amount : t), 0),
        }));

      return {
        venueId: venue.id,
        venueName: venue.name,
        months,
        firmTotal: months.reduce((t, m) => t + m.firmSubtotal, 0),
        estimatedTotal: months.reduce((t, m) => t + m.estimatedSubtotal, 0),
      };
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListings(groups);
    setLoaded(true);
  }, [user]);

  if (authLoading || !loaded) return <LoadingState label="Loading your figures…" />;
  if (!user) return null;

  const hasAnything = listings.some((listing) => listing.months.length > 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Finances</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What each listing has booked, split between agreed figures and estimates.
      </p>

      {!hasAnything ? (
        <div className="mt-8">
          <EmptyState
            title="No bookings to total up yet"
            description="Once a planner books one of your spaces, its figures show up here."
            action={
              <Link
                href="/dashboard/venue"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                View your listings
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-6">
            {listings
              .filter((listing) => listing.months.length > 0)
              .map((listing) => (
                <section key={listing.venueId} className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold text-ink">{listing.venueName}</h2>
                    <p className="text-sm text-ink-soft">
                      <span className="font-semibold text-ink">{formatMoney(listing.firmTotal)}</span> agreed
                      {listing.estimatedTotal > 0 && <> · ~{formatMoney(listing.estimatedTotal)} estimated</>}
                    </p>
                  </div>

                  <div className="mt-4 space-y-4">
                    {listing.months.map((month) => (
                      <div key={month.monthKey}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                          <h3 className="text-sm font-semibold text-ink">{formatMonthKey(month.monthKey)}</h3>
                          <p className="text-xs text-ink-soft">
                            {formatMoney(month.firmSubtotal)} agreed
                            {month.estimatedSubtotal > 0 && <> · ~{formatMoney(month.estimatedSubtotal)} est.</>}
                          </p>
                        </div>
                        <ul className="divide-y divide-line">
                          {month.rows.map((row) => (
                            <li key={row.bookingId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-ink">{row.eventLabel}</p>
                                <p className="mt-0.5 text-xs text-ink-soft">{formatEventDate(row.eventDate)}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-3">
                                <span className="inline-flex items-center gap-1 text-sm">
                                  {row.basis === "estimate" ? (
                                    <>
                                      <span className="text-ink-soft">est.</span>
                                      <span className="font-medium text-ink">{formatMoney(row.amount)}</span>
                                      <InfoTooltip label="Why this is an estimate">{row.basisNote}</InfoTooltip>
                                    </>
                                  ) : (
                                    <span className="font-semibold text-ink">{formatMoney(row.amount)}</span>
                                  )}
                                </span>
                                <StatusBadge descriptor={resolveBookingTone(row.status, "venue_operator")} />
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-ink-soft">{LEDGER_FOOTNOTE}</p>
        </>
      )}
    </div>
  );
}
