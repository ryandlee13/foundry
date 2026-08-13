import { describe, expect, it } from "vitest";
import { computeVendorEarnings } from "../vendorEarnings";
import type { VendorEngagement } from "@/lib/types/vendors";

function engagement(overrides: Partial<VendorEngagement> = {}): VendorEngagement {
  return {
    id: "e-1",
    eventNeedId: "need-1",
    bookingId: "b-1",
    organizerId: "acct-1",
    vendorProfileId: "vp-1",
    acceptedProposalId: "p-1",
    agreedAmount: 500,
    pricingModel: "flat_fee",
    agreedDeliverables: "4-hour set",
    status: "completed",
    completedAt: "2026-03-10T00:00:00.000Z",
    canceledAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-03-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeVendorEarnings", () => {
  it("sums completed flat-fee gigs into the lifetime total", () => {
    const result = computeVendorEarnings([engagement()], "2026-03-20");
    expect(result.totalAmount).toBe(500);
    expect(result.completedGigCount).toBe(1);
  });

  it("scopes the month figure by completedAt", () => {
    const result = computeVendorEarnings(
      [
        engagement({ id: "e-1", completedAt: "2026-03-05T00:00:00.000Z" }),
        engagement({ id: "e-2", completedAt: "2026-02-05T00:00:00.000Z" }),
      ],
      "2026-03-20"
    );
    expect(result.totalAmount).toBe(1000);
    expect(result.monthAmount).toBe(500);
  });

  it("excludes rate-priced amounts from the money totals but still counts the gig", () => {
    const result = computeVendorEarnings([engagement({ pricingModel: "hourly", agreedAmount: 150 })], "2026-03-20");
    expect(result.totalAmount).toBe(0);
    expect(result.completedGigCount).toBe(1);
    expect(result.rateBasedCount).toBe(1);
  });

  it("counts package pricing as a real total", () => {
    const result = computeVendorEarnings([engagement({ pricingModel: "package", agreedAmount: 800 })], "2026-03-20");
    expect(result.totalAmount).toBe(800);
    expect(result.rateBasedCount).toBe(0);
  });

  it("counts confirmed and in-progress engagements as upcoming, not earned", () => {
    const result = computeVendorEarnings(
      [engagement({ id: "e-1", status: "confirmed" }), engagement({ id: "e-2", status: "in_progress" })],
      "2026-03-20"
    );
    expect(result.totalAmount).toBe(0);
    expect(result.completedGigCount).toBe(0);
    expect(result.upcomingGigCount).toBe(2);
  });

  it("ignores canceled and declined engagements", () => {
    const result = computeVendorEarnings(
      [
        engagement({ id: "e-1", status: "canceled_by_organizer" }),
        engagement({ id: "e-2", status: "declined_by_vendor" }),
        engagement({ id: "e-3", status: "pending_vendor_confirmation" }),
      ],
      "2026-03-20"
    );
    expect(result.totalAmount).toBe(0);
    expect(result.completedGigCount).toBe(0);
    expect(result.upcomingGigCount).toBe(0);
  });

  it("falls back to updatedAt when completedAt was never stamped", () => {
    const result = computeVendorEarnings(
      [engagement({ completedAt: null, updatedAt: "2026-03-11T00:00:00.000Z" })],
      "2026-03-20"
    );
    expect(result.monthAmount).toBe(500);
  });

  it("accepts a full ISO timestamp as today", () => {
    const result = computeVendorEarnings([engagement()], "2026-03-20T14:33:00.000Z");
    expect(result.monthAmount).toBe(500);
  });
});
