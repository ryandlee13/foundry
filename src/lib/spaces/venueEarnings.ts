import { computeBookingDurationMinutes } from "./bookingConstraints";
import type { Booking, Venue } from "@/lib/types/spaces";

/**
 * Venue earnings KPIs.
 *
 * IMPORTANT: there is no agreed price anywhere on a `Booking` in this
 * prototype — no quote step exists yet (docs/IMPLEMENTATION_PLAN.md Phase 4),
 * so nothing records what an organizer was actually charged. Every number
 * here is therefore an ESTIMATE derived from two real values: the venue's own
 * stated `minHourlyRate` and the booking's real duration. It must always be
 * rendered as an estimate — never as revenue actually collected (CLAUDE.md's
 * "placeholder copy must not claim things that aren't true yet"). Once real
 * quotes/payments land, this whole module is replaced by summing real
 * amounts, not extended.
 */
export interface VenueEarnings {
  /** Estimated earnings from bookings that have already happened this calendar month. */
  monthAmount: number;
  /** Estimated earnings from every booking that has already happened. */
  totalAmount: number;
  monthBookingCount: number;
  totalBookingCount: number;
  /** Confirmed bookings still ahead — not counted as earned yet. */
  upcomingBookingCount: number;
}

/** Estimated value of one booking: the venue's floor hourly rate x actual booked hours. */
export function estimateBookingValue(
  booking: Pick<Booking, "startTime" | "endTime">,
  venue: Pick<Venue, "minHourlyRate">
): number {
  const minutes = computeBookingDurationMinutes(booking.startTime, booking.endTime);
  if (minutes === null || minutes <= 0) return 0;
  return Math.round((minutes / 60) * venue.minHourlyRate);
}

function isSameCalendarMonth(dateIso: string, referenceIso: string): boolean {
  return dateIso.slice(0, 7) === referenceIso.slice(0, 7);
}

/**
 * Pure. `todayIso` is a "YYYY-MM-DD" date; a booking counts as earned once
 * its event date is on or before that. Bookings whose venue isn't in
 * `venuesById` are skipped rather than counted at zero, so a stale booking
 * pointing at a deleted listing can't quietly drag the average down.
 */
export function computeVenueEarnings(
  bookings: Booking[],
  venuesById: Record<string, Pick<Venue, "minHourlyRate">>,
  todayIso: string
): VenueEarnings {
  let monthAmount = 0;
  let totalAmount = 0;
  let monthBookingCount = 0;
  let totalBookingCount = 0;
  let upcomingBookingCount = 0;

  for (const booking of bookings) {
    if (booking.status !== "confirmed") continue;
    const venue = venuesById[booking.venueId];
    if (!venue) continue;

    if (booking.eventDate > todayIso) {
      upcomingBookingCount += 1;
      continue;
    }

    const value = estimateBookingValue(booking, venue);
    totalAmount += value;
    totalBookingCount += 1;
    if (isSameCalendarMonth(booking.eventDate, todayIso)) {
      monthAmount += value;
      monthBookingCount += 1;
    }
  }

  return { monthAmount, totalAmount, monthBookingCount, totalBookingCount, upcomingBookingCount };
}

/** Confirmed bookings still ahead of `todayIso`, soonest first. */
export function selectUpcomingBookings(bookings: Booking[], todayIso: string): Booking[] {
  return bookings
    .filter((booking) => booking.status === "confirmed" && booking.eventDate >= todayIso)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}
