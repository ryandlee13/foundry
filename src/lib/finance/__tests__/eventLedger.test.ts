import { describe, expect, it } from "vitest";
import {
  formatLedgerSummary,
  LEDGER_FOOTNOTE,
  rateSuffixFor,
  resolveVendorLine,
  resolveVenueLine,
  summarizeLedger,
  type LedgerLineItem,
  type VendorLineInput,
  type VenueLineInput,
} from "../eventLedger";
import type { StatusDescriptor } from "@/lib/ui/statusTone";

const OK: StatusDescriptor = { tone: "ok", label: "Confirmed" };
const money = (amount: number) => `$${amount.toLocaleString("en-US")}`;

function venue(overrides: Partial<VenueLineInput> = {}): VenueLineInput {
  return {
    venueName: "Bayview Loft",
    status: OK,
    signedContractTotal: null,
    signedContractDeposit: null,
    signedContractBalanceDue: null,
    acceptedOfferTotal: null,
    depositRequests: [],
    estimateAmount: null,
    ...overrides,
  };
}

function vendor(overrides: Partial<VendorLineInput> = {}): VendorLineInput {
  return {
    engagementId: "e-1",
    label: "DJ",
    counterparty: "Lena Ortiz",
    status: OK,
    amount: 1200,
    pricingModel: "flat_fee",
    hours: null,
    budgetAmount: null,
    ...overrides,
  };
}

describe("resolveVenueLine precedence", () => {
  /*
   * contract > accepted offer > estimate, in order of how much the two parties
   * have actually committed to.
   */
  it("prefers a signed contract over everything else", () => {
    const line = resolveVenueLine(
      venue({ signedContractTotal: 6400, acceptedOfferTotal: 6000, estimateAmount: 5000 })
    );
    expect(line.amount).toBe(6400);
    expect(line.basis).toBe("firm");
    expect(line.basisNote).toContain("signed agreement");
  });

  it("prefers an accepted offer over an estimate", () => {
    const line = resolveVenueLine(venue({ acceptedOfferTotal: 6000, estimateAmount: 5000 }));
    expect(line.amount).toBe(6000);
    expect(line.basis).toBe("firm");
  });

  it("falls back to the estimate, and says why it's an estimate", () => {
    const line = resolveVenueLine(venue({ estimateAmount: 5000 }));
    expect(line.amount).toBe(5000);
    expect(line.basis).toBe("estimate");
    expect(line.basisNote.toLowerCase()).toContain("hourly rate");
  });

  it("has no amount at all when there's no rate to estimate from", () => {
    const line = resolveVenueLine(venue());
    expect(line.amount).toBeNull();
    expect(line.basis).toBe("rate_only");
  });
});

describe("venue dues are requests, never payments", () => {
  it("carries a deposit request with its date", () => {
    const line = resolveVenueLine(venue({ depositRequests: [{ amount: 1500, dueDate: "2026-11-01" }] }));
    expect(line.dues).toHaveLength(1);
    expect(line.dues[0]).toMatchObject({ label: "Deposit", amount: 1500, dueDate: "2026-11-01" });
  });

  it("derives the balance from the contract's total minus its deposit", () => {
    const line = resolveVenueLine(
      venue({ signedContractTotal: 6400, signedContractDeposit: 1500, signedContractBalanceDue: "2026-12-01" })
    );
    const balance = line.dues.find((due) => due.label === "Balance");
    expect(balance?.amount).toBe(4900);
  });

  it("leaves the balance amount unknown rather than guessing when the deposit isn't stated", () => {
    const line = resolveVenueLine(venue({ signedContractTotal: 6400, signedContractBalanceDue: "2026-12-01" }));
    expect(line.dues.find((due) => due.label === "Balance")?.amount).toBeNull();
  });

  it("never labels anything as paid", () => {
    const line = resolveVenueLine(
      venue({
        signedContractTotal: 6400,
        signedContractDeposit: 1500,
        signedContractBalanceDue: "2026-12-01",
        depositRequests: [{ amount: 1500, dueDate: "2026-11-01" }],
      })
    );
    for (const due of line.dues) {
      expect(due.label.toLowerCase()).not.toContain("paid");
    }
    expect(LEDGER_FOOTNOTE.toLowerCase()).toContain("not paid");
  });
});

describe("resolveVendorLine", () => {
  it("treats a flat fee or package as firm", () => {
    expect(resolveVendorLine(vendor({ pricingModel: "flat_fee" })).basis).toBe("firm");
    expect(resolveVendorLine(vendor({ pricingModel: "package" })).basis).toBe("firm");
  });

  it("multiplies an hourly rate by known hours, as an estimate", () => {
    const line = resolveVendorLine(vendor({ amount: 150, pricingModel: "hourly", hours: 5 }));
    expect(line.amount).toBe(750);
    expect(line.basis).toBe("estimate");
    expect(line.basisNote).toContain("5 booked hours");
  });

  /*
   * The vendor-lobby case: hired, agreed, but attached to no event — so there
   * are no hours, and inventing some is the confident-wrong-number this module
   * exists to prevent.
   */
  it("keeps an hourly rate with no hours as rate_only", () => {
    const line = resolveVendorLine(vendor({ amount: 150, pricingModel: "hourly", hours: null }));
    expect(line.basis).toBe("rate_only");
    expect(line.amount).toBe(150);
    expect(line.pricingModel).toBe("hourly");
  });

  it("treats zero or negative hours as no hours", () => {
    expect(resolveVendorLine(vendor({ pricingModel: "hourly", hours: 0 })).basis).toBe("rate_only");
  });

  it("treats contact_for_quote as rate_only with no figure", () => {
    const line = resolveVendorLine(vendor({ amount: 0, pricingModel: "contact_for_quote" }));
    expect(line.basis).toBe("rate_only");
    expect(line.amount).toBeNull();
    expect(line.basisNote.toLowerCase()).toContain("enquiry");
  });

  it("names the rate unit", () => {
    expect(rateSuffixFor("hourly")).toBe("/hr");
    expect(rateSuffixFor("day_rate")).toBe("/day");
    expect(rateSuffixFor("flat_fee")).toBe("");
  });
});

describe("summarizeLedger", () => {
  const firm = (amount: number, id = "f"): LedgerLineItem =>
    resolveVendorLine(vendor({ engagementId: id, amount, pricingModel: "flat_fee" }));
  const estimate = (): LedgerLineItem =>
    resolveVendorLine(vendor({ engagementId: "est", amount: 100, pricingModel: "hourly", hours: 4 }));
  const rateOnly = (): LedgerLineItem =>
    resolveVendorLine(vendor({ engagementId: "rate", amount: 150, pricingModel: "hourly", hours: null }));

  it("keeps firm and estimated totals apart, and never sums a rate", () => {
    const ledger = summarizeLedger([firm(1200, "a"), firm(800, "b"), estimate(), rateOnly()]);
    expect(ledger.firmTotal).toBe(2000);
    expect(ledger.estimatedTotal).toBe(400);
    expect(ledger.rateOnlyCount).toBe(1);
    // The rate must not have leaked into either total.
    expect(ledger.firmTotal + ledger.estimatedTotal).toBe(2400);
  });

  it("is all zeroes for an event with nothing booked", () => {
    const ledger = summarizeLedger([]);
    expect(ledger).toMatchObject({ firmTotal: 0, estimatedTotal: 0, rateOnlyCount: 0 });
    expect(ledger.dues).toEqual([]);
  });

  it("orders dues soonest first, with undated ones last", () => {
    const line = resolveVenueLine(
      venue({
        depositRequests: [
          { amount: 100, dueDate: null },
          { amount: 200, dueDate: "2026-12-01" },
          { amount: 300, dueDate: "2026-11-01" },
        ],
      })
    );
    const ledger = summarizeLedger([line]);
    expect(ledger.dues.map((due) => due.dueDate)).toEqual(["2026-11-01", "2026-12-01", null]);
  });

  it("flags a firm line over its budget", () => {
    const over = resolveVendorLine(vendor({ engagementId: "over", amount: 1500, budgetAmount: 1000 }));
    const under = resolveVendorLine(vendor({ engagementId: "under", amount: 800, budgetAmount: 1000 }));
    expect(summarizeLedger([over, under]).overBudgetItemIds).toEqual(["over"]);
  });

  /*
   * An estimate over budget would have the planner chasing a number nobody has
   * actually asked them for.
   */
  it("never flags an estimate as over budget", () => {
    const line = resolveVendorLine(
      vendor({ engagementId: "est", amount: 500, pricingModel: "hourly", hours: 4, budgetAmount: 1000 })
    );
    expect(line.amount).toBe(2000);
    expect(summarizeLedger([line]).overBudgetItemIds).toEqual([]);
  });
});

describe("formatLedgerSummary", () => {
  it("names committed money plainly and marks the estimate", () => {
    const ledger = summarizeLedger([
      resolveVendorLine(vendor({ engagementId: "a", amount: 6400, pricingModel: "flat_fee" })),
      resolveVendorLine(vendor({ engagementId: "b", amount: 300, pricingModel: "hourly", hours: 4 })),
      resolveVendorLine(vendor({ engagementId: "c", amount: 150, pricingModel: "hourly", hours: null })),
    ]);
    const summary = formatLedgerSummary(ledger, money);
    expect(summary).toContain("$6,400 committed");
    expect(summary).toContain("~$1,200 estimated");
    expect(summary).toContain("1 rate not included");
  });

  it("omits the parts that are zero", () => {
    const ledger = summarizeLedger([resolveVendorLine(vendor({ amount: 500, pricingModel: "flat_fee" }))]);
    const summary = formatLedgerSummary(ledger, money);
    expect(summary).toBe("$500 committed");
  });

  it("always keeps the tilde on an estimate so it can't read as committed", () => {
    const ledger = summarizeLedger([
      resolveVendorLine(vendor({ amount: 100, pricingModel: "hourly", hours: 3 })),
    ]);
    expect(formatLedgerSummary(ledger, money)).toContain("~$300");
  });
});
