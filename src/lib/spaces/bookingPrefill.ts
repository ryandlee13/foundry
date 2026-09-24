import { EVENT_TYPE_LABELS } from "./labels";
import type { EventType, SearchFilters } from "@/lib/types/spaces";

/**
 * Carries what a planner already told us on the homepage (or in the Discover
 * Spaces filters) through to the booking form on a venue page, so nobody types
 * their date, times, and guest count a second time.
 *
 * Carried in the URL, never persisted — same shape of decision as
 * `VendorSearchBrief` (src/lib/vendors/vendorSearch.ts). It reuses the exact
 * query keys `urlState.ts` already defines for the filters (`date`, `start`,
 * `end`, `attendees`, `eventType`), so the link that filtered the grid is the
 * same link that fills the form; there is no second vocabulary to keep in sync.
 *
 * This is a convenience, not an input source of truth: every value is still
 * editable in the form, and `evaluateBookingRequest()` re-checks all of it
 * against the venue's policy before anything is submitted.
 *
 * Pure — no storage, no `window`.
 */

export interface BookingPrefill {
  /** "YYYY-MM-DD", the format `<input type="date">` reads and writes. */
  eventDate: string | null;
  /** "HH:mm" 24h, the format `<input type="time">` reads and writes. */
  startTime: string | null;
  endTime: string | null;
  attendees: number | null;
  eventType: EventType | null;
}

export const EMPTY_BOOKING_PREFILL: BookingPrefill = {
  eventDate: null,
  startTime: null,
  endTime: null,
  attendees: null,
  eventType: null,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];

function readDate(value: string | null): string | null {
  return value && DATE_PATTERN.test(value) ? value : null;
}

function readTime(value: string | null): string | null {
  return value && TIME_PATTERN.test(value) ? value : null;
}

function readAttendees(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

/**
 * The `eventType` key is a CSV list on the filters side. A planner who ticked
 * three event types hasn't told us which one their event *is*, so only a
 * single-value list prefills — guessing would put a wrong answer in a field
 * people skim past.
 */
function readEventType(value: string | null): EventType | null {
  if (!value) return null;
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 1) return null;
  return EVENT_TYPES.includes(parts[0] as EventType) ? (parts[0] as EventType) : null;
}

export function readBookingPrefill(params: URLSearchParams): BookingPrefill {
  return {
    eventDate: readDate(params.get("date")),
    startTime: readTime(params.get("start")),
    endTime: readTime(params.get("end")),
    attendees: readAttendees(params.get("attendees")),
    eventType: readEventType(params.get("eventType")),
  };
}

export function bookingPrefillFromFilters(filters: SearchFilters): BookingPrefill {
  return {
    eventDate: readDate(filters.eventDate),
    startTime: readTime(filters.startTime),
    endTime: readTime(filters.endTime),
    attendees: filters.attendees !== null ? readAttendees(String(filters.attendees)) : null,
    eventType: filters.eventTypes.length === 1 ? filters.eventTypes[0] : null,
  };
}

/** Query string (no leading "?") for a venue link. Empty when there's nothing to carry. */
export function bookingPrefillToQuery(prefill: BookingPrefill): string {
  const params = new URLSearchParams();
  if (prefill.eventDate) params.set("date", prefill.eventDate);
  if (prefill.startTime) params.set("start", prefill.startTime);
  if (prefill.endTime) params.set("end", prefill.endTime);
  if (prefill.attendees !== null) params.set("attendees", String(prefill.attendees));
  if (prefill.eventType) params.set("eventType", prefill.eventType);
  return params.toString();
}

export function hasBookingPrefill(prefill: BookingPrefill): boolean {
  return (
    prefill.eventDate !== null ||
    prefill.startTime !== null ||
    prefill.endTime !== null ||
    prefill.attendees !== null ||
    prefill.eventType !== null
  );
}
