import { describe, expect, it } from "vitest";
import { normalizeStoredThread, isProposalThread, isBookingThread } from "../messages";

describe("normalizeStoredThread", () => {
  it("backfills a legacy record (no kind, has proposalId + vendorOwnerId) as a proposal thread", () => {
    const legacy = {
      id: "t1",
      proposalId: "p1",
      eventNeedId: "n1",
      engagementId: null,
      organizerId: "org-1",
      vendorOwnerId: "vendor-owner-1",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const result = normalizeStoredThread(legacy);
    expect(result).toEqual({
      kind: "proposal",
      id: "t1",
      organizerId: "org-1",
      counterpartyId: "vendor-owner-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      proposalId: "p1",
      eventNeedId: "n1",
      engagementId: null,
    });
  });

  it("round-trips a proposal thread already in the new shape", () => {
    const modern = {
      kind: "proposal",
      id: "t1",
      organizerId: "org-1",
      counterpartyId: "vendor-owner-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      proposalId: "p1",
      eventNeedId: "n1",
      engagementId: "eng-1",
    };
    expect(normalizeStoredThread(modern)).toEqual(modern);
  });

  it("round-trips a booking thread", () => {
    const booking = {
      kind: "booking",
      id: "t2",
      organizerId: "org-1",
      counterpartyId: "venue-owner-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      bookingId: "b1",
      venueId: "v1",
    };
    expect(normalizeStoredThread(booking)).toEqual(booking);
  });

  it("returns null for an unrecognizable record", () => {
    expect(normalizeStoredThread({})).toBeNull();
    expect(normalizeStoredThread(null)).toBeNull();
    expect(normalizeStoredThread("not an object")).toBeNull();
    expect(normalizeStoredThread({ id: "t1", organizerId: "org-1", createdAt: "2026-01-01" })).toBeNull();
  });
});

describe("isProposalThread / isBookingThread", () => {
  const proposal = {
    kind: "proposal" as const,
    id: "t1",
    organizerId: "org-1",
    counterpartyId: "vendor-owner-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    proposalId: "p1",
    eventNeedId: "n1",
    engagementId: null,
  };
  const booking = {
    kind: "booking" as const,
    id: "t2",
    organizerId: "org-1",
    counterpartyId: "venue-owner-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    bookingId: "b1",
    venueId: "v1",
  };

  it("distinguishes proposal vs booking threads", () => {
    expect(isProposalThread(proposal)).toBe(true);
    expect(isProposalThread(booking)).toBe(false);
    expect(isBookingThread(booking)).toBe(true);
    expect(isBookingThread(proposal)).toBe(false);
  });
});
