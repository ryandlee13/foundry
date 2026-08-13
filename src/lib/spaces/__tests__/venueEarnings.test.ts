import { describe, expect, it } from "vitest";
import { computeVenueEarnings, estimateBookingValue, selectUpcomingBookings } from "../venueEarnings";
import type { Booking } from "@/lib/types/spaces";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b-1",
    venueId: "v-1",
    venueName: "Test Venue",
    venueSlug: "test-venue",
    organizerId: "acct-1",
    organizerName: "Test Organizer",
    eventDate: "2026-03-10",
    startTime: "18:00",
    endTime: "22:00",
    attendees: 50,
    status: "confirmed",
    coiAgreed: false,
    depositAgreed: false,
    eventName: null,
    eventType: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const VENUES = { "v-1": { minHourlyRate: 100 }, "v-2": { minHourlyRate: 250 } };

describe("estimateBookingValue", () => {
  it("multiplies the venue's floor rate by booked hours", () => {
    expect(estimateBookingValue({ startTime: "18:00", endTime: "22:00" }, { minHourlyRate: 100 })).toBe(400);
  });

  it("handles a window that crosses midnight", () => {
    expect(estimateBookingValue({ startTime: "22:00", endTime: "02:00" }, { minHourlyRate: 100 })).toBe(400);
  });

  it("rounds partial hours", () => {
    expect(estimateBookingValue({ startTime: "18:00", endTime: "19:30" }, { minHourlyRate: 100 })).toBe(150);
  });

  it("returns 0 for a zero-length booking rather than a negative number", () => {
    expect(estimateBookingValue({ startTime: "18:00", endTime: "18:00" }, { minHourlyRate: 100 })).toBe(0);
  });

  it("returns 0 for unparseable times", () => {
    expect(estimateBookingValue({ startTime: "", endTime: "22:00" }, { minHourlyRate: 100 })).toBe(0);
  });
});

describe("computeVenueEarnings", () => {
  it("counts only past confirmed bookings as earned", () => {
    const result = computeVenueEarnings([booking()], VENUES, "2026-03-20");
    expect(result.totalAmount).toBe(400);
    expect(result.totalBookingCount).toBe(1);
    expect(result.upcomingBookingCount).toBe(0);
  });

  it("treats a future booking as upcoming, not earned", () => {
    const result = computeVenueEarnings([booking({ eventDate: "2026-04-10" })], VENUES, "2026-03-20");
    expect(result.totalAmount).toBe(0);
    expect(result.upcomingBookingCount).toBe(1);
  });

  it("scopes the month figure to the current calendar month", () => {
    const result = computeVenueEarnings(
      [booking({ id: "b-1", eventDate: "2026-03-10" }), booking({ id: "b-2", eventDate: "2026-02-10" })],
      VENUES,
      "2026-03-20"
    );
    expect(result.totalAmount).toBe(800);
    expect(result.monthAmount).toBe(400);
    expect(result.monthBookingCount).toBe(1);
  });

  it("ignores pending and declined bookings entirely", () => {
    const result = computeVenueEarnings(
      [booking({ id: "b-1", status: "pending" }), booking({ id: "b-2", status: "declined" })],
      VENUES,
      "2026-03-20"
    );
    expect(result.totalAmount).toBe(0);
    expect(result.totalBookingCount).toBe(0);
    expect(result.upcomingBookingCount).toBe(0);
  });

  it("skips a booking whose venue is no longer known rather than counting it at zero", () => {
    const result = computeVenueEarnings([booking({ venueId: "v-gone" })], VENUES, "2026-03-20");
    expect(result.totalBookingCount).toBe(0);
  });

  it("sums across multiple venues at their own rates", () => {
    const result = computeVenueEarnings(
      [booking({ id: "b-1", venueId: "v-1" }), booking({ id: "b-2", venueId: "v-2" })],
      VENUES,
      "2026-03-20"
    );
    expect(result.totalAmount).toBe(400 + 1000);
  });

  it("counts a booking happening today as earned", () => {
    const result = computeVenueEarnings([booking({ eventDate: "2026-03-20" })], VENUES, "2026-03-20");
    expect(result.totalBookingCount).toBe(1);
    expect(result.upcomingBookingCount).toBe(0);
  });
});

describe("selectUpcomingBookings", () => {
  it("returns confirmed future bookings soonest first", () => {
    const result = selectUpcomingBookings(
      [
        booking({ id: "b-late", eventDate: "2026-05-01" }),
        booking({ id: "b-soon", eventDate: "2026-04-01" }),
        booking({ id: "b-past", eventDate: "2026-01-01" }),
        booking({ id: "b-pending", eventDate: "2026-04-15", status: "pending" }),
      ],
      "2026-03-20"
    );
    expect(result.map((b) => b.id)).toEqual(["b-soon", "b-late"]);
  });
});
