import { describe, expect, it } from "vitest";
import {
  applyFilters,
  filterByAmenities,
  filterByCapacity,
  filterByEventTypes,
  filterByMinBookingHours,
  filterByPrice,
  filterByRadius,
  filterByRules,
  filterBySpaceTypes,
  withDistance,
} from "../filters";
import { getDefaultFilters } from "../urlState";
import { VENUES } from "../venues";
import type { Venue, VenueWithDistance } from "@/lib/types/spaces";

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
    ...overrides,
  };
}

describe("filterByRadius", () => {
  it("excludes venues outside the radius and keeps venues inside it", () => {
    const near = withDistance([makeVenue({ id: "near", coordinates: CENTER })], CENTER)[0];
    const far = withDistance(
      [makeVenue({ id: "far", coordinates: { lat: 37.9, lng: -122.6 } })],
      CENTER
    )[0];
    const result = filterByRadius([near, far], 1);
    expect(result.map((v) => v.id)).toEqual(["near"]);
  });
});

describe("filterByCapacity", () => {
  it("keeps only venues that fit the requested attendee count", () => {
    const small = makeVenue({ id: "small", maxCapacity: 40 });
    const large = makeVenue({ id: "large", maxCapacity: 400 });
    expect(filterByCapacity([small, large], 100).map((v) => v.id)).toEqual(["large"]);
  });

  it("returns all venues when attendees is null", () => {
    const venues = [makeVenue({ id: "a" }), makeVenue({ id: "b" })];
    expect(filterByCapacity(venues, null)).toHaveLength(2);
  });
});

describe("filterByPrice", () => {
  it("excludes venues entirely below the minimum", () => {
    const cheap = makeVenue({ id: "cheap", minHourlyRate: 50, maxHourlyRate: 80 });
    const midRange = makeVenue({ id: "mid", minHourlyRate: 100, maxHourlyRate: 200 });
    expect(filterByPrice([cheap, midRange], 90, null).map((v) => v.id)).toEqual(["mid"]);
  });

  it("excludes venues entirely above the maximum", () => {
    const midRange = makeVenue({ id: "mid", minHourlyRate: 100, maxHourlyRate: 200 });
    const expensive = makeVenue({ id: "expensive", minHourlyRate: 400, maxHourlyRate: 600 });
    expect(filterByPrice([midRange, expensive], null, 250).map((v) => v.id)).toEqual(["mid"]);
  });

  it("keeps venues whose range overlaps the requested band", () => {
    const overlapping = makeVenue({ id: "overlap", minHourlyRate: 80, maxHourlyRate: 150 });
    expect(filterByPrice([overlapping], 100, 200).map((v) => v.id)).toEqual(["overlap"]);
  });
});

describe("filterByMinBookingHours", () => {
  it("keeps venues whose minimum is at or below the acceptable threshold", () => {
    const short = makeVenue({ id: "short", minBookingHours: 2 });
    const long = makeVenue({ id: "long", minBookingHours: 6 });
    expect(filterByMinBookingHours([short, long], 3).map((v) => v.id)).toEqual(["short"]);
  });
});

describe("filterBySpaceTypes", () => {
  it("matches any selected space type", () => {
    const warehouse = makeVenue({ id: "warehouse", spaceType: "warehouse" });
    const studio = makeVenue({ id: "studio", spaceType: "studio" });
    expect(
      filterBySpaceTypes([warehouse, studio], ["warehouse"]).map((v) => v.id)
    ).toEqual(["warehouse"]);
  });
});

describe("filterByEventTypes", () => {
  it("matches venues supporting at least one selected event type", () => {
    const wedding = makeVenue({ id: "wedding", eventTypes: ["wedding"] });
    const party = makeVenue({ id: "party", eventTypes: ["party"] });
    expect(filterByEventTypes([wedding, party], ["party"]).map((v) => v.id)).toEqual(["party"]);
  });
});

describe("filterByAmenities", () => {
  it("requires every selected amenity to be present", () => {
    const both = makeVenue({ id: "both", amenities: ["wifi", "bar"] });
    const onlyWifi = makeVenue({ id: "wifi-only", amenities: ["wifi"] });
    expect(
      filterByAmenities([both, onlyWifi], ["wifi", "bar"]).map((v) => v.id)
    ).toEqual(["both"]);
  });
});

describe("filterByRules", () => {
  it("keeps only venues satisfying every checked rule", () => {
    const allowsAlcohol = makeVenue({
      id: "alcohol",
      rules: {
        alcoholAllowed: true,
        amplifiedMusicAllowed: false,
        outsideCateringAllowed: false,
        ticketedEventsAllowed: false,
        lateNightEventsAllowed: false,
        coiRequired: false,
        securityDepositRequired: false,
      },
    });
    const dry = makeVenue({ id: "dry" });
    expect(
      filterByRules([allowsAlcohol, dry], { alcoholAllowed: true }).map((v) => v.id)
    ).toEqual(["alcohol"]);
  });

  it("returns all venues when no rules are checked", () => {
    const venues = [makeVenue({ id: "a" }), makeVenue({ id: "b" })];
    expect(filterByRules(venues, {})).toHaveLength(2);
  });
});

describe("applyFilters clearing behavior", () => {
  it("returns the full radius-filtered set when non-location filters are cleared", () => {
    const filters = getDefaultFilters();
    const withExtraFilters = { ...filters, minPrice: 500, maxPrice: 500 };
    const constrained = applyFilters(VENUES, withExtraFilters);
    const cleared = applyFilters(VENUES, filters);
    expect(cleared.length).toBeGreaterThanOrEqual(constrained.length);
  });
});

describe("default search (San Francisco, 1 mile)", () => {
  it("is not empty out of the box", () => {
    const filters = getDefaultFilters();
    const results: VenueWithDistance[] = applyFilters(VENUES, filters);
    expect(results.length).toBeGreaterThan(0);
  });
});
