import type { VendorProfile, VendorSkillSlug } from "@/lib/types/vendors";
import { VENDOR_SKILLS } from "./skills";

/**
 * The planner-side vendor search brief: what someone who ALREADY has a venue
 * tells us before browsing vendors. Deliberately separate from `EventNeed` —
 * a need is anchored to a confirmed `Booking` (see CLAUDE.md), and the whole
 * point of this flow is reaching vendors without one.
 *
 * Nothing here is persisted. The brief lives in the URL so a search is
 * shareable and back/forward works, the same way SearchFilters does for
 * venues (src/lib/spaces/urlState.ts).
 *
 * Only three of these six fields actually narrow results — see
 * `filterVendorsByBrief`. The rest are context the planner is going to have
 * to repeat to a vendor anyway, collected once up front. Don't "fix" that by
 * inventing filters the data can't support.
 */
export interface VendorSearchBrief {
  /** Null means "any category" — the search is still valid, just unfiltered. */
  skillSlug: VendorSkillSlug | null;
  /** "YYYY-MM-DD", matching what <input type="date"> produces. */
  eventDate: string | null;
  /** Label only. San Francisco is the only market, so there are no coordinates to carry. */
  location: string;
  guestCount: number | null;
  /** Total budget in whole dollars, not a rate. See `assessBudgetFit`. */
  budget: number | null;
  description: string;
}

const SKILL_SLUGS = VENDOR_SKILLS.map((skill) => skill.slug);

export const VENDOR_SEARCH_LOCATION = "San Francisco, CA";

export function getEmptyBrief(): VendorSearchBrief {
  return {
    skillSlug: null,
    eventDate: null,
    location: VENDOR_SEARCH_LOCATION,
    guestCount: null,
    budget: null,
    description: "",
  };
}

function parsePositiveInt(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function briefToSearchParams(brief: VendorSearchBrief): URLSearchParams {
  const params = new URLSearchParams();
  if (brief.skillSlug) params.set("category", brief.skillSlug);
  if (brief.eventDate) params.set("date", brief.eventDate);
  if (brief.location) params.set("location", brief.location);
  if (brief.guestCount !== null) params.set("guests", brief.guestCount.toString());
  if (brief.budget !== null) params.set("budget", brief.budget.toString());
  if (brief.description.trim()) params.set("needs", brief.description.trim());
  return params;
}

export function searchParamsToBrief(params: URLSearchParams): VendorSearchBrief {
  const defaults = getEmptyBrief();
  const category = params.get("category");

  return {
    skillSlug: (SKILL_SLUGS as string[]).includes(category ?? "")
      ? (category as VendorSkillSlug)
      : null,
    eventDate: params.get("date"),
    location: params.get("location") ?? defaults.location,
    guestCount: parsePositiveInt(params.get("guests")),
    budget: parsePositiveInt(params.get("budget")),
    description: params.get("needs") ?? "",
  };
}

/** True when the planner told us anything beyond the fixed default location. */
export function hasBriefContext(brief: VendorSearchBrief): boolean {
  return (
    brief.skillSlug !== null ||
    Boolean(brief.eventDate) ||
    brief.guestCount !== null ||
    brief.budget !== null ||
    brief.description.trim().length > 0
  );
}

export function matchesCategory(vendor: VendorProfile, skillSlug: VendorSkillSlug | null): boolean {
  if (skillSlug === null) return true;
  return vendor.skills.includes(skillSlug);
}

/**
 * Whether a vendor's fixed starting price clears the planner's total budget.
 *
 * "unknown" is the honest answer far more often than it looks, and it is
 * never filtered out: `hourly` and `day_rate` starting prices are RATES, not
 * totals (the same trap computeRosterSpend() guards against in
 * engagementTotals.ts), so comparing one to a total budget would drop vendors
 * for no real reason. `contact_for_quote` and unset prices are unknowable by
 * definition. Only flat-fee and package prices are a like-for-like comparison.
 */
export type BudgetFit = "within" | "over" | "unknown";

export function assessBudgetFit(
  vendor: VendorProfile,
  skillSlug: VendorSkillSlug | null,
  budget: number | null
): BudgetFit {
  if (budget === null || budget <= 0) return "unknown";

  const relevant = skillSlug
    ? vendor.services.filter((service) => service.skillSlug === skillSlug)
    : vendor.services;

  const comparablePrices = relevant
    .filter((service) => service.pricingModel === "flat_fee" || service.pricingModel === "package")
    .map((service) => service.startingPrice)
    .filter((price): price is number => price !== null && price > 0);

  if (comparablePrices.length === 0) return "unknown";
  return Math.min(...comparablePrices) <= budget ? "within" : "over";
}

/** Days from `fromIso` to `toIso`, both "YYYY-MM-DD". Null when either is unparseable. */
export function daysUntil(fromIso: string, toIso: string): number | null {
  // Parsed at local noon so a DST boundary between the two dates can't shift
  // the difference by a day — same reason formatEventDate() does it.
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Whether the event is far enough out for this vendor's stated notice period.
 * This is the one genuine availability signal the prototype has — there is no
 * vendor calendar, so a match here means "not obviously too soon", not "free".
 */
export function meetsLeadTime(
  vendor: VendorProfile,
  eventDate: string | null,
  todayIso: string
): boolean {
  if (!eventDate) return true;
  const days = daysUntil(todayIso, eventDate);
  if (days === null) return true;
  // A date in the past is a data-entry mistake, not a reason to return zero
  // vendors and look broken. The date input guards the realistic case.
  if (days < 0) return true;
  return days >= vendor.location.leadTimeDays;
}

/**
 * The full planner-brief filter. Guest count and description are deliberately
 * absent: vendors carry no capacity field and no structured service copy to
 * match free text against, so filtering on either would be theatre. They ride
 * along in the brief and get handed to the vendor at request time instead.
 */
export function filterVendorsByBrief(
  vendors: VendorProfile[],
  brief: VendorSearchBrief,
  todayIso: string
): VendorProfile[] {
  return vendors.filter((vendor) => {
    if (!matchesCategory(vendor, brief.skillSlug)) return false;
    if (assessBudgetFit(vendor, brief.skillSlug, brief.budget) === "over") return false;
    if (!meetsLeadTime(vendor, brief.eventDate, todayIso)) return false;
    return true;
  });
}
