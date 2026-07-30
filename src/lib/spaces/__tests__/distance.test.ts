import { describe, expect, it } from "vitest";
import { formatDistanceMiles, haversineDistanceMiles } from "../distance";

describe("haversineDistanceMiles", () => {
  it("returns 0 for identical coordinates", () => {
    const point = { lat: 37.7749, lng: -122.4194 };
    expect(haversineDistanceMiles(point, point)).toBeCloseTo(0, 5);
  });

  it("is symmetric", () => {
    const a = { lat: 37.7749, lng: -122.4194 };
    const b = { lat: 37.804, lng: -122.2711 };
    expect(haversineDistanceMiles(a, b)).toBeCloseTo(haversineDistanceMiles(b, a), 10);
  });

  it("matches a known SF distance within a reasonable tolerance", () => {
    // Union Square to Ferry Building, roughly ~0.9 miles apart.
    const unionSquare = { lat: 37.788, lng: -122.4075 };
    const ferryBuilding = { lat: 37.7955, lng: -122.3937 };
    const distance = haversineDistanceMiles(unionSquare, ferryBuilding);
    expect(distance).toBeGreaterThan(0.5);
    expect(distance).toBeLessThan(1.5);
  });
});

describe("formatDistanceMiles", () => {
  it("shows a sub-tenth label for very close venues", () => {
    expect(formatDistanceMiles(0.03)).toBe("< 0.1 mi");
  });

  it("rounds to one decimal under 10 miles", () => {
    expect(formatDistanceMiles(2.34)).toBe("2.3 mi");
  });

  it("rounds to a whole number at 10 miles or more", () => {
    expect(formatDistanceMiles(14.6)).toBe("15 mi");
  });
});
