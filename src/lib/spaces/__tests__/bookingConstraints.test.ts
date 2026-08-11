import { describe, expect, it } from "vitest";
import {
  parseTimeToMinutes,
  formatMinutesAsTime,
  computeBookingDurationMinutes,
  computeBookingWindow,
  isWithinBookingWindow,
  isOnIncrement,
  evaluateBookingRequest,
  getBlockingViolations,
  getConfirmableViolations,
  formatBookingWindow,
  formatBookingIncrement,
  toVenueBookingPolicy,
  type VenueBookingPolicy,
} from "../bookingConstraints";
import type { Venue } from "@/lib/types/spaces";

describe("parseTimeToMinutes / formatMinutesAsTime", () => {
  it("parses HH:mm to minutes since midnight", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("18:30")).toBe(1110);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("returns null for unparseable input", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("not-a-time")).toBeNull();
  });

  it("round-trips minutes back to HH:mm", () => {
    expect(formatMinutesAsTime(1110)).toBe("18:30");
    expect(formatMinutesAsTime(0)).toBe("00:00");
  });
});

describe("computeBookingDurationMinutes", () => {
  it("computes same-day duration", () => {
    expect(computeBookingDurationMinutes("18:00", "22:00")).toBe(240);
  });

  it("treats end <= start as crossing midnight", () => {
    expect(computeBookingDurationMinutes("18:00", "02:00")).toBe(480);
  });

  it("returns 0 when start equals end", () => {
    expect(computeBookingDurationMinutes("18:00", "18:00")).toBe(0);
  });

  it("returns null for unparseable input", () => {
    expect(computeBookingDurationMinutes("bad", "22:00")).toBeNull();
  });
});

describe("computeBookingWindow / isWithinBookingWindow", () => {
  it("computes a same-day window", () => {
    const window = computeBookingWindow("09:00", "23:00");
    expect(window).toEqual({ startMinutes: 540, endMinutes: 1380, lengthMinutes: 840, crossesMidnight: false });
  });

  it("computes an overnight window", () => {
    const window = computeBookingWindow("18:00", "02:00");
    expect(window).toEqual({ startMinutes: 1080, endMinutes: 120, lengthMinutes: 480, crossesMidnight: true });
  });

  it("accepts a same-day booking within a same-day window", () => {
    expect(isWithinBookingWindow("10:00", "12:00", "09:00", "23:00")).toBe(true);
  });

  it("rejects a booking starting before the window", () => {
    expect(isWithinBookingWindow("07:00", "10:00", "09:00", "23:00")).toBe(false);
  });

  it("accepts an overnight booking within an overnight window", () => {
    expect(isWithinBookingWindow("19:00", "01:00", "18:00", "02:00")).toBe(true);
  });

  it("rejects an overnight booking that runs past the window", () => {
    expect(isWithinBookingWindow("19:00", "03:00", "18:00", "02:00")).toBe(false);
  });
});

describe("isOnIncrement", () => {
  it("accepts times on the grid", () => {
    expect(isOnIncrement("18:30", 30)).toBe(true);
    expect(isOnIncrement("18:00", 15)).toBe(true);
  });

  it("rejects times off the grid", () => {
    expect(isOnIncrement("18:10", 30)).toBe(false);
  });
});

function makePolicy(overrides: Partial<VenueBookingPolicy> = {}): VenueBookingPolicy {
  return {
    maxCapacity: 100,
    seatedCapacity: 60,
    minBookingHours: 3,
    capacityNegotiable: false,
    minBookingHoursNegotiable: false,
    earliestStartTime: null,
    latestEndTime: null,
    bookingIncrementMinutes: null,
    venueName: "Neon Foundry",
    ...overrides,
  };
}

describe("evaluateBookingRequest", () => {
  const today = "2026-08-01";
  const validDraft = { eventDate: "2026-08-20", startTime: "18:00", endTime: "22:00", attendees: 50 };

  it("returns no violations for a fully valid request", () => {
    expect(evaluateBookingRequest(validDraft, makePolicy(), today)).toEqual([]);
  });

  it("blocks on missing fields", () => {
    const violations = evaluateBookingRequest({ ...validDraft, attendees: 0 }, makePolicy(), today);
    expect(violations).toHaveLength(1);
    expect(violations[0].code).toBe("missing_fields");
  });

  it("blocks a past date", () => {
    const violations = evaluateBookingRequest({ ...validDraft, eventDate: "2025-01-01" }, makePolicy(), today);
    expect(violations.some((v) => v.code === "past_date")).toBe(true);
  });

  it("blocks over-capacity when not negotiable", () => {
    const violations = evaluateBookingRequest({ ...validDraft, attendees: 200 }, makePolicy(), today);
    const v = violations.find((x) => x.code === "over_max_capacity");
    expect(v?.severity).toBe("block");
  });

  it("confirms over-capacity when negotiable", () => {
    const violations = evaluateBookingRequest(
      { ...validDraft, attendees: 200 },
      makePolicy({ capacityNegotiable: true }),
      today
    );
    const v = violations.find((x) => x.code === "over_max_capacity");
    expect(v?.severity).toBe("confirm");
    expect(v?.confirmBody).toContain("fire-code");
  });

  it("blocks below-min-hours when not negotiable", () => {
    const violations = evaluateBookingRequest(
      { ...validDraft, startTime: "18:00", endTime: "19:00" },
      makePolicy(),
      today
    );
    const v = violations.find((x) => x.code === "below_min_hours");
    expect(v?.severity).toBe("block");
  });

  it("confirms below-min-hours when negotiable", () => {
    const violations = evaluateBookingRequest(
      { ...validDraft, startTime: "18:00", endTime: "19:00" },
      makePolicy({ minBookingHoursNegotiable: true }),
      today
    );
    const v = violations.find((x) => x.code === "below_min_hours");
    expect(v?.severity).toBe("confirm");
  });

  it("blocks a request outside the venue's stated time window (always a hard block)", () => {
    const violations = evaluateBookingRequest(
      { ...validDraft, startTime: "14:00", endTime: "16:00" },
      makePolicy({ earliestStartTime: "18:00", latestEndTime: "02:00" }),
      today
    );
    const v = violations.find((x) => x.code === "outside_time_window");
    expect(v?.severity).toBe("block");
  });

  it("blocks a request off the booking increment grid", () => {
    const violations = evaluateBookingRequest(
      { ...validDraft, startTime: "18:10", endTime: "22:00" },
      makePolicy({ bookingIncrementMinutes: 30 }),
      today
    );
    expect(violations.some((v) => v.code === "not_on_increment")).toBe(true);
  });

  it("blocks equal start/end times", () => {
    const violations = evaluateBookingRequest({ ...validDraft, endTime: "18:00" }, makePolicy(), today);
    expect(violations.some((v) => v.code === "end_equals_start")).toBe(true);
  });
});

describe("getBlockingViolations / getConfirmableViolations", () => {
  it("splits by severity", () => {
    const violations = [
      { code: "past_date" as const, severity: "block" as const, message: "" },
      { code: "over_max_capacity" as const, severity: "confirm" as const, message: "" },
    ];
    expect(getBlockingViolations(violations)).toHaveLength(1);
    expect(getConfirmableViolations(violations)).toHaveLength(1);
  });
});

describe("formatBookingWindow", () => {
  it("formats a same-day window", () => {
    expect(formatBookingWindow("09:00", "23:00")).toBe("9:00 AM – 11:00 PM");
  });

  it("formats an overnight window with a next-day suffix", () => {
    expect(formatBookingWindow("18:00", "02:00")).toBe("6:00 PM – 2:00 AM (next day)");
  });

  it("returns null when no window is set", () => {
    expect(formatBookingWindow(undefined, undefined)).toBeNull();
    expect(formatBookingWindow("18:00", null)).toBeNull();
  });
});

describe("formatBookingIncrement", () => {
  it("formats minute increments", () => {
    expect(formatBookingIncrement(15)).toBe("15-minute increments");
    expect(formatBookingIncrement(30)).toBe("30-minute increments");
  });

  it("formats the 60-minute case as 1-hour", () => {
    expect(formatBookingIncrement(60)).toBe("1-hour increments");
  });

  it("returns null when unset", () => {
    expect(formatBookingIncrement(null)).toBeNull();
    expect(formatBookingIncrement(undefined)).toBeNull();
  });
});

describe("toVenueBookingPolicy", () => {
  it("defaults negotiability to false and window/increment to null when unset", () => {
    const venue = { maxCapacity: 100, seatedCapacity: 60, minBookingHours: 3, name: "Neon Foundry" } as Venue;
    expect(toVenueBookingPolicy(venue)).toEqual({
      maxCapacity: 100,
      seatedCapacity: 60,
      minBookingHours: 3,
      capacityNegotiable: false,
      minBookingHoursNegotiable: false,
      earliestStartTime: null,
      latestEndTime: null,
      bookingIncrementMinutes: null,
      venueName: "Neon Foundry",
    });
  });
});
