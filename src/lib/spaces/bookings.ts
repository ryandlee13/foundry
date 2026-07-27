import type { Booking } from "@/lib/types/spaces";

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
}): Booking {
  const booking: Booking = {
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...input,
  };
  saveBookings([...getBookings(), booking]);
  return booking;
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
