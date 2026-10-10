import { describe, expect, it } from "vitest";
import {
  needsViewerAction,
  resolveBookingProposalTone,
  resolveBookingTone,
  resolveContractTone,
  resolveDealProposalTone,
  resolveEngagementTone,
  resolveEventNeedTone,
  resolveProposalTone,
  resolveVendorProfileTone,
  type StatusTone,
  type ViewerRole,
} from "../statusTone";
import type { BookingStatus } from "@/lib/types/spaces";
import type {
  BookingContractStatus,
  BookingProposalStatus,
  DealProposalStatus,
  EngagementStatus,
  EventNeedStatus,
  ProposalStatus,
  VendorProfileStatus,
} from "@/lib/types/vendors";

/*
 * Every member of every union, listed literally rather than derived from the
 * type. If someone adds a status, TypeScript flags the switch in statusTone.ts
 * as non-exhaustive AND these arrays stop covering it — the test is the second
 * net, for the case where a `default` branch gets added to silence the first.
 */
const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "declined"];

const PROPOSAL_STATUSES: ProposalStatus[] = [
  "draft",
  "submitted",
  "shortlisted",
  "in_discussion",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
  "canceled",
  "closed_opportunity_filled",
];

const ENGAGEMENT_STATUSES: EngagementStatus[] = [
  "pending_vendor_confirmation",
  "confirmed",
  "in_progress",
  "completed",
  "declined_by_vendor",
  "canceled_by_organizer",
  "canceled_by_vendor",
  "disputed",
];

const EVENT_NEED_STATUSES: EventNeedStatus[] = [
  "draft",
  "published",
  "paused",
  "filled",
  "closed",
  "canceled",
];

const VENDOR_PROFILE_STATUSES: VendorProfileStatus[] = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "suspended",
];

const BOOKING_PROPOSAL_STATUSES: BookingProposalStatus[] = ["sent", "accepted", "declined"];
const DEAL_PROPOSAL_STATUSES: DealProposalStatus[] = ["sent", "accepted", "declined", "superseded"];
const CONTRACT_STATUSES: BookingContractStatus[] = ["sent", "signed", "declined", "withdrawn"];

const VIEWERS: ViewerRole[] = ["organizer", "vendor", "venue_operator"];
const TONES: StatusTone[] = ["ok", "wait", "act", "muted"];

function expectValid(descriptor: { tone: StatusTone; label: string }) {
  expect(TONES).toContain(descriptor.tone);
  // A badge must never render as an empty pill — the label is the part that
  // works without color.
  expect(descriptor.label.trim().length).toBeGreaterThan(0);
}

describe("exhaustiveness", () => {
  it("maps every status of every union, for every viewer, to a valid tone and a non-empty label", () => {
    for (const viewer of VIEWERS) {
      for (const status of BOOKING_STATUSES) expectValid(resolveBookingTone(status, viewer));
      for (const status of PROPOSAL_STATUSES) expectValid(resolveProposalTone(status, viewer));
      for (const status of ENGAGEMENT_STATUSES) expectValid(resolveEngagementTone(status, viewer));
      for (const status of BOOKING_PROPOSAL_STATUSES) {
        expectValid(resolveBookingProposalTone(status, viewer));
      }
      for (const status of CONTRACT_STATUSES) expectValid(resolveContractTone(status, viewer));
      for (const status of DEAL_PROPOSAL_STATUSES) {
        for (const sender of VIEWERS) {
          expectValid(resolveDealProposalTone(status, viewer, sender));
        }
      }
    }
    for (const status of EVENT_NEED_STATUSES) expectValid(resolveEventNeedTone(status));
    for (const status of VENDOR_PROFILE_STATUSES) expectValid(resolveVendorProfileTone(status));
  });
});

describe("color by whose move it is", () => {
  it("flips a pending engagement between the two parties", () => {
    const forVendor = resolveEngagementTone("pending_vendor_confirmation", "vendor");
    const forOrganizer = resolveEngagementTone("pending_vendor_confirmation", "organizer");

    expect(forVendor.tone).toBe("act");
    expect(forOrganizer.tone).toBe("wait");
    // Same state, different sentence — that's the whole point of the viewer arg.
    expect(forVendor.label).not.toBe(forOrganizer.label);
  });

  it("flips a pending booking between planner and host", () => {
    expect(resolveBookingTone("pending", "venue_operator").tone).toBe("act");
    expect(resolveBookingTone("pending", "organizer").tone).toBe("wait");
  });

  it("puts a new bid on the organizer and leaves the vendor waiting", () => {
    expect(resolveProposalTone("submitted", "organizer").tone).toBe("act");
    expect(resolveProposalTone("submitted", "vendor").tone).toBe("wait");
  });

  it("asks the planner to sign a sent contract and the host to wait", () => {
    expect(resolveContractTone("sent", "organizer").tone).toBe("act");
    expect(resolveContractTone("sent", "venue_operator").tone).toBe("wait");
  });

  it("puts an open deal round on whoever did not send it", () => {
    expect(resolveDealProposalTone("sent", "organizer", "vendor").tone).toBe("act");
    expect(resolveDealProposalTone("sent", "vendor", "vendor").tone).toBe("wait");
    expect(resolveDealProposalTone("sent", "vendor", "organizer").tone).toBe("act");
  });

  it("treats a dispute as actionable for everyone", () => {
    for (const viewer of VIEWERS) {
      expect(resolveEngagementTone("disputed", viewer).tone).toBe("act");
    }
  });
});

describe("settled and dead states", () => {
  it("never asks anyone to act on a state that is over", () => {
    const terminal: EngagementStatus[] = [
      "completed",
      "declined_by_vendor",
      "canceled_by_organizer",
      "canceled_by_vendor",
    ];
    for (const viewer of VIEWERS) {
      for (const status of terminal) {
        expect(resolveEngagementTone(status, viewer).tone).not.toBe("act");
      }
      for (const status of ["declined", "withdrawn", "expired", "canceled"] as ProposalStatus[]) {
        expect(resolveProposalTone(status, viewer).tone).toBe("muted");
      }
    }
  });

  it("reads a confirmed booking and a signed contract as settled", () => {
    expect(resolveBookingTone("confirmed", "organizer").tone).toBe("ok");
    expect(resolveContractTone("signed", "organizer").tone).toBe("ok");
  });

  /*
   * No money moves through Foundry (Phase 7). An accepted deposit request
   * records that the planner agreed to pay it, off-platform — so the badge may
   * never imply the money arrived.
   */
  it("never labels an accepted booking proposal as paid", () => {
    for (const viewer of VIEWERS) {
      const label = resolveBookingProposalTone("accepted", viewer).label.toLowerCase();
      expect(label).not.toContain("paid");
      expect(label).not.toContain("settled");
    }
  });
});

describe("needsViewerAction", () => {
  it("is true only for the act tone", () => {
    expect(needsViewerAction(resolveEngagementTone("pending_vendor_confirmation", "vendor"))).toBe(true);
    expect(needsViewerAction(resolveEngagementTone("pending_vendor_confirmation", "organizer"))).toBe(false);
    expect(needsViewerAction(resolveEngagementTone("completed", "vendor"))).toBe(false);
  });
});
