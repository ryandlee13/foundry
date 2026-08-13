import { describe, expect, it } from "vitest";
import { formatEventDate, formatEventLabel } from "../bookings";

describe("formatEventDate", () => {
  it("renders an ISO date in readable form", () => {
    expect(formatEventDate("2026-08-23")).toBe("Sun, Aug 23");
  });

  it("does not shift the day across time zones", () => {
    // Parsed at local noon — a naive `new Date("2026-01-01")` is UTC midnight,
    // which renders as Dec 31 for anyone west of Greenwich.
    expect(formatEventDate("2026-01-01")).toBe("Thu, Jan 1");
  });

  it("passes unparseable input through rather than showing Invalid Date", () => {
    expect(formatEventDate("")).toBe("");
    expect(formatEventDate("not-a-date")).toBe("not-a-date");
  });
});

describe("formatEventLabel", () => {
  const booking = { eventName: null as string | null, venueName: "Neon Foundry", eventDate: "2026-08-23" };

  it("uses the organizer-chosen event name when set", () => {
    expect(formatEventLabel({ ...booking, eventName: "Foundry Summer Social" })).toBe("Foundry Summer Social");
  });

  it("falls back to venue + readable date when the event name is null", () => {
    expect(formatEventLabel(booking)).toBe("Neon Foundry · Sun, Aug 23");
  });

  it("falls back when the event name is blank", () => {
    expect(formatEventLabel({ ...booking, eventName: "   " })).toBe("Neon Foundry · Sun, Aug 23");
  });
});
