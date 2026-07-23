import type { Booking } from "@/lib/types/spaces";

/**
 * Browser-local bookings. Same prototype caveat as auth/submittedVenues
 * storage: no server, nothing persisted beyond this browser. "Booking"
 * here means instantly confirmed — there's no quote/negotiation step yet,
 * matching the simplified "immediately book" flow this prototype targets.
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
}): Booking {
  const booking: Booking = {
    id: crypto.randomUUID(),
    status: "confirmed",
    createdAt: new Date().toISOString(),
    ...input,
  };
  saveBookings([...getBookings(), booking]);
  return booking;
}

export function getBookingsForVenue(venueId: string): Booking[] {
  return getBookings().filter((booking) => booking.venueId === venueId);
}

export function getBookingsForOrganizer(organizerId: string): Booking[] {
  return getBookings().filter((booking) => booking.organizerId === organizerId);
}
