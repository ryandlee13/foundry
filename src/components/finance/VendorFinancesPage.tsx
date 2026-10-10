"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import { getBookingById, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { computeBookingDurationMinutes } from "@/lib/spaces/bookingConstraints";
import { getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import { getEngagementsForVendor } from "@/lib/vendors/engagements";
import { resolveEngagementTone } from "@/lib/ui/statusTone";
import { formatMoney } from "@/lib/ui/format";
import StatusBadge from "@/components/ui/StatusBadge";
import InfoTooltip from "@/components/ui/InfoTooltip";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { LEDGER_FOOTNOTE } from "@/lib/finance/eventLedger";
import {
  buildVendorLedger,
  formatMonthKey,
  type VendorGigInput,
  type VendorGigRow,
  type VendorLedger,
} from "@/lib/finance/vendorLedger";

/**
 * A vendor's gigs as money: what's coming, what's done by month, and what has
 * no event attached.
 *
 * Totals are firm amounts only. An hourly rate with known hours shows an
 * estimate beside it and is excluded from every subtotal — the rule inherited
 * from `computeRosterSpend()`, which this page must not quietly relax just
 * because a bigger number would look better.
 */

function AmountCell({ row }: { row: VendorGigRow }) {
  if (row.amount === null) return <span className="text-ink-soft">—</span>;

  if (row.basis === "rate_only") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-ink">
        {formatMoney(row.amount)}
        {row.rateSuffix}
        <InfoTooltip label="Why there's no total">
          A rate on its own. Without confirmed hours there&apos;s nothing to multiply it by, so it isn&apos;t
          counted in any subtotal.
        </InfoTooltip>
      </span>
    );
  }

  if (row.basis === "estimate") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-ink">
        <span className="text-ink-soft">est.</span> {formatMoney(row.amount)}
        <InfoTooltip label="Why this is an estimate">
          Your rate times the event&apos;s booked hours. The final figure depends on hours actually worked.
        </InfoTooltip>
      </span>
    );
  }

  return <span className="font-semibold text-ink">{formatMoney(row.amount)}</span>;
}

function GigTable({ rows }: { rows: VendorGigRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <th className="pb-2 pr-3">Event</th>
            <th className="pb-2 pr-3">Planner</th>
            <th className="pb-2 pr-3">Date</th>
            <th className="pb-2 pr-3 text-right">Amount</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.engagementId}>
              <td className="py-3 pr-3 font-medium text-ink">{row.eventLabel}</td>
              <td className="py-3 pr-3 text-ink-soft">{row.plannerName}</td>
              <td className="py-3 pr-3 text-ink-soft">
                {row.eventDate ? formatEventDate(row.eventDate) : "—"}
              </td>
              <td className="py-3 pr-3 text-right">
                <AmountCell row={row} />
              </td>
              <td className="py-3">
                <StatusBadge descriptor={resolveEngagementTone(row.status, "vendor")} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VendorFinancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [ledger, setLedger] = useState<VendorLedger | null>(null);

  useEffect(() => {
    if (!user) return;
    const profile = getVendorProfileByOwnerId(user.id);
    if (!profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true);
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const gigs: VendorGigInput[] = getEngagementsForVendor(profile.id).map((engagement) => {
      const booking = getBookingById(engagement.bookingId);
      const minutes = booking ? computeBookingDurationMinutes(booking.startTime, booking.endTime) : null;
      return {
        engagementId: engagement.id,
        // "Event TBD" rather than a blank: the gig is real and agreed, it just
        // hasn't been attached to a venue yet.
        eventLabel: booking ? formatEventLabel(booking) : "Event TBD",
        plannerName: findAccountById(engagement.organizerId)?.name ?? "Organizer",
        eventDate: booking?.eventDate ?? null,
        unassigned: !booking,
        amount: engagement.agreedAmount,
        pricingModel: engagement.pricingModel,
        hours: minutes !== null && minutes > 0 ? Math.round((minutes / 60) * 100) / 100 : null,
        status: engagement.status,
        completedAt: engagement.completedAt ?? null,
      };
    });

    setLedger(buildVendorLedger(gigs, todayIso));
    setLoaded(true);
  }, [user]);

  if (authLoading || !loaded) return <LoadingState label="Loading your figures…" />;
  if (!user) return null;

  const isEmpty =
    !ledger || (ledger.upcoming.length === 0 && ledger.completed.length === 0 && ledger.unassigned.length === 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Finances</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every gig you&apos;ve agreed, with the figures you confirmed.
      </p>

      {isEmpty ? (
        <div className="mt-8">
          <EmptyState
            title="No figures yet"
            description="Once you confirm terms on a gig, it shows up here with what you agreed."
            action={
              <Link
                href="/dashboard/vendor/gigs"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Discover gigs
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Agreed, still ahead</p>
              <p className="mt-1.5 font-display text-2xl font-semibold text-ink">
                {formatMoney(ledger.firmUpcomingTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Completed, all time</p>
              <p className="mt-1.5 font-display text-2xl font-semibold text-ink">
                {formatMoney(ledger.firmCompletedTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Rate-priced gigs</p>
              <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{ledger.rateOnlyCount}</p>
              <p className="mt-1 text-xs text-ink-soft">
                Not in either figure — a rate isn&apos;t a total.
              </p>
            </div>
          </div>

          {ledger.upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Upcoming</h2>
              <div className="mt-3 rounded-2xl border border-line bg-paper p-5">
                <GigTable rows={ledger.upcoming} />
              </div>
            </section>
          )}

          {/*
            Separate from "upcoming" because these have no date — see
            buildVendorLedger. Real, agreed work with nowhere to be yet.
          */}
          {ledger.unassigned.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Awaiting a venue</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Agreed, but the planner hasn&apos;t attached these to a venue, so there&apos;s no date yet.
              </p>
              <div className="mt-3 rounded-2xl border border-line bg-paper p-5">
                <GigTable rows={ledger.unassigned} />
              </div>
            </section>
          )}

          {ledger.completed.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Completed</h2>
              <div className="mt-3 space-y-4">
                {ledger.completed.map((group) => (
                  <div key={group.monthKey} className="rounded-2xl border border-line bg-paper p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-base font-semibold text-ink">
                        {formatMonthKey(group.monthKey)}
                      </h3>
                      <p className="text-sm text-ink-soft">
                        <span className="font-semibold text-ink">{formatMoney(group.firmSubtotal)}</span>
                        {group.rateOnlyCount > 0 && (
                          <> · {group.rateOnlyCount} rate-priced not included</>
                        )}
                      </p>
                    </div>
                    <div className="mt-3">
                      <GigTable rows={group.rows} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="mt-6 text-xs leading-relaxed text-ink-soft">{LEDGER_FOOTNOTE}</p>
        </>
      )}
    </div>
  );
}
