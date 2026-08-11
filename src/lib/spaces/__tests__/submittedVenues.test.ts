import { describe, expect, it } from "vitest";
import { selectVisibleSeedVenues } from "../submittedVenues";
import type { Venue } from "@/lib/types/spaces";

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "v-neon-foundry",
    slug: "neon-foundry",
    name: "Neon Foundry",
    tagline: "",
    description: "",
    neighborhood: "Mission District",
    city: "San Francisco",
    coordinates: { lat: 37.7509, lng: -122.4153 },
    spaceType: "warehouse",
    eventTypes: [],
    maxCapacity: 100,
    seatedCapacity: 60,
    minBookingHours: 3,
    minHourlyRate: 100,
    maxHourlyRate: 200,
    images: [],
    visualAccent: ["#000", "#fff"],
    icon: "🏭",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    exactAddress: "Address on file",
    ...overrides,
  };
}

describe("selectVisibleSeedVenues", () => {
  it("returns all seed venues when nothing has been submitted/adopted", () => {
    const seeds = [makeVenue({ id: "v-a" }), makeVenue({ id: "v-b" })];
    expect(selectVisibleSeedVenues(seeds, [])).toEqual(seeds);
  });

  it("excludes a seed venue whose id has a submitted/adopted copy", () => {
    const seeds = [makeVenue({ id: "v-a" }), makeVenue({ id: "v-b" })];
    const submitted = [makeVenue({ id: "v-a", ownerId: "owner-1" })];
    const visible = selectVisibleSeedVenues(seeds, submitted);
    expect(visible.map((v) => v.id)).toEqual(["v-b"]);
  });

  it("returns an empty array when every seed venue has been adopted", () => {
    const seeds = [makeVenue({ id: "v-a" })];
    const submitted = [makeVenue({ id: "v-a", ownerId: "owner-1" })];
    expect(selectVisibleSeedVenues(seeds, submitted)).toEqual([]);
  });
});
