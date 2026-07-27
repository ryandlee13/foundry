import { describe, expect, it } from "vitest";
import { checkReviewEligibility, computeAverageRating } from "../reviews";
import type { VendorEngagement, VendorReview } from "@/lib/types/vendors";

function makeEngagement(overrides: Partial<VendorEngagement> = {}): Pick<VendorEngagement, "status" | "organizerId"> {
  return { status: "completed", organizerId: "organizer-1", ...overrides };
}

function makeReview(overrides: Partial<VendorReview> = {}): VendorReview {
  return {
    id: "r1",
    engagementId: "e1",
    organizerId: "organizer-1",
    vendorProfileId: "vendor-1",
    overallRating: 5,
    qualityRating: null,
    communicationRating: null,
    reliabilityRating: null,
    professionalismRating: null,
    valueRating: null,
    reviewText: "Great!",
    wouldWorkWithAgain: true,
    vendorResponse: null,
    status: "published",
    flaggedReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("checkReviewEligibility", () => {
  it("rejects when the engagement doesn't exist", () => {
    expect(checkReviewEligibility(undefined, "organizer-1", undefined).allowed).toBe(false);
  });

  it("rejects when the engagement isn't completed", () => {
    const result = checkReviewEligibility(makeEngagement({ status: "confirmed" }), "organizer-1", undefined);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/completed/i);
  });

  it("rejects a requester who isn't the organizer on the engagement", () => {
    const result = checkReviewEligibility(makeEngagement(), "someone-else", undefined);
    expect(result.allowed).toBe(false);
  });

  it("rejects when a review already exists for the engagement", () => {
    const result = checkReviewEligibility(makeEngagement(), "organizer-1", makeReview());
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/already/i);
  });

  it("allows a completed engagement, matching organizer, no existing review", () => {
    const result = checkReviewEligibility(makeEngagement(), "organizer-1", undefined);
    expect(result).toEqual({ allowed: true, reason: null });
  });
});

describe("computeAverageRating", () => {
  it("returns null average and zero count for no reviews", () => {
    expect(computeAverageRating([])).toEqual({ average: null, count: 0 });
  });

  it("averages overallRating across published reviews", () => {
    const reviews = [makeReview({ overallRating: 5 }), makeReview({ overallRating: 3 })];
    expect(computeAverageRating(reviews)).toEqual({ average: 4, count: 2 });
  });

  it("rounds to one decimal place", () => {
    const reviews = [makeReview({ overallRating: 5 }), makeReview({ overallRating: 4 }), makeReview({ overallRating: 4 })];
    expect(computeAverageRating(reviews).average).toBe(4.3);
  });

  it("excludes hidden, flagged, and removed reviews from the average", () => {
    const reviews = [
      makeReview({ overallRating: 5, status: "published" }),
      makeReview({ overallRating: 1, status: "hidden" }),
      makeReview({ overallRating: 1, status: "flagged" }),
      makeReview({ overallRating: 1, status: "removed" }),
    ];
    expect(computeAverageRating(reviews)).toEqual({ average: 5, count: 1 });
  });
});
