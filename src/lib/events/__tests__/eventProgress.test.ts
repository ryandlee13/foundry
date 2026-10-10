import { describe, expect, it } from "vitest";
import { computeEventProgress, type EventProgressInput, type EventStepKey } from "../eventProgress";

const TODAY = "2026-10-09";

function input(overrides: Partial<EventProgressInput> = {}): EventProgressInput {
  return {
    booking: { status: "confirmed", eventDate: "2026-12-01" },
    needCount: 0,
    confirmedVendorCount: 0,
    awaitingVendorCount: 0,
    openVenueOfferCount: 0,
    contractSent: false,
    contractSigned: false,
    reviewableCount: 0,
    reviewedCount: 0,
    todayIso: TODAY,
    ...overrides,
  };
}

const stateOf = (result: ReturnType<typeof computeEventProgress>, key: EventStepKey) =>
  result.steps.find((step) => step.key === key)!.state;

describe("computeEventProgress", () => {
  it("always returns the six steps in a fixed order", () => {
    expect(computeEventProgress(input()).steps.map((step) => step.key)).toEqual([
      "venue",
      "vendors",
      "terms",
      "contract",
      "event_day",
      "reviews",
    ]);
  });

  it("marks at most one step current, however many are unfinished", () => {
    const result = computeEventProgress(input({ booking: null }));
    expect(result.steps.filter((step) => step.state === "current")).toHaveLength(1);
    // Nothing done at all, so the very first step is where it sits.
    expect(result.currentStep?.key).toBe("venue");
  });

  it("gives every step a non-empty detail line in every state", () => {
    for (const scenario of [
      input({ booking: null }),
      input(),
      input({ confirmedVendorCount: 2 }),
      input({ booking: { status: "pending", eventDate: "2026-12-01" } }),
      input({ booking: { status: "declined", eventDate: "2026-12-01" } }),
      input({ confirmedVendorCount: 1, contractSigned: true, contractSent: true, booking: { status: "confirmed", eventDate: "2026-01-01" }, reviewableCount: 1, reviewedCount: 1 }),
    ]) {
      for (const step of computeEventProgress(scenario).steps) {
        expect(step.detail.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("venue step", () => {
  it("is done only on a confirmed booking", () => {
    expect(stateOf(computeEventProgress(input()), "venue")).toBe("done");
    expect(stateOf(computeEventProgress(input({ booking: { status: "pending", eventDate: "2026-12-01" } })), "venue")).toBe("current");
  });

  /*
   * The vendor-lobby bucket: a planner who hired a DJ before finding a room.
   * It's a real state with real engagements in it, not an error.
   */
  it("explains a null booking as the lobby rather than as missing data", () => {
    const venue = computeEventProgress(input({ booking: null, confirmedVendorCount: 1 })).steps[0];
    expect(venue.state).toBe("current");
    expect(venue.detail.toLowerCase()).toContain("no venue yet");
  });
});

describe("vendors step", () => {
  it("is done once anyone has confirmed, and names who's outstanding", () => {
    const result = computeEventProgress(input({ confirmedVendorCount: 2, awaitingVendorCount: 1 }));
    expect(stateOf(result, "vendors")).toBe("done");
    expect(result.steps[1].detail).toContain("2 vendors confirmed");
    expect(result.steps[1].detail).toContain("1 still to answer");
  });

  it("distinguishes posted-but-nobody-hired from nothing posted", () => {
    expect(computeEventProgress(input({ needCount: 3 })).steps[1].detail).toContain("3 requests posted");
    expect(computeEventProgress(input()).steps[1].detail).toContain("No vendor requests");
  });

  it("uses the singular for one vendor", () => {
    expect(computeEventProgress(input({ confirmedVendorCount: 1 })).steps[1].detail).toContain("1 vendor confirmed");
  });
});

describe("terms step", () => {
  it("is not done while the planner owes the venue an answer", () => {
    const result = computeEventProgress(input({ confirmedVendorCount: 1, openVenueOfferCount: 1 }));
    expect(stateOf(result, "terms")).not.toBe("done");
    expect(result.steps[2].detail).toContain("haven't answered");
  });

  it("is not done while a vendor owes one", () => {
    expect(stateOf(computeEventProgress(input({ confirmedVendorCount: 1, awaitingVendorCount: 2 })), "terms")).not.toBe("done");
  });

  /*
   * With nobody hired there are no terms to have agreed. Calling that "done"
   * would flatter an event that hasn't started.
   */
  it("is never done before anyone is hired", () => {
    expect(stateOf(computeEventProgress(input({ confirmedVendorCount: 0 })), "terms")).not.toBe("done");
  });

  it("is done once the venue is confirmed, someone is hired, and nothing is outstanding", () => {
    expect(stateOf(computeEventProgress(input({ confirmedVendorCount: 1 })), "terms")).toBe("done");
  });
});

describe("contract step", () => {
  /*
   * Contracts are optional in the booking flow — the venue privacy gate keys
   * on confirmation, not a signature. An unsent one must not leave every event
   * looking permanently unfinished.
   */
  it("is skipped, not unfinished, when the host never sent one", () => {
    const result = computeEventProgress(input({ confirmedVendorCount: 1 }));
    expect(stateOf(result, "contract")).toBe("skipped");
    expect(result.steps[3].detail.toLowerCase()).toContain("optional");
  });

  it("does not park the event on a contract that was never sent", () => {
    // Venue, vendors and terms are all settled; the event should have moved on
    // to the event-day step rather than stalling on an optional signature.
    expect(computeEventProgress(input({ confirmedVendorCount: 1 })).currentStep?.key).toBe("event_day");
  });

  it("becomes a real waiting step once one is sent", () => {
    expect(stateOf(computeEventProgress(input({ confirmedVendorCount: 1, contractSent: true })), "contract")).toBe("current");
  });

  it("is done when signed", () => {
    expect(stateOf(computeEventProgress(input({ contractSent: true, contractSigned: true })), "contract")).toBe("done");
  });

  it("is left out of the applicable count when skipped", () => {
    expect(computeEventProgress(input({ confirmedVendorCount: 1 })).applicableCount).toBe(5);
    expect(computeEventProgress(input({ confirmedVendorCount: 1, contractSent: true })).applicableCount).toBe(6);
  });
});

describe("event day and reviews", () => {
  it("is done once the date has passed", () => {
    expect(stateOf(computeEventProgress(input({ booking: { status: "confirmed", eventDate: "2026-10-08" } })), "event_day")).toBe("done");
    expect(stateOf(computeEventProgress(input({ booking: { status: "confirmed", eventDate: "2026-10-09" } })), "event_day")).not.toBe("done");
  });

  it("counts the day of the event as not yet passed", () => {
    // An event happening today is still ahead of you for most of the day.
    const sameDay = computeEventProgress(input({ booking: { status: "confirmed", eventDate: TODAY } }));
    expect(stateOf(sameDay, "event_day")).not.toBe("done");
  });

  it("is not done on reviews when there is nothing reviewable", () => {
    expect(stateOf(computeEventProgress(input()), "reviews")).not.toBe("done");
  });

  it("is done once every reviewable engagement has a review", () => {
    expect(stateOf(computeEventProgress(input({ reviewableCount: 2, reviewedCount: 2 })), "reviews")).toBe("done");
    expect(computeEventProgress(input({ reviewableCount: 2, reviewedCount: 1 })).steps[5].detail).toContain("1 vendor waiting");
  });
});

describe("a fully settled event", () => {
  it("has no current step", () => {
    const result = computeEventProgress(
      input({
        booking: { status: "confirmed", eventDate: "2026-01-01" },
        confirmedVendorCount: 2,
        contractSent: true,
        contractSigned: true,
        reviewableCount: 2,
        reviewedCount: 2,
      })
    );
    expect(result.currentStep).toBeNull();
    expect(result.completedCount).toBe(6);
    expect(result.applicableCount).toBe(6);
  });
});
