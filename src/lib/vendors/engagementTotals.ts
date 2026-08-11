import type { PricingModel, VendorEngagement } from "@/lib/types/vendors";

const FLAT_TOTAL_PRICING_MODELS: PricingModel[] = ["flat_fee", "package"];

export interface RosterSpend {
  totalAmount: number;
  /** Number of engagements whose amount was a real total and got summed. */
  includedCount: number;
  /** Number of engagements NOT summed (hourly/day_rate amounts are rates, not totals; contact_for_quote can be 0). */
  excludedCount: number;
}

/**
 * Sums only flat_fee/package engagement amounts into a running total.
 * agreedAmount for hourly/day_rate is a RATE, not a total, and
 * contact_for_quote can be 0 — summing every row would produce a confident,
 * wrong number. Rows not summed are counted separately so the UI can say
 * "+3 vendors not included" instead of silently dropping them.
 *
 * Callers should pass only the engagements they consider part of the active
 * roster (e.g. excluding canceled/declined ones) — this function has no
 * opinion on status, only on pricing model.
 */
export function computeRosterSpend(
  engagements: Pick<VendorEngagement, "agreedAmount" | "pricingModel">[]
): RosterSpend {
  let totalAmount = 0;
  let includedCount = 0;
  let excludedCount = 0;

  for (const engagement of engagements) {
    if (FLAT_TOTAL_PRICING_MODELS.includes(engagement.pricingModel)) {
      totalAmount += engagement.agreedAmount;
      includedCount += 1;
    } else {
      excludedCount += 1;
    }
  }

  return { totalAmount, includedCount, excludedCount };
}
