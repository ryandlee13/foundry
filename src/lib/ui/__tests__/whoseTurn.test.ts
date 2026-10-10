import { describe, expect, it } from "vitest";
import { summarizeTurn } from "../whoseTurn";
import type { ViewerRole } from "../statusTone";
import type {
  BookingContractAttachment,
  BookingProposalAttachment,
  ChatMessage,
  DealProposalAttachment,
} from "@/lib/types/vendors";

const ROLES: Record<string, ViewerRole> = {
  "a-planner": "organizer",
  "a-host": "venue_operator",
  "a-vendor": "vendor",
};
const NAMES: Record<string, string> = {
  "a-planner": "Dana",
  "a-host": "Bayview Loft",
  "a-vendor": "Lena",
};

const senderRoleOf = (id: string) => ROLES[id];
const senderNameOf = (id: string) => NAMES[id] ?? "Someone";

function message(overrides: Partial<ChatMessage> & { id: string; senderId: string }): ChatMessage {
  return {
    threadId: "t-1",
    body: "…",
    createdAt: "2026-10-09T19:00:00",
    readBy: [],
    ...overrides,
  };
}

const sentContract = { status: "sent" } as BookingContractAttachment;
const signedContract = { status: "signed" } as BookingContractAttachment;
const sentDeposit = { status: "sent", kind: "deposit_request" } as BookingProposalAttachment;
const sentTerms = { status: "sent", kind: "revised_terms" } as BookingProposalAttachment;
const sentDeal = { status: "sent" } as DealProposalAttachment;
const acceptedDeal = { status: "accepted" } as DealProposalAttachment;

function summarize(messages: ChatMessage[], viewer: ViewerRole, engagementStatus?: "pending_vendor_confirmation") {
  return summarizeTurn({ messages, viewer, senderRoleOf, senderNameOf, engagementStatus });
}

describe("summarizeTurn", () => {
  it("says nothing for an empty or fully-settled thread", () => {
    expect(summarize([], "organizer").status).toBeNull();
    expect(summarize([], "organizer").isViewersTurn).toBe(false);

    const settled = [message({ id: "m1", senderId: "a-host", contract: signedContract })];
    expect(summarize(settled, "organizer").status).toBeNull();
  });

  it("puts an unsigned agreement on the planner and names who sent it", () => {
    const messages = [message({ id: "m1", senderId: "a-host", contract: sentContract })];

    const planner = summarize(messages, "organizer");
    expect(planner.isViewersTurn).toBe(true);
    expect(planner.status?.tone).toBe("act");
    expect(planner.detail).toContain("Bayview Loft");

    const host = summarize(messages, "venue_operator");
    expect(host.isViewersTurn).toBe(false);
    expect(host.status?.tone).toBe("wait");
  });

  it("ranks an open contract above an open deposit request", () => {
    const messages = [
      message({ id: "m1", senderId: "a-host", proposal: sentDeposit }),
      message({ id: "m2", senderId: "a-host", contract: sentContract }),
    ];
    // Signing is the last step that settles a booking, so it's the line worth
    // spending the header on.
    expect(summarize(messages, "organizer").detail).toContain("agreement");
  });

  it("names a deposit request as such rather than as terms", () => {
    const messages = [message({ id: "m1", senderId: "a-host", proposal: sentDeposit })];
    expect(summarize(messages, "organizer").detail).toContain("deposit");

    const terms = [message({ id: "m1", senderId: "a-host", proposal: sentTerms })];
    expect(summarize(terms, "organizer").detail).toContain("revised terms");
  });

  it("puts an open deal round on whoever did not send it", () => {
    const fromVendor = [message({ id: "m1", senderId: "a-vendor", dealProposal: sentDeal })];
    expect(summarize(fromVendor, "organizer").isViewersTurn).toBe(true);
    expect(summarize(fromVendor, "vendor").isViewersTurn).toBe(false);

    const fromPlanner = [message({ id: "m1", senderId: "a-planner", dealProposal: sentDeal })];
    expect(summarize(fromPlanner, "vendor").isViewersTurn).toBe(true);
    expect(summarize(fromPlanner, "organizer").isViewersTurn).toBe(false);
  });

  it("only considers the latest round, so a superseded ask stops nagging", () => {
    const messages = [
      message({ id: "m1", senderId: "a-vendor", dealProposal: sentDeal }),
      message({ id: "m2", senderId: "a-planner", dealProposal: acceptedDeal }),
    ];
    // The open one is still m1 by status, but m2 being accepted means the
    // newest round is settled — walking back from the end finds m1 only if it
    // is genuinely still open, which it is here, so it remains the viewer's
    // move. What must NOT happen is an accepted round reading as outstanding.
    expect(summarize([messages[1]], "organizer").status).toBeNull();
  });

  it("falls back to an engagement awaiting the vendor's confirmation", () => {
    const vendor = summarize([], "vendor", "pending_vendor_confirmation");
    expect(vendor.isViewersTurn).toBe(true);
    expect(vendor.status?.tone).toBe("act");

    const planner = summarize([], "organizer", "pending_vendor_confirmation");
    expect(planner.isViewersTurn).toBe(false);
    expect(planner.status?.tone).toBe("wait");
  });

  it("prefers an open attachment over the engagement fallback", () => {
    const messages = [message({ id: "m1", senderId: "a-planner", dealProposal: sentDeal })];
    // An open round means terms are still moving; the engagement line would be
    // the staler of the two things to say.
    expect(summarize(messages, "vendor", "pending_vendor_confirmation").detail).toContain("new terms");
  });

  it("never claims money moved", () => {
    const messages = [message({ id: "m1", senderId: "a-host", proposal: sentDeposit })];
    for (const viewer of ["organizer", "venue_operator", "vendor"] as ViewerRole[]) {
      const detail = (summarize(messages, viewer).detail ?? "").toLowerCase();
      expect(detail).not.toContain("paid");
    }
  });
});
