import { describe, expect, it } from "vitest";
import { getEventsDoneForVenue, getReviewsForVenue } from "../reviews";

describe("getReviewsForVenue", () => {
  it("is deterministic for the same venue id", () => {
    expect(getReviewsForVenue("v-neon-foundry")).toEqual(getReviewsForVenue("v-neon-foundry"));
  });

  it("returns the requested count", () => {
    expect(getReviewsForVenue("v-lantern-house", 4)).toHaveLength(4);
  });

  it("gives different venues a different starting review (not always the same one)", () => {
    const a = getReviewsForVenue("v-neon-foundry", 1)[0];
    const b = getReviewsForVenue("v-lantern-house", 1)[0];
    // Not a strict guarantee for every pair, but true for these two seed ids.
    expect(a.reviewerName === b.reviewerName && a.quote === b.quote).toBe(false);
  });
});

describe("getEventsDoneForVenue", () => {
  it("is deterministic for the same venue id", () => {
    expect(getEventsDoneForVenue("v-neon-foundry")).toBe(getEventsDoneForVenue("v-neon-foundry"));
  });

  it("returns a plausible positive number", () => {
    const count = getEventsDoneForVenue("v-neon-foundry");
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThan(70);
  });
});
