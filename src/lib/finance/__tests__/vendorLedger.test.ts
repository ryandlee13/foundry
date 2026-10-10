import { describe, expect, it } from "vitest";
import {
  buildVendorLedger,
  formatMonthKey,
  resolveGigBasis,
  type VendorGigInput,
} from "../vendorLedger";

const TODAY = "2026-10-09";

function gig(overrides: Partial<VendorGigInput> & { engagementId: string }): VendorGigInput {
  return {
    eventLabel: "Rooftop party",
    plannerName: "Dana",
    eventDate: "2026-12-01",
    unassigned: false,
    amount: 1200,
    pricingModel: "flat_fee",
    hours: null,
    status: "confirmed",
    completedAt: null,
    ...overrides,
  };
}

describe("resolveGigBasis", () => {
  it("is firm for a fixed price regardless of hours", () => {
    expect(resolveGigBasis("flat_fee", null)).toBe("firm");
    expect(resolveGigBasis("package", 5)).toBe("firm");
  });

  it("is an estimate for a rate with known hours, rate_only without", () => {
    expect(resolveGigBasis("hourly", 5)).toBe("estimate");
    expect(resolveGigBasis("hourly", null)).toBe("rate_only");
    expect(resolveGigBasis("day_rate", 0)).toBe("rate_only");
  });

  it("is always rate_only for contact_for_quote, hours or not", () => {
    expect(resolveGigBasis("contact_for_quote", 8)).toBe("rate_only");
  });
});

describe("buildVendorLedger", () => {
  it("is empty for a vendor with no gigs", () => {
    const ledger = buildVendorLedger([], TODAY);
    expect(ledger).toMatchObject({
      upcoming: [],
      completed: [],
      unassigned: [],
      firmUpcomingTotal: 0,
      firmCompletedTotal: 0,
    });
  });

  it("splits upcoming, completed, and unassigned", () => {
    const ledger = buildVendorLedger(
      [
        gig({ engagementId: "up", status: "confirmed" }),
        gig({ engagementId: "done", status: "completed", completedAt: "2026-09-20T12:00:00", eventDate: "2026-09-19" }),
        gig({ engagementId: "loose", unassigned: true, eventDate: null }),
      ],
      TODAY
    );
    expect(ledger.upcoming.map((row) => row.engagementId)).toEqual(["up"]);
    expect(ledger.completed[0].rows.map((row) => row.engagementId)).toEqual(["done"]);
    expect(ledger.unassigned.map((row) => row.engagementId)).toEqual(["loose"]);
  });

  /*
   * An unassigned gig has no date, so it can't sort with the others and can't
   * be filed under a month. Putting it in "upcoming" would mean inventing a
   * position for it.
   */
  it("keeps an unassigned gig out of upcoming even when it's confirmed", () => {
    const ledger = buildVendorLedger([gig({ engagementId: "loose", unassigned: true, eventDate: null })], TODAY);
    expect(ledger.upcoming).toEqual([]);
    expect(ledger.unassigned).toHaveLength(1);
  });

  it("sorts upcoming soonest first and completed months newest first", () => {
    const ledger = buildVendorLedger(
      [
        gig({ engagementId: "later", eventDate: "2026-12-20" }),
        gig({ engagementId: "sooner", eventDate: "2026-11-02" }),
        gig({ engagementId: "aug", status: "completed", completedAt: "2026-08-10T00:00:00" }),
        gig({ engagementId: "sep", status: "completed", completedAt: "2026-09-10T00:00:00" }),
      ],
      TODAY
    );
    expect(ledger.upcoming.map((row) => row.engagementId)).toEqual(["sooner", "later"]);
    expect(ledger.completed.map((group) => group.monthKey)).toEqual(["2026-09", "2026-08"]);
  });

  it("multiplies a rate by known hours but reports it as an estimate", () => {
    const ledger = buildVendorLedger(
      [gig({ engagementId: "hourly", amount: 150, pricingModel: "hourly", hours: 4 })],
      TODAY
    );
    expect(ledger.upcoming[0].amount).toBe(600);
    expect(ledger.upcoming[0].basis).toBe("estimate");
    // An estimate is not committed money.
    expect(ledger.firmUpcomingTotal).toBe(0);
  });

  it("never folds a rate into a subtotal", () => {
    const ledger = buildVendorLedger(
      [
        gig({ engagementId: "firm", amount: 1000, pricingModel: "flat_fee" }),
        gig({ engagementId: "rate", amount: 150, pricingModel: "hourly", hours: null }),
      ],
      TODAY
    );
    expect(ledger.firmUpcomingTotal).toBe(1000);
    expect(ledger.rateOnlyCount).toBe(1);
    expect(ledger.upcoming.find((row) => row.engagementId === "rate")?.rateSuffix).toBe("/hr");
  });

  it("subtotals each completed month on firm amounts only", () => {
    const ledger = buildVendorLedger(
      [
        gig({ engagementId: "a", status: "completed", amount: 800, completedAt: "2026-09-05T00:00:00" }),
        gig({ engagementId: "b", status: "completed", amount: 400, completedAt: "2026-09-25T00:00:00" }),
        gig({
          engagementId: "c",
          status: "completed",
          amount: 150,
          pricingModel: "hourly",
          hours: null,
          completedAt: "2026-09-26T00:00:00",
        }),
      ],
      TODAY
    );
    const september = ledger.completed.find((group) => group.monthKey === "2026-09")!;
    expect(september.firmSubtotal).toBe(1200);
    expect(september.rateOnlyCount).toBe(1);
  });

  it("files a completed gig with no completedAt under its event date", () => {
    const ledger = buildVendorLedger(
      [gig({ engagementId: "old", status: "completed", completedAt: null, eventDate: "2026-07-04" })],
      TODAY
    );
    expect(ledger.completed[0].monthKey).toBe("2026-07");
  });

  it("drops declined and cancelled gigs from every bucket", () => {
    const ledger = buildVendorLedger(
      [
        gig({ engagementId: "declined", status: "declined_by_vendor" }),
        gig({ engagementId: "cancelled", status: "canceled_by_organizer" }),
      ],
      TODAY
    );
    expect(ledger.upcoming).toEqual([]);
    expect(ledger.completed).toEqual([]);
    expect(ledger.unassigned).toEqual([]);
  });
});

describe("formatMonthKey", () => {
  it("renders a month name, never the key", () => {
    expect(formatMonthKey("2026-09")).toBe("September 2026");
    expect(formatMonthKey("2026-09")).not.toContain("2026-09");
  });

  it("passes junk through rather than throwing", () => {
    expect(formatMonthKey("nonsense")).toBe("nonsense");
  });
});
