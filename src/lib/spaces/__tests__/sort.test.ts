import { describe, expect, it } from "vitest";
import { sortVenues } from "../sort";
import type { VenueWithDistance } from "@/lib/types/spaces";

function makeVenue(overrides: Partial<VenueWithDistance>): VenueWithDistance {
  return {
    id: "v",
    slug: "v",
    name: "Venue",
    tagline: "",
    description: "",
    neighborhood: "SoMa",
    city: "San Francisco",
    coordinates: { lat: 0, lng: 0 },
    spaceType: "loft",
    eventTypes: [],
    maxCapacity: 100,
    seatedCapacity: 50,
    minBookingHours: 2,
    minHourlyRate: 100,
    maxHourlyRate: 200,
    images: [],
    visualAccent: ["#000", "#fff"],
    icon: "🏛️",
    amenities: [],
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
    distanceMiles: 1,
    ...overrides,
  };
}

describe("sortVenues", () => {
  it("sorts price ascending by minHourlyRate", () => {
    const venues = [
      makeVenue({ id: "b", minHourlyRate: 200 }),
      makeVenue({ id: "a", minHourlyRate: 100 }),
    ];
    expect(sortVenues(venues, "price_asc").map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("sorts price descending by maxHourlyRate", () => {
    const venues = [
      makeVenue({ id: "a", maxHourlyRate: 150 }),
      makeVenue({ id: "b", maxHourlyRate: 350 }),
    ];
    expect(sortVenues(venues, "price_desc").map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("sorts capacity descending", () => {
    const venues = [
      makeVenue({ id: "small", maxCapacity: 40 }),
      makeVenue({ id: "large", maxCapacity: 400 }),
    ];
    expect(sortVenues(venues, "capacity").map((v) => v.id)).toEqual(["large", "small"]);
  });

  it("recommends badged venues first, then nearest", () => {
    const venues = [
      makeVenue({ id: "far-badged", badge: "popular", distanceMiles: 3 }),
      makeVenue({ id: "near-unbadged", distanceMiles: 0.5 }),
      makeVenue({ id: "near-badged", badge: "new", distanceMiles: 1 }),
    ];
    expect(sortVenues(venues, "recommended").map((v) => v.id)).toEqual([
      "near-badged",
      "far-badged",
      "near-unbadged",
    ]);
  });

  it("does not mutate the input array", () => {
    const venues = [makeVenue({ id: "b", minHourlyRate: 200 }), makeVenue({ id: "a", minHourlyRate: 100 })];
    const original = venues.map((v) => v.id);
    sortVenues(venues, "price_asc");
    expect(venues.map((v) => v.id)).toEqual(original);
  });
});
