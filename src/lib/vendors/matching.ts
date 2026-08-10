import { haversineDistanceMiles } from "@/lib/spaces/distance";
import type { EventNeed, PricingModel, VendorProfile, VendorProposal } from "@/lib/types/vendors";
import { getSkillName } from "./skills";

/**
 * Transparent, rule-based matching only — no AI, no scoring model, per the
 * product requirement to never claim an advanced recommendation algorithm.
 */
export function matchesSkill(profile: VendorProfile, need: EventNeed): boolean {
  return profile.skills.includes(need.skillSlug);
}

export function matchesLocation(profile: VendorProfile, need: EventNeed): boolean {
  if (need.locationType === "remote") {
    return profile.location.remoteAvailable;
  }

  if (profile.location.citiesServed.some((city) => city.toLowerCase() === need.publicLocation.toLowerCase())) {
    return true;
  }

  if (profile.location.radiusMode === "anywhere") return true;

  const distanceMiles = haversineDistanceMiles(profile.location.coordinates, need.coordinates);
  return distanceMiles <= profile.location.radiusMiles;
}

export function isMatch(profile: VendorProfile, need: EventNeed): boolean {
  return matchesSkill(profile, need) && matchesLocation(profile, need);
}

/** Human-readable explanation of why a gig matched — never an opaque "recommended for you". */
export function getMatchReason(profile: VendorProfile, need: EventNeed): string | null {
  if (!matchesSkill(profile, need)) return null;
  const skillName = getSkillName(need.skillSlug);

  if (need.locationType === "remote") {
    return profile.location.remoteAvailable
      ? `Matched because this is a remote ${skillName} opportunity and you accept remote work.`
      : null;
  }

  if (profile.location.citiesServed.some((city) => city.toLowerCase() === need.publicLocation.toLowerCase())) {
    return `Matched because this event needs a ${skillName} in ${need.publicLocation}, one of your selected service cities.`;
  }

  if (profile.location.radiusMode === "anywhere") {
    return `Matched because this event needs a ${skillName} and you accept opportunities anywhere.`;
  }

  const distanceMiles = haversineDistanceMiles(profile.location.coordinates, need.coordinates);
  if (distanceMiles <= profile.location.radiusMiles) {
    return `Matched because this event needs a ${skillName} within ${profile.location.radiusMiles} miles of ${profile.location.homeCity}.`;
  }

  return null;
}

export interface CompetitiveBidSummary {
  totalBids: number;
  lowestActiveAmount: number | null;
  highestActiveAmount: number | null;
  /** Only populated once there are enough active bids (3+) to keep any single competitor from being identifiable. */
  medianActiveAmount: number | null;
  pricingModelsRepresented: PricingModel[];
}

const MIN_BIDS_FOR_MEDIAN = 3;

/**
 * Anonymized market summary — never returns anything that could identify an
 * individual competing vendor (name, photo, message, portfolio). Only takes
 * proposal amounts/pricing models as input, never full proposal records with
 * identity fields, so a caller physically cannot leak more than this.
 */
export function computeCompetitiveBidSummary(
  activeProposals: Pick<VendorProposal, "proposedAmount" | "pricingModel" | "status">[]
): CompetitiveBidSummary {
  const active = activeProposals.filter(
    (p) => p.status === "submitted" || p.status === "shortlisted" || p.status === "in_discussion" || p.status === "accepted"
  );
  const amounts = active.map((p) => p.proposedAmount).sort((a, b) => a - b);

  const median =
    amounts.length >= MIN_BIDS_FOR_MEDIAN
      ? amounts.length % 2 === 1
        ? amounts[(amounts.length - 1) / 2]
        : (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
      : null;

  return {
    totalBids: active.length,
    lowestActiveAmount: amounts.length > 0 ? amounts[0] : null,
    highestActiveAmount: amounts.length > 0 ? amounts[amounts.length - 1] : null,
    medianActiveAmount: median,
    pricingModelsRepresented: Array.from(new Set(active.map((p) => p.pricingModel))),
  };
}
