import { describe, expect, it } from "vitest";
import { formatEventLabel } from "../bookings";

describe("formatEventLabel", () => {
  const booking = { eventName: null as string | null, venueName: "Neon Foundry", eventDate: "2026-08-23" };

  it("uses the organizer-chosen event name when set", () => {
    expect(formatEventLabel({ ...booking, eventName: "Foundry Summer Social" })).toBe("Foundry Summer Social");
  });

  it("falls back to venue + date when the event name is null", () => {
    expect(formatEventLabel(booking)).toBe("Neon Foundry · 2026-08-23");
  });

  it("falls back when the event name is blank", () => {
    expect(formatEventLabel({ ...booking, eventName: "   " })).toBe("Neon Foundry · 2026-08-23");
  });
});
