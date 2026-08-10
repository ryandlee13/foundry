import { describe, expect, it } from "vitest";
import { findActiveProposal, selectProposalsToCloseOnFill } from "../proposals";
import type { VendorProposal } from "@/lib/types/vendors";

function makeProposal(overrides: Partial<VendorProposal> = {}): VendorProposal {
  return {
    id: "p1",
    eventNeedId: "need-1",
    vendorProfileId: "vendor-1",
    proposedAmount: 500,
    pricingModel: "flat_fee",
    message: "",
    deliverables: "",
    equipmentIncluded: "",
    availabilityConfirmed: true,
    setupRequirements: "",
    portfolioLinkIds: [],
    questionsForOrganizer: "",
    expiresAt: "2026-12-31T00:00:00.000Z",
    status: "submitted",
    declineReason: null,
    submittedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("findActiveProposal (one active bid per need)", () => {
  it("finds a submitted proposal for the same vendor + need", () => {
    const proposals = [makeProposal({ id: "a", status: "submitted" })];
    expect(findActiveProposal(proposals, "vendor-1", "need-1")?.id).toBe("a");
  });

  it("finds a shortlisted proposal too", () => {
    const proposals = [makeProposal({ id: "a", status: "shortlisted" })];
    expect(findActiveProposal(proposals, "vendor-1", "need-1")?.id).toBe("a");
  });

  it("finds an in-discussion proposal too", () => {
    const proposals = [makeProposal({ id: "a", status: "in_discussion" })];
    expect(findActiveProposal(proposals, "vendor-1", "need-1")?.id).toBe("a");
  });

  it("does not treat declined/withdrawn/expired/accepted/closed proposals as active", () => {
    for (const status of [
      "declined",
      "withdrawn",
      "expired",
      "accepted",
      "canceled",
      "draft",
      "closed_opportunity_filled",
    ] as const) {
      const proposals = [makeProposal({ id: "a", status })];
      expect(findActiveProposal(proposals, "vendor-1", "need-1")).toBeUndefined();
    }
  });

  it("ignores proposals from a different vendor", () => {
    const proposals = [makeProposal({ id: "a", vendorProfileId: "vendor-2" })];
    expect(findActiveProposal(proposals, "vendor-1", "need-1")).toBeUndefined();
  });

  it("ignores proposals for a different event need", () => {
    const proposals = [makeProposal({ id: "a", eventNeedId: "need-2" })];
    expect(findActiveProposal(proposals, "vendor-1", "need-1")).toBeUndefined();
  });

  it("allows a vendor's active bids on two different needs simultaneously", () => {
    const proposals = [
      makeProposal({ id: "a", eventNeedId: "need-1" }),
      makeProposal({ id: "b", eventNeedId: "need-2" }),
    ];
    expect(findActiveProposal(proposals, "vendor-1", "need-1")?.id).toBe("a");
    expect(findActiveProposal(proposals, "vendor-1", "need-2")?.id).toBe("b");
  });
});

describe("selectProposalsToCloseOnFill", () => {
  it("closes other submitted/shortlisted/in_discussion proposals, excluding the winner", () => {
    const proposals = [
      makeProposal({ id: "winner", status: "accepted" }),
      makeProposal({ id: "a", status: "submitted" }),
      makeProposal({ id: "b", status: "shortlisted" }),
      makeProposal({ id: "c", status: "in_discussion" }),
    ];
    expect(selectProposalsToCloseOnFill(proposals, "winner").sort()).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when only the winner exists", () => {
    const proposals = [makeProposal({ id: "winner", status: "accepted" })];
    expect(selectProposalsToCloseOnFill(proposals, "winner")).toEqual([]);
  });

  it("ignores already-terminal proposals", () => {
    const proposals = [
      makeProposal({ id: "winner", status: "accepted" }),
      makeProposal({ id: "a", status: "declined" }),
      makeProposal({ id: "b", status: "withdrawn" }),
      makeProposal({ id: "c", status: "expired" }),
      makeProposal({ id: "d", status: "closed_opportunity_filled" }),
    ];
    expect(selectProposalsToCloseOnFill(proposals, "winner")).toEqual([]);
  });
});
