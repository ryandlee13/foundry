import { describe, expect, it } from "vitest";
import { isTermsLocked, termsDifferFromProposal, summarizeAgreedTerms, formatAgreedTermsFootnote } from "../agreedTerms";

describe("isTermsLocked", () => {
  it("is locked once confirmedByVendorAt is set", () => {
    expect(isTermsLocked({ confirmedByVendorAt: "2026-08-01T00:00:00.000Z" })).toBe(true);
  });

  it("is not locked while confirmedByVendorAt is null", () => {
    expect(isTermsLocked({ confirmedByVendorAt: null })).toBe(false);
  });
});

describe("termsDifferFromProposal", () => {
  it("reflects the editedFromProposal flag", () => {
    expect(termsDifferFromProposal({ editedFromProposal: true })).toBe(true);
    expect(termsDifferFromProposal({ editedFromProposal: false })).toBe(false);
  });
});

describe("summarizeAgreedTerms", () => {
  it("includes deliverables when present", () => {
    expect(summarizeAgreedTerms({ amount: 700, pricingModel: "flat_fee", deliverables: "5-hour DJ set" }, "Flat fee")).toBe(
      "$700 Flat fee — 5-hour DJ set"
    );
  });

  it("omits the dash when deliverables is empty", () => {
    expect(summarizeAgreedTerms({ amount: 700, pricingModel: "flat_fee", deliverables: "" }, "Flat fee")).toBe(
      "$700 Flat fee"
    );
  });
});

describe("formatAgreedTermsFootnote", () => {
  it("shows an awaiting-confirmation message before the vendor confirms", () => {
    expect(formatAgreedTermsFootnote({ confirmedByVendorAt: null }, "Alex Chen")).toBe(
      "Awaiting confirmation — these terms are not yet in effect."
    );
  });

  it("states a firm mutual commitment once confirmed, without asserting legal enforceability", () => {
    const footnote = formatAgreedTermsFootnote({ confirmedByVendorAt: "2026-08-17T00:00:00.000Z" }, "Alex Chen");
    expect(footnote).toContain("Both parties have confirmed and agreed to these terms on Foundry");
    expect(footnote).toContain("Alex Chen");
    expect(footnote.toLowerCase()).not.toContain("legally binding");
    expect(footnote.toLowerCase()).not.toContain("enforceable");
  });
});
