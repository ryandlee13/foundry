import { getVenueBySlug } from "./venues";
import type { Venue } from "@/lib/types/spaces";

/**
 * The homepage's Featured Spaces lineup.
 *
 * Deliberately a list of slugs resolved against the real venue data rather
 * than a second copy of name/capacity/price: the homepage can never drift out
 * of sync with what /spaces/[slug] actually shows. Swapping this for a live
 * query later means replacing getFeaturedVenues() and nothing else.
 *
 * `category` is a homepage-facing grouping, not `Venue.spaceType` — "Nightlife
 * Spaces" isn't a space type at all (Neon Foundry is a warehouse), and
 * "Rooftops" reads better than the SPACE_TYPE_LABELS singular. Keep one venue
 * per category so the row shows the breadth of inventory rather than three
 * rooftops.
 */
const FEATURED: { slug: string; category: string }[] = [
  { slug: "skyline-atrium", category: "Rooftops" },
  { slug: "last-call", category: "Restaurants" },
  { slug: "harbor-room", category: "Lofts" },
  { slug: "sanctuary-hall", category: "Galleries" },
  { slug: "the-green-room", category: "Private Dining" },
  { slug: "neon-foundry", category: "Nightlife Spaces" },
];

export interface FeaturedVenue {
  venue: Venue;
  category: string;
}

/** The curated slugs, in order. Exported so a test can assert they all resolve. */
export const FEATURED_VENUE_SLUGS: readonly string[] = FEATURED.map((entry) => entry.slug);

/**
 * Resolves the lineup. A slug that no longer exists is skipped rather than
 * crashing the homepage — the sibling test is what catches it at build time.
 */
export function getFeaturedVenues(): FeaturedVenue[] {
  return FEATURED.flatMap(({ slug, category }) => {
    const venue = getVenueBySlug(slug);
    return venue ? [{ venue, category }] : [];
  });
}
