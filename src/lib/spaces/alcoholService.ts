import type { AmenityKey, VenueRules } from "@/lib/types/spaces";

/**
 * What a planner actually wants to know about drinks: **do I have to hire a
 * bartender, and do I have to bring the alcohol?**
 *
 * "Alcohol allowed" answered neither. The venue already stores everything
 * needed — the `alcoholAllowed` rule, the `bar` amenity, the
 * `bartenders_available` amenity — but spread across three lists, so a planner
 * had to notice all three and work out the implication themselves. This says it
 * in one line.
 *
 * Pure. Claims nothing the listing doesn't state: a venue with a bar but no
 * bartenders listed is reported as "bring your own bartender", because that is
 * what the absence means for the person planning around it.
 */

export interface AlcoholService {
  /** One line for the venue's policy list. */
  label: string;
  /** What it means for the planner's to-do list. Null when there's nothing to add. */
  detail: string | null;
}

export function describeAlcoholService(input: {
  rules: Pick<VenueRules, "alcoholAllowed">;
  amenities: AmenityKey[];
}): AlcoholService {
  if (!input.rules.alcoholAllowed) {
    return { label: "No alcohol permitted", detail: null };
  }

  const hasBar = input.amenities.includes("bar");
  const hasBartenders = input.amenities.includes("bartenders_available");

  if (hasBar && hasBartenders) {
    return {
      label: "Bar on site, bartenders provided (21+)",
      detail: "You don't need to hire bartenders for this space.",
    };
  }

  if (hasBar) {
    return {
      label: "Bar on site, bring your own bartender (21+)",
      detail: "The space has a bar, but no bar staff — you'll need to hire bartenders.",
    };
  }

  if (hasBartenders) {
    return {
      label: "BYOB, bartenders provided (21+)",
      detail: "Bar staff come with the space; you supply the drinks and any bar setup.",
    };
  }

  return {
    label: "BYOB, no bar on site (21+)",
    detail: "You'll need to bring the drinks and hire your own bartenders.",
  };
}
