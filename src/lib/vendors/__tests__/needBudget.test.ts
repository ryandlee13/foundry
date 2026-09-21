import { describe, expect, it } from "vitest";
import {
  computeNeedBudget,
  computeNeedHours,
  formatBudgetPreview,
  formatHours,
  REQUESTABLE_PRICING_MODELS,
  type NeedBudgetInput,
} from "../needBudget";

function input(overrides: Partial<NeedBudgetInput> = {}): NeedBudgetInput {
  return {
    pricingModel: "hourly",
    targetPrice: "",
    startTime: "18:00",
    endTime: "21:00",
    minOverride: "",
    maxOverride: "",
    ...overrides,
  };
}

describe("computeNeedHours", () => {
  it("measures the vendor's booked window", () => {
    expect(computeNeedHours("18:00", "21:00")).toBe(3);
    expect(computeNeedHours("18:00", "19:30")).toBe(1.5);
  });

  it("handles a window that crosses midnight", () => {
    expect(computeNeedHours("22:00", "02:00")).toBe(4);
  });

  it("returns null for a zero-length window", () => {
    expect(computeNeedHours("18:00", "18:00")).toBeNull();
  });
});

describe("computeNeedBudget", () => {
  it("turns an hourly rate into a total using the window", () => {
    // The example from the brief: $80/hr on a 3-hour event is $240.
    const budget = computeNeedBudget(input({ targetPrice: "80" }));
    expect(budget.hours).toBe(3);
    expect(budget.estimatedTotal).toBe(240);
    expect(budget.budgetMin).toBe(240);
    expect(budget.budgetMax).toBe(240);
  });

  it("treats a flat fee as the total, ignoring the window", () => {
    const budget = computeNeedBudget(input({ pricingModel: "flat_fee", targetPrice: "500" }));
    expect(budget.estimatedTotal).toBe(500);
    expect(budget.budgetMin).toBe(500);
  });

  it("treats no stated preference as a total", () => {
    const budget = computeNeedBudget(input({ pricingModel: "", targetPrice: "500" }));
    expect(budget.estimatedTotal).toBe(500);
  });

  it("rounds a fractional hourly total to whole dollars", () => {
    const budget = computeNeedBudget(input({ targetPrice: "80", endTime: "19:30" }));
    expect(budget.estimatedTotal).toBe(120);
  });

  it("can't derive a total from an hourly rate with no window", () => {
    const budget = computeNeedBudget(input({ targetPrice: "80", endTime: "18:00" }));
    expect(budget.estimatedTotal).toBeNull();
    expect(budget.budgetMin).toBeNull();
  });

  it("lets explicit min/max override the derived figure", () => {
    const budget = computeNeedBudget(input({ targetPrice: "80", minOverride: "200", maxOverride: "400" }));
    expect(budget.budgetMin).toBe(200);
    expect(budget.budgetMax).toBe(400);
    // The derived total is still reported, so the UI can show the maths.
    expect(budget.estimatedTotal).toBe(240);
  });

  it("allows overriding only one end of the range", () => {
    const budget = computeNeedBudget(input({ targetPrice: "80", maxOverride: "400" }));
    expect(budget.budgetMin).toBe(240);
    expect(budget.budgetMax).toBe(400);
  });

  it("works with overrides alone and no target price", () => {
    const budget = computeNeedBudget(input({ minOverride: "200", maxOverride: "400" }));
    expect(budget.budgetMin).toBe(200);
    expect(budget.budgetMax).toBe(400);
    expect(budget.estimatedTotal).toBeNull();
  });

  it("ignores non-positive and non-numeric input", () => {
    expect(computeNeedBudget(input({ targetPrice: "0" })).estimatedTotal).toBeNull();
    expect(computeNeedBudget(input({ targetPrice: "-50" })).estimatedTotal).toBeNull();
    expect(computeNeedBudget(input({ targetPrice: "lots" })).estimatedTotal).toBeNull();
  });
});

describe("formatHours", () => {
  it("singularizes one hour and keeps halves readable", () => {
    expect(formatHours(1)).toBe("1 hour");
    expect(formatHours(3)).toBe("3 hours");
    expect(formatHours(2.5)).toBe("2.5 hours");
  });
});

describe("formatBudgetPreview", () => {
  it("shows the full equation for an hourly rate", () => {
    expect(formatBudgetPreview(input({ targetPrice: "80" }))).toBe("$80/hr × 3 hours = $240");
  });

  it("shows just the total for a flat fee", () => {
    expect(formatBudgetPreview(input({ pricingModel: "flat_fee", targetPrice: "500" }))).toBe("$500 total");
  });

  it("renders nothing rather than a half-formed equation", () => {
    expect(formatBudgetPreview(input())).toBeNull();
    expect(formatBudgetPreview(input({ targetPrice: "80", endTime: "18:00" }))).toBeNull();
  });
});

describe("REQUESTABLE_PRICING_MODELS", () => {
  it("offers only hourly and flat fee", () => {
    // Day rates, packages, and contact-for-quote are vendor-side concepts;
    // an organizer asking for work states a rate or a fee.
    expect(REQUESTABLE_PRICING_MODELS).toEqual(["hourly", "flat_fee"]);
  });
});
