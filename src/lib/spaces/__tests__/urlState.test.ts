import { describe, expect, it } from "vitest";
import { filtersToSearchParams, getDefaultFilters, searchParamsToFilters } from "../urlState";
import type { SearchFilters } from "@/lib/types/spaces";

describe("filtersToSearchParams / searchParamsToFilters", () => {
  it("round-trips the default filters", () => {
    const defaults = getDefaultFilters();
    const params = filtersToSearchParams(defaults);
    const parsed = searchParamsToFilters(params);
    expect(parsed.location.label).toBe(defaults.location.label);
    expect(parsed.radiusMiles).toBe(defaults.radiusMiles);
    expect(parsed.sort).toBe("recommended");
  });

  it("round-trips a fully-populated filter set", () => {
    const filters: SearchFilters = {
      ...getDefaultFilters(),
      location: { label: "Mission District", coordinates: { lat: 37.7599, lng: -122.4148 } },
      radiusMiles: 5,
      attendees: 80,
      eventTypes: ["party", "dinner"],
      minPrice: 100,
      maxPrice: 300,
      minBookingHours: 3,
      spaceTypes: ["warehouse"],
      amenities: ["bar", "wifi"],
      rules: { alcoholAllowed: true, coiRequired: true },
      sort: "price_asc",
    };

    const parsed = searchParamsToFilters(filtersToSearchParams(filters));

    expect(parsed.location.label).toBe("Mission District");
    expect(parsed.location.coordinates).toEqual({ lat: 37.7599, lng: -122.4148 });
    expect(parsed.radiusMiles).toBe(5);
    expect(parsed.attendees).toBe(80);
    expect(parsed.eventTypes).toEqual(["party", "dinner"]);
    expect(parsed.minPrice).toBe(100);
    expect(parsed.maxPrice).toBe(300);
    expect(parsed.minBookingHours).toBe(3);
    expect(parsed.spaceTypes).toEqual(["warehouse"]);
    expect(parsed.amenities).toEqual(["bar", "wifi"]);
    expect(parsed.rules).toEqual({ alcoholAllowed: true, coiRequired: true });
    expect(parsed.sort).toBe("price_asc");
  });

  it("ignores unknown enum values instead of throwing", () => {
    const params = new URLSearchParams({
      lat: "37.77",
      lng: "-122.4",
      radius: "5",
      eventType: "party,not-a-real-type",
      sort: "not-a-real-sort",
    });
    const parsed = searchParamsToFilters(params);
    expect(parsed.eventTypes).toEqual(["party"]);
    expect(parsed.sort).toBe("recommended");
  });

  it("falls back to the default location when coordinates are missing", () => {
    const parsed = searchParamsToFilters(new URLSearchParams());
    const defaults = getDefaultFilters();
    expect(parsed.location).toEqual(defaults.location);
    expect(parsed.radiusMiles).toBe(defaults.radiusMiles);
  });
});
