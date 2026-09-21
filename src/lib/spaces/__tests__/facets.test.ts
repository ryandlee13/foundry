import { describe, expect, it } from "vitest";
import { computeFacetCounts } from "../facets";
import { getDefaultFilters } from "../urlState";
import type { Venue } from "@/lib/types/spaces";

const CENTER = { lat: 37.788, lng: -122.4075 };

function makeVenue(overrides: Partial<Venue>): Venue {
  return {
    id: "v-test",
    slug: "test-venue",
    name: "Test Venue",
    tagline: "A venue for testing.",
    description: "Test description.",
    neighborhood: "SoMa",
    city: "San Francisco",
    coordinates: CENTER,
    spaceType: "loft",
    eventTypes: ["party"],
    maxCapacity: 100,
    seatedCapacity: 50,
    minBookingHours: 3,
    minHourlyRate: 100,
    maxHourlyRate: 200,
    images: ["1"],
    visualAccent: ["#000000", "#ffffff"],
    icon: "🏛️",
    amenities: ["wifi"],
    rules: {
      alcoholAllowed: false,
      amplifiedMusicAllowed: false,
      outsideCateringAllowed: false,
      ticketedEventsAllowed: false,
      lateNightEventsAllowed: false,
      coiRequired: false,
      securityDepositRequired: false,
    },
    availabilityExamples: [],
    ownerId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    exactAddress: "123 Test St",
    ...overrides,
  };
}

const base = () => ({ ...getDefaultFilters(), radiusMiles: 50 });

describe("computeFacetCounts", () => {
  it("counts each option across the unfiltered set", () => {
    const venues = [
      makeVenue({ id: "a", spaceType: "loft", amenities: ["wifi", "bar"] }),
      makeVenue({ id: "b", spaceType: "loft", amenities: ["wifi"] }),
      makeVenue({ id: "c", spaceType: "rooftop", amenities: ["bar"] }),
    ];

    const counts = computeFacetCounts(venues, base());
    expect(counts.spaceTypes.loft).toBe(2);
    expect(counts.spaceTypes.rooftop).toBe(1);
    expect(counts.amenities.wifi).toBe(2);
    expect(counts.amenities.bar).toBe(2);
    expect(counts.amenities.kitchen).toBe(0);
  });

  it("keeps a dimension's own selection out of its counts", () => {
    // The whole point: with the amenity filter applied to its own facet,
    // every unticked amenity would read 0 and the panel would be useless.
    const venues = [
      makeVenue({ id: "a", amenities: ["wifi", "bar"] }),
      makeVenue({ id: "b", amenities: ["kitchen"] }),
    ];

    const counts = computeFacetCounts(venues, { ...base(), amenities: ["wifi"] });
    expect(counts.amenities.wifi).toBe(1);
    expect(counts.amenities.kitchen).toBe(1);
  });

  it("still applies every OTHER filter to a dimension's counts", () => {
    const venues = [
      makeVenue({ id: "small", maxCapacity: 40, spaceType: "loft" }),
      makeVenue({ id: "large", maxCapacity: 400, spaceType: "loft" }),
    ];

    const counts = computeFacetCounts(venues, { ...base(), attendees: 100 });
    // Only "large" clears the attendee count, so loft reads 1, not 2.
    expect(counts.spaceTypes.loft).toBe(1);
  });

  it("counts space types independently of the space-type selection", () => {
    const venues = [
      makeVenue({ id: "a", spaceType: "loft" }),
      makeVenue({ id: "b", spaceType: "gallery" }),
    ];

    const counts = computeFacetCounts(venues, { ...base(), spaceTypes: ["loft"] });
    expect(counts.spaceTypes.loft).toBe(1);
    expect(counts.spaceTypes.gallery).toBe(1);
  });

  it("counts only rules explicitly set to true", () => {
    const venues = [
      makeVenue({
        id: "a",
        rules: { ...makeVenue({}).rules, alcoholAllowed: true },
      }),
      makeVenue({ id: "b" }),
    ];

    const counts = computeFacetCounts(venues, base());
    expect(counts.rules.alcoholAllowed).toBe(1);
    expect(counts.rules.coiRequired).toBe(0);
  });

  it("returns an entry for every known option, including zeros", () => {
    const counts = computeFacetCounts([], base());
    expect(Object.values(counts.spaceTypes).every((n) => n === 0)).toBe(true);
    expect(Object.keys(counts.amenities)).toHaveLength(20);
    expect(Object.keys(counts.rules)).toHaveLength(7);
  });
});
