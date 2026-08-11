import { describe, expect, it } from "vitest";
import { selectBillingActivation, type VenueBillingActivation } from "../venueBilling";

describe("selectBillingActivation", () => {
  const activations: VenueBillingActivation[] = [
    { ownerId: "owner-1", activatedAt: "2026-01-01T00:00:00.000Z", triggeredByVenueId: "v1" },
    { ownerId: "owner-2", activatedAt: "2026-02-01T00:00:00.000Z", triggeredByVenueId: "v2" },
  ];

  it("finds the activation for a given owner", () => {
    expect(selectBillingActivation(activations, "owner-2")?.triggeredByVenueId).toBe("v2");
  });

  it("returns undefined when the owner has no activation", () => {
    expect(selectBillingActivation(activations, "owner-3")).toBeUndefined();
  });

  it("returns undefined for an empty list", () => {
    expect(selectBillingActivation([], "owner-1")).toBeUndefined();
  });
});
