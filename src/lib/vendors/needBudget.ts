import { computeBookingDurationMinutes } from "@/lib/spaces/bookingConstraints";
import type { PricingModel } from "@/lib/types/vendors";

/**
 * Turns "what do you want to pay" into the budget range stored on an
 * EventNeed.
 *
 * Organizers think in a rate ("$80/hr") far more naturally than in a total,
 * but vendors bid against a total. This derives one from the other using the
 * vendor's own booked window, so the number the organizer sees is the number
 * vendors will see.
 *
 * The explicit min/max stay optional overrides: someone who already knows
 * they'll pay between $200 and $400 shouldn't have to express that as a rate.
 */

/** The only two models a request can ask for — see PRICING_MODEL_LABELS for the vendor-side set. */
export const REQUESTABLE_PRICING_MODELS: PricingModel[] = ["hourly", "flat_fee"];

export interface NeedBudgetInput {
  /** "" means no preference. */
  pricingModel: PricingModel | "";
  /** The organizer's target: a rate when hourly, a total when flat fee. */
  targetPrice: string;
  startTime: string;
  endTime: string;
  /** Optional explicit overrides. Either, both, or neither. */
  minOverride: string;
  maxOverride: string;
}

export interface NeedBudget {
  budgetMin: number | null;
  budgetMax: number | null;
  /** Hours the vendor is booked for, derived from the request's own window. */
  hours: number | null;
  /** What the target price works out to in total. Null when it can't be derived. */
  estimatedTotal: number | null;
}

function toPositiveNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

/** Hours between two "HH:mm" times, crossing midnight if needed. Null when unparseable. */
export function computeNeedHours(startTime: string, endTime: string): number | null {
  const minutes = computeBookingDurationMinutes(startTime, endTime);
  if (minutes === null || minutes <= 0) return null;
  return minutes / 60;
}

export function computeNeedBudget(input: NeedBudgetInput): NeedBudget {
  const hours = computeNeedHours(input.startTime, input.endTime);
  const target = toPositiveNumber(input.targetPrice);

  let estimatedTotal: number | null = null;
  if (target !== null) {
    if (input.pricingModel === "hourly") {
      // A rate only becomes a total once we know the window.
      estimatedTotal = hours === null ? null : Math.round(target * hours);
    } else {
      // Flat fee, or no stated preference: the figure entered IS the total.
      estimatedTotal = Math.round(target);
    }
  }

  const minOverride = toPositiveNumber(input.minOverride);
  const maxOverride = toPositiveNumber(input.maxOverride);

  return {
    budgetMin: minOverride ?? estimatedTotal,
    budgetMax: maxOverride ?? estimatedTotal,
    hours,
    estimatedTotal,
  };
}

/** "3 hours" / "2.5 hours" / "1 hour" — trims a trailing .0 so whole hours read cleanly. */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  const label = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${label} ${rounded === 1 ? "hour" : "hours"}`;
}

/**
 * The live "$80/hr × 3 hours = $240" line under the price field. Null when
 * there's nothing meaningful to show yet, so the caller renders nothing
 * rather than a half-formed equation.
 */
export function formatBudgetPreview(input: NeedBudgetInput): string | null {
  const { hours, estimatedTotal } = computeNeedBudget(input);
  const target = toPositiveNumber(input.targetPrice);
  if (target === null || estimatedTotal === null) return null;

  if (input.pricingModel === "hourly") {
    if (hours === null) return null;
    return `$${target}/hr × ${formatHours(hours)} = $${estimatedTotal.toLocaleString()}`;
  }
  return `$${estimatedTotal.toLocaleString()} total`;
}
