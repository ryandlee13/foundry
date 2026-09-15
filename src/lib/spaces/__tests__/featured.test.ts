import { describe, expect, it } from "vitest";
import { FEATURED_VENUE_SLUGS, getFeaturedVenues } from "../featured";
import { getVenueBySlug } from "../venues";

describe("featured venues", () => {
  it("resolves every curated slug", () => {
    // The homepage silently drops an unresolvable slug rather than crashing,
    // so this is the only thing standing between a venue rename and a
    // quietly short Featured Spaces row.
    const unresolved = FEATURED_VENUE_SLUGS.filter((slug) => !getVenueBySlug(slug));
    expect(unresolved).toEqual([]);
  });

  it("returns one entry per curated slug, in order", () => {
    const featured = getFeaturedVenues();
    expect(featured.map((entry) => entry.venue.slug)).toEqual([...FEATURED_VENUE_SLUGS]);
  });

  it("covers six distinct categories", () => {
    const categories = getFeaturedVenues().map((entry) => entry.category);
    expect(new Set(categories).size).toBe(categories.length);
    expect(categories).toHaveLength(6);
  });

  it("carries the pricing and capacity the detail page shows", () => {
    // Guards the reason this module stores slugs instead of copied fields.
    for (const { venue } of getFeaturedVenues()) {
      const source = getVenueBySlug(venue.slug);
      expect(venue.minHourlyRate).toBe(source?.minHourlyRate);
      expect(venue.maxCapacity).toBe(source?.maxCapacity);
    }
  });
});
