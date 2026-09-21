import { applyFilters } from "./filters";
import { AMENITY_LABELS, RULE_LABELS, SPACE_TYPE_LABELS } from "./labels";
import type {
  AmenityKey,
  SearchFilters,
  SpaceType,
  Venue,
  VenueRules,
} from "@/lib/types/spaces";

/**
 * "How many spaces would I get if I also ticked this?" counts for the filter
 * panel.
 *
 * The rule that makes these numbers mean anything: each dimension is counted
 * against the results with *its own* selections removed, but every other
 * filter still applied. Count amenities with the amenity filter left in and
 * every unticked amenity reads 0 — technically true, useless to read. Count
 * them against the unfiltered venue list and the numbers stop responding to
 * the date, price, and capacity the planner already chose.
 *
 * Amenity and rule filters are AND-ed by applyFilters, so a count here is
 * "matches everything else you picked, and also has this" — which is exactly
 * what the number next to a checkbox should predict.
 */
export interface FacetCounts {
  spaceTypes: Record<SpaceType, number>;
  amenities: Record<AmenityKey, number>;
  rules: Record<keyof VenueRules, number>;
}

const SPACE_TYPE_KEYS = Object.keys(SPACE_TYPE_LABELS) as SpaceType[];
const AMENITY_KEYS = Object.keys(AMENITY_LABELS) as AmenityKey[];
const RULE_KEYS = Object.keys(RULE_LABELS) as (keyof VenueRules)[];

export function computeFacetCounts(venues: Venue[], filters: SearchFilters): FacetCounts {
  const withoutSpaceTypes = applyFilters(venues, { ...filters, spaceTypes: [] });
  const withoutAmenities = applyFilters(venues, { ...filters, amenities: [] });
  const withoutRules = applyFilters(venues, { ...filters, rules: {} });

  const spaceTypes = {} as Record<SpaceType, number>;
  for (const key of SPACE_TYPE_KEYS) {
    spaceTypes[key] = withoutSpaceTypes.filter((venue) => venue.spaceType === key).length;
  }

  const amenities = {} as Record<AmenityKey, number>;
  for (const key of AMENITY_KEYS) {
    amenities[key] = withoutAmenities.filter((venue) => venue.amenities.includes(key)).length;
  }

  const rules = {} as Record<keyof VenueRules, number>;
  for (const key of RULE_KEYS) {
    rules[key] = withoutRules.filter((venue) => venue.rules[key] === true).length;
  }

  return { spaceTypes, amenities, rules };
}
