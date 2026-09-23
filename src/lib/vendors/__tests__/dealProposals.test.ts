import { describe, expect, it } from "vitest";
import {
  buildDealProposal,
  formatDealAmount,
  getEmptyDealProposalDraft,
  resolveEffectiveDealTerms,
  summarizeDealProposal,
  supersedeOpenRounds,
  validateDealProposalDraft,
  type DealProposalDraft,
} from "../dealProposals";
import type { DealProposalAttachment } from "@/lib/types/vendors";

const validDraft: DealProposalDraft = {
  amount: "1200",
  pricingModel: "flat_fee",
  deliverables: "4-hour set, own controller and speakers",
  note: "Can do this if we push the start to 9pm.",
};

function round(overrides: Partial<DealProposalAttachment> = {}): DealProposalAttachment {
  return {
    amount: 1000,
    pricingModel: "flat_fee",
    deliverables: "Base deliverables",
    note: "note",
    senderRole: "vendor",
    status: "sent",
    respondedAt: null,
    ...overrides,
  };
}

describe("validateDealProposalDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateDealProposalDraft(validDraft)).toEqual({});
  });

  it("rejects a missing, zero, or negative amount", () => {
    expect(validateDealProposalDraft({ ...validDraft, amount: "" }).amount).toBeTruthy();
    expect(validateDealProposalDraft({ ...validDraft, amount: "0" }).amount).toBeTruthy();
    expect(validateDealProposalDraft({ ...validDraft, amount: "-50" }).amount).toBeTruthy();
  });

  it("rejects a non-numeric amount", () => {
    expect(validateDealProposalDraft({ ...validDraft, amount: "about a grand" }).amount).toBeTruthy();
  });

  it("requires deliverables", () => {
    expect(validateDealProposalDraft({ ...validDraft, deliverables: "   " }).deliverables).toBeTruthy();
  });

  it("requires a note", () => {
    expect(validateDealProposalDraft({ ...validDraft, note: "" }).note).toBeTruthy();
  });
});

describe("buildDealProposal", () => {
  it("builds an open round tagged with the sender's side", () => {
    const built = buildDealProposal(validDraft, "organizer");
    expect(built).toMatchObject({
      amount: 1200,
      pricingModel: "flat_fee",
      senderRole: "organizer",
      status: "sent",
      respondedAt: null,
    });
  });

  it("rounds a fractional amount and trims text", () => {
    const built = buildDealProposal(
      { ...validDraft, amount: "1200.6", note: "  spaced  ", deliverables: " stuff " },
      "vendor"
    );
    expect(built.amount).toBe(1201);
    expect(built.note).toBe("spaced");
    expect(built.deliverables).toBe("stuff");
  });
});

describe("getEmptyDealProposalDraft", () => {
  it("returns a blank draft with no base", () => {
    expect(getEmptyDealProposalDraft()).toEqual({
      amount: "",
      pricingModel: "flat_fee",
      deliverables: "",
      note: "",
    });
  });

  it("pre-fills from the current terms so a counter starts from what's on the table", () => {
    const draft = getEmptyDealProposalDraft({ amount: 900, pricingModel: "hourly", deliverables: "4h set" });
    expect(draft).toEqual({ amount: "900", pricingModel: "hourly", deliverables: "4h set", note: "" });
  });
});

describe("supersedeOpenRounds", () => {
  it("closes open rounds so a stale counter can't still be accepted", () => {
    const result = supersedeOpenRounds([round({ status: "sent" }), round({ status: "sent" })]);
    expect(result.map((r) => r.status)).toEqual(["superseded", "superseded"]);
  });

  it("leaves decided rounds alone — they're the record of what happened", () => {
    const result = supersedeOpenRounds([
      round({ status: "accepted", respondedAt: "2026-01-01T00:00:00Z" }),
      round({ status: "declined", respondedAt: "2026-01-02T00:00:00Z" }),
      round({ status: "superseded" }),
    ]);
    expect(result.map((r) => r.status)).toEqual(["accepted", "declined", "superseded"]);
  });
});

describe("resolveEffectiveDealTerms", () => {
  const base = { amount: 800, pricingModel: "flat_fee" as const, deliverables: "Original bid" };

  it("falls back to the original bid when nothing was agreed", () => {
    expect(resolveEffectiveDealTerms(base, [])).toEqual({ ...base, negotiated: false, agreedFrom: null });
  });

  it("ignores rounds that were sent but never answered", () => {
    const result = resolveEffectiveDealTerms(base, [round({ amount: 2000, status: "sent" })]);
    expect(result.amount).toBe(800);
    expect(result.negotiated).toBe(false);
  });

  it("ignores declined and superseded rounds", () => {
    const result = resolveEffectiveDealTerms(base, [
      round({ amount: 2000, status: "declined", respondedAt: "2026-01-01T00:00:00Z" }),
      round({ amount: 3000, status: "superseded" }),
    ]);
    expect(result.amount).toBe(800);
  });

  it("applies an accepted round", () => {
    const result = resolveEffectiveDealTerms(base, [
      round({
        amount: 950,
        pricingModel: "hourly",
        deliverables: "Negotiated scope",
        senderRole: "organizer",
        status: "accepted",
        respondedAt: "2026-01-01T00:00:00Z",
      }),
    ]);
    expect(result).toEqual({
      amount: 950,
      pricingModel: "hourly",
      deliverables: "Negotiated scope",
      negotiated: true,
      agreedFrom: "organizer",
    });
  });

  it("lets the latest acceptance win, regardless of array order", () => {
    const result = resolveEffectiveDealTerms(base, [
      round({ amount: 1500, status: "accepted", respondedAt: "2026-03-01T00:00:00Z", senderRole: "vendor" }),
      round({ amount: 900, status: "accepted", respondedAt: "2026-01-01T00:00:00Z", senderRole: "organizer" }),
    ]);
    expect(result.amount).toBe(1500);
    expect(result.agreedFrom).toBe("vendor");
  });
});

describe("formatting", () => {
  it("renders an hourly amount as a rate, not a total", () => {
    expect(formatDealAmount(120, "hourly")).toBe("$120/hr");
  });

  it("renders a flat fee with its model label", () => {
    expect(formatDealAmount(1200, "flat_fee")).toBe("$1,200 flat fee");
  });

  it("names the side that sent the round", () => {
    expect(summarizeDealProposal(round({ senderRole: "organizer", amount: 900 }))).toBe(
      "Organizer proposed $900 flat fee"
    );
    expect(summarizeDealProposal(round({ senderRole: "vendor", amount: 900 }))).toBe(
      "Vendor proposed $900 flat fee"
    );
  });
});
