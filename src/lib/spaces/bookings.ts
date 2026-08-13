import type { Booking } from "@/lib/types/spaces";
import { getVenueBySlugAnywhere } from "./submittedVenues";

/**
 * Browser-local bookings. Same prototype caveat as auth/submittedVenues
 * storage: no server, nothing persisted beyond this browser. Requests start
 * "pending" and the venue owner accepts/declines from their dashboard —
 * there's still no quote/negotiation step, just a single accept/decline.
 */
const BOOKINGS_KEY = "foundry.bookings";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getBookings(): Booking[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BOOKINGS_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

export function addBooking(input: {
  venueId: string;
  venueName: string;
  venueSlug: string;
  organizerId: string;
  organizerName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendees: number;
  coiAgreed: boolean;
  depositAgreed: boolean;
  eventName?: string | null;
  eventType?: Booking["eventType"];
}): Booking {
  const venue = getVenueBySlugAnywhere(input.venueSlug);
  const booking: Booking = {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    eventName: null,
    eventType: null,
    venueOwnerId: venue?.ownerId ?? null,
    ...input,
  };
  saveBookings([...getBookings(), booking]);
  return booking;
}

/** Resolves a booking's venue-owner id, falling back to a fresh venue lookup for bookings written before venueOwnerId was denormalized. */
export function getBookingVenueOwnerId(booking: Booking): string | null {
  if (booking.venueOwnerId !== undefined) return booking.venueOwnerId;
  return getVenueBySlugAnywhere(booking.venueSlug)?.ownerId ?? null;
}

/**
 * Pure: "YYYY-MM-DD" -> "Sat, Mar 14". Dates are stored ISO (what
 * <input type="date"> produces) but never shown that way. Parsed at local
 * noon so the date can't shift a day across time zones, and passed through
 * untouched if unparseable.
 */
export function formatEventDate(dateIso: string): string {
  const date = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** Pure: the organizer-chosen event name, falling back to "{venue} · {date}" when unset. */
export function formatEventLabel(booking: Pick<Booking, "eventName" | "venueName" | "eventDate">): string {
  return booking.eventName?.trim() || `${booking.venueName} · ${formatEventDate(booking.eventDate)}`;
}

export function updateBookingStatus(
  bookingId: string,
  status: Booking["status"]
): Booking | undefined {
  const bookings = getBookings();
  const index = bookings.findIndex((booking) => booking.id === bookingId);
  if (index === -1) return undefined;

  const updated: Booking = { ...bookings[index], status };
  const next = [...bookings];
  next[index] = updated;
  saveBookings(next);
  return updated;
}

export function getBookingById(bookingId: string): Booking | undefined {
  return getBookings().find((booking) => booking.id === bookingId);
}

export function getBookingsForVenue(venueId: string): Booking[] {
  return getBookings().filter((booking) => booking.venueId === venueId);
}

export function getBookingsForOrganizer(organizerId: string): Booking[] {
  return getBookings().filter((booking) => booking.organizerId === organizerId);
}

/** Confirmed bookings for an organizer, excluding one specific booking (e.g. the one currently being reviewed). */
export function getPastRentalsForOrganizer(organizerId: string, excludeBookingId?: string): Booking[] {
  return getBookingsForOrganizer(organizerId).filter(
    (booking) => booking.status === "confirmed" && booking.id !== excludeBookingId
  );
}
