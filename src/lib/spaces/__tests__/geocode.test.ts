import { describe, expect, it } from "vitest";
import { resolveAddress } from "../geocode";
import { SF_LOCATIONS } from "../locations";

const NEIGHBORHOODS = SF_LOCATIONS.filter((l) => l.kind === "neighborhood").map((l) => l.label);

describe("resolveAddress", () => {
  it("matches a known ZIP code", () => {
    const result = resolveAddress("123 Valencia St, San Francisco, CA 94110");
    expect(result.neighborhood).toBe("Mission District");
    expect(result.coordinates).toEqual({ lat: 37.7509, lng: -122.4153 });
  });

  it("matches a neighborhood name mentioned in the address", () => {
    const result = resolveAddress("100 Some St, Chinatown, San Francisco, CA");
    expect(result.neighborhood).toBe("Chinatown");
  });

  it("falls back deterministically for an address with no recognizable ZIP or neighborhood", () => {
    const first = resolveAddress("42 Nowhere Ln");
    const second = resolveAddress("42 Nowhere Ln");
    expect(first).toEqual(second);
    expect(NEIGHBORHOODS).toContain(first.neighborhood);
  });

  it("is case-insensitive for neighborhood matching", () => {
    const result = resolveAddress("1 Market St, hayes valley");
    expect(result.neighborhood).toBe("Hayes Valley");
  });
});
