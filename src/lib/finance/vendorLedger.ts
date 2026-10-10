import { rateSuffixFor } from "./eventLedger";
import type { PricingModel, VendorEngagement } from "@/lib/types/vendors";

/**
 * A vendor's own gigs as money, grouped the way a vendor thinks about them:
 * what's coming, what's done, and what each month added up to.
 *
 * Deliberately NOT a second earnings calculation. `computeVendorEarnings()`
 * still owns the dashboard KPIs, and this inherits its one hard rule from
 * `computeRosterSpend()`: an `agreedAmount` on an hourly or day-rate
 * engagement is a RATE. It is reported as a rate, excluded from every
 * subtotal, and only ever multiplied out when the hours are actually known.
 *
 * Pure. `todayIso` is passed in.
 */

export type VendorGigBasis = "firm" | "estimate" | "rate_only";

export interface VendorGigRow {
  engagementId: string;
  /** The event, or "Event TBD" for a gig with no venue attached yet. */
  eventLabel: string;
  plannerName: string;
  /** "YYYY-MM-DD", or null for an unassigned gig that has no date. */
  eventDate: string | null;
  amount: number | null;
  pricingModel: PricingModel;
  basis: VendorGigBasis;
  /** Suffix for a rate — "/hr". Empty for totals. */
  rateSuffix: string;
  status: VendorEngagement["status"];
}

export interface VendorMonthGroup {
  /** "YYYY-MM", the grouping key — never rendered raw. */
  monthKey: string;
  rows: VendorGigRow[];
  /** Firm amounts only. Rates and estimates are never folded in. */
  firmSubtotal: number;
  rateOnlyCount: number;
}

export interface VendorLedger {
  upcoming: VendorGigRow[];
  completed: VendorMonthGroup[];
  /** Gigs with no venue attached — real work, no date to file it under. */
  unassigned: VendorGigRow[];
  firmUpcomingTotal: number;
  firmCompletedTotal: number;
  rateOnlyCount: number;
}

const FIRM_MODELS: PricingModel[] = ["flat_fee", "package"];
const UPCOMING_STATUSES: VendorEngagement["status"][] = ["confirmed", "in_progress"];

/** The basis for one gig, given whether its hours are knowable. */
export function resolveGigBasis(pricingModel: PricingModel, hours: number | null): VendorGigBasis {
  if (FIRM_MODELS.includes(pricingModel)) return "firm";
  if (pricingModel === "contact_for_quote") return "rate_only";
  return hours !== null && hours > 0 ? "estimate" : "rate_only";
}

export interface VendorGigInput {
  engagementId: string;
  eventLabel: string;
  plannerName: string;
  eventDate: string | null;
  /** True when this engagement has no booking attached. */
  unassigned: boolean;
  amount: number;
  pricingModel: PricingModel;
  /** Booked hours from the event, when there is one. */
  hours: number | null;
  status: VendorEngagement["status"];
  /** ISO — when it completed, for month grouping. */
  completedAt: string | null;
}

function toRow(input: VendorGigInput): VendorGigRow {
  const basis = resolveGigBasis(input.pricingModel, input.hours);
  return {
    engagementId: input.engagementId,
    eventLabel: input.eventLabel,
    plannerName: input.plannerName,
    eventDate: input.eventDate,
    amount:
      basis === "estimate" && input.hours !== null
        ? Math.round(input.amount * input.hours)
        : input.amount > 0
          ? input.amount
          : null,
    pricingModel: input.pricingModel,
    basis,
    rateSuffix: basis === "rate_only" ? rateSuffixFor(input.pricingModel) : "",
    status: input.status,
  };
}

export function buildVendorLedger(gigs: VendorGigInput[], todayIso: string): VendorLedger {
  const upcoming: VendorGigRow[] = [];
  const unassigned: VendorGigRow[] = [];
  const byMonth = new Map<string, VendorGigRow[]>();

  for (const gig of gigs) {
    const row = toRow(gig);

    /*
     * An unassigned gig is listed on its own rather than under "upcoming".
     * It has no date, so it can't be sorted with the others, and filing it
     * under a month it doesn't have would be inventing information.
     */
    if (gig.unassigned) {
      unassigned.push(row);
      continue;
    }

    if (gig.status === "completed") {
      const monthKey = (gig.completedAt ?? gig.eventDate ?? todayIso).slice(0, 7);
      const existing = byMonth.get(monthKey) ?? [];
      existing.push(row);
      byMonth.set(monthKey, existing);
      continue;
    }

    if (UPCOMING_STATUSES.includes(gig.status)) upcoming.push(row);
  }

  upcoming.sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));

  const completed: VendorMonthGroup[] = [...byMonth.entries()]
    // Most recent month first — a vendor checking their figures is looking at
    // what just happened, not at last spring.
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, rows]) => ({
      monthKey,
      rows: [...rows].sort((a, b) => (b.eventDate ?? "").localeCompare(a.eventDate ?? "")),
      firmSubtotal: rows.reduce(
        (total, row) => (row.basis === "firm" && row.amount !== null ? total + row.amount : total),
        0
      ),
      rateOnlyCount: rows.filter((row) => row.basis === "rate_only").length,
    }));

  const firmOf = (rows: VendorGigRow[]) =>
    rows.reduce((total, row) => (row.basis === "firm" && row.amount !== null ? total + row.amount : total), 0);

  return {
    upcoming,
    completed,
    unassigned,
    firmUpcomingTotal: firmOf(upcoming),
    firmCompletedTotal: completed.reduce((total, group) => total + group.firmSubtotal, 0),
    rateOnlyCount: [...upcoming, ...unassigned, ...completed.flatMap((group) => group.rows)].filter(
      (row) => row.basis === "rate_only"
    ).length,
  };
}

/** "October 2026" from a "YYYY-MM" key. Never renders the key itself. */
export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
