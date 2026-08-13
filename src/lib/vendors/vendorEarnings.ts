import { computeRosterSpend } from "./engagementTotals";
import type { VendorEngagement } from "@/lib/types/vendors";

/**
 * Vendor earnings KPIs. Unlike the venue side (see
 * src/lib/spaces/venueEarnings.ts, which can only estimate), these come from
 * a real agreed amount both parties confirmed — so they're actual figures,
 * not estimates.
 *
 * The one caveat carried over from computeRosterSpend(): `agreedAmount` is a
 * RATE for hourly/day_rate engagements and can be 0 for contact_for_quote.
 * Those are counted as gigs but excluded from the money totals and surfaced
 * separately, rather than folded in to produce a confidently wrong number.
 */
export interface VendorEarnings {
  /** Confirmed-amount earnings from gigs completed this calendar month. */
  monthAmount: number;
  /** Confirmed-amount earnings from every completed gig. */
  totalAmount: number;
  /** Every gig that reached a completed state, including rate-priced ones. */
  completedGigCount: number;
  /** Confirmed/in-progress gigs still ahead. */
  upcomingGigCount: number;
  /** Completed gigs whose amount was a rate, not a total — excluded from the money figures. */
  rateBasedCount: number;
}

const COMPLETED_STATUSES: VendorEngagement["status"][] = ["completed"];
const UPCOMING_STATUSES: VendorEngagement["status"][] = ["confirmed", "in_progress"];

/** ISO timestamp -> "YYYY-MM"; null for anything unparseable. */
function toMonthKey(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 7) return null;
  return iso.slice(0, 7);
}

/**
 * Pure. `todayIso` may be a full ISO timestamp or a "YYYY-MM-DD" date — only
 * its year-month prefix is used. A completed engagement is dated by
 * `completedAt`, falling back to `updatedAt` for records written before that
 * field was always set.
 */
export function computeVendorEarnings(engagements: VendorEngagement[], todayIso: string): VendorEarnings {
  const currentMonth = toMonthKey(todayIso);
  const completed = engagements.filter((engagement) => COMPLETED_STATUSES.includes(engagement.status));
  const completedThisMonth = completed.filter(
    (engagement) => toMonthKey(engagement.completedAt ?? engagement.updatedAt) === currentMonth
  );

  const allSpend = computeRosterSpend(completed);
  const monthSpend = computeRosterSpend(completedThisMonth);

  return {
    monthAmount: monthSpend.totalAmount,
    totalAmount: allSpend.totalAmount,
    completedGigCount: completed.length,
    upcomingGigCount: engagements.filter((engagement) => UPCOMING_STATUSES.includes(engagement.status)).length,
    rateBasedCount: allSpend.excludedCount,
  };
}
