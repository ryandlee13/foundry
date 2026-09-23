import { formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import type { Booking, Coordinates } from "@/lib/types/spaces";

/**
 * The event details a vendor request needs, decoupled from where they came
 * from.
 *
 * A request used to read them straight off a `Booking`, which made a confirmed
 * venue a hard prerequisite for hiring anyone. A planner who wants to lock in a
 * DJ before they've found a room is a normal thing to be, so the form now takes
 * this instead: booking-derived when an event exists, planner-supplied when it
 * doesn't (`bookingId: null`).
 *
 * Pure — no storage access, so both constructors are testable without a browser.
 */
export interface VendorRequestContext {
  /** Null for a request not attached to an event yet. */
  bookingId: string | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  /** Null when the planner hasn't settled on a guest count yet. */
  attendees: number | null;
  publicLocation: string;
  coordinates: Coordinates;
  /** Human label for headers — the event's name, or a "no event yet" stand-in. */
  eventLabel: string;
  /** Sentence explaining where the date/time/guests came from, shown under the form. */
  sourceNote: string;
}

export function contextFromBooking(
  booking: Booking,
  publicLocation: string,
  coordinates: Coordinates
): VendorRequestContext {
  return {
    bookingId: booking.id,
    eventDate: booking.eventDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    attendees: booking.attendees,
    publicLocation,
    coordinates,
    eventLabel: formatEventLabel(booking),
    sourceNote: `Date and guest count come from this booking: ${formatEventDate(booking.eventDate)}, ${booking.attendees} guests.`,
  };
}

export interface StandaloneRequestDetails {
  eventDate: string;
  startTime: string;
  endTime: string;
  attendees: string;
  publicLocation: string;
}

export function getEmptyStandaloneDetails(): StandaloneRequestDetails {
  return { eventDate: "", startTime: "", endTime: "", attendees: "", publicLocation: "San Francisco" };
}

/** Validation errors keyed by field. Empty object means the details are usable. */
export function validateStandaloneDetails(details: StandaloneRequestDetails): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!details.eventDate) errors.eventDate = "Pick the date you need this vendor.";
  if (!details.startTime || !details.endTime) errors.startTime = "Set a start and an end time.";
  if (!details.publicLocation.trim()) errors.publicLocation = "Say roughly where the event is.";
  if (details.attendees && Number(details.attendees) <= 0) {
    errors.attendees = "Enter a guest count above zero, or leave it blank.";
  }
  return errors;
}

/**
 * A request with no event behind it. Coordinates default to the city centre —
 * the planner has no venue yet, so there is no real location to geocode, and
 * vendor matching falls back to the city radius. Call only after
 * validateStandaloneDetails passes.
 */
export function contextFromStandaloneDetails(
  details: StandaloneRequestDetails,
  cityCoordinates: Coordinates
): VendorRequestContext {
  const attendees = Number(details.attendees);
  return {
    bookingId: null,
    eventDate: details.eventDate,
    startTime: details.startTime,
    endTime: details.endTime,
    attendees: Number.isFinite(attendees) && attendees > 0 ? Math.round(attendees) : null,
    publicLocation: details.publicLocation.trim(),
    coordinates: cityCoordinates,
    eventLabel: `Not assigned to an event · ${formatEventDate(details.eventDate)}`,
    sourceNote:
      "No venue booked yet. Once you book one, assign this vendor to it from your dashboard and everyone moves into a shared conversation.",
  };
}
