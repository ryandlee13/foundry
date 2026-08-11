import { describe, expect, it } from "vitest";
import { computeRosterSpend } from "../engagementTotals";

describe("computeRosterSpend", () => {
  it("sums flat_fee and package amounts", () => {
    const result = computeRosterSpend([
      { agreedAmount: 500, pricingModel: "flat_fee" },
      { agreedAmount: 800, pricingModel: "package" },
    ]);
    expect(result).toEqual({ totalAmount: 1300, includedCount: 2, excludedCount: 0 });
  });

  it("excludes hourly and day_rate amounts from the total (they're rates, not totals)", () => {
    const result = computeRosterSpend([
      { agreedAmount: 500, pricingModel: "flat_fee" },
      { agreedAmount: 150, pricingModel: "hourly" },
      { agreedAmount: 900, pricingModel: "day_rate" },
    ]);
    expect(result).toEqual({ totalAmount: 500, includedCount: 1, excludedCount: 2 });
  });

  it("excludes contact_for_quote rows even when the amount is 0", () => {
    const result = computeRosterSpend([{ agreedAmount: 0, pricingModel: "contact_for_quote" }]);
    expect(result).toEqual({ totalAmount: 0, includedCount: 0, excludedCount: 1 });
  });

  it("returns zeros for an empty roster", () => {
    expect(computeRosterSpend([])).toEqual({ totalAmount: 0, includedCount: 0, excludedCount: 0 });
  });
});
