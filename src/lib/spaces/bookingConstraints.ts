import type { Venue } from "@/lib/types/spaces";

/**
 * Pure booking-constraint evaluation — no localStorage, no `window`, safe to
 * unit-test directly. This is the single source of truth for whether a
 * planner's requested date/time/guest-count is allowed against a venue's
 * stated rules; BookingPanel.tsx calls evaluateBookingRequest() rather than
 * re-implementing any of this inline.
 */

export type BookingConstraintCode =
  | "missing_fields"
  | "end_equals_start"
  | "past_date"
  | "below_min_hours"
  | "over_max_capacity"
  | "outside_time_window"
  | "not_on_increment";

export type BookingConstraintSeverity = "block" | "confirm";

export interface BookingConstraintViolation {
  code: BookingConstraintCode;
  severity: BookingConstraintSeverity;
  /** Planner-facing inline error text (used when severity is "block"). */
  message: string;
  /** Confirm-dialog heading — present only when severity is "confirm". */
  confirmTitle?: string;
  /** Confirm-dialog body — present only when severity is "confirm". */
  confirmBody?: string;
}

export interface VenueBookingPolicy {
  maxCapacity: number;
  seatedCapacity: number;
  minBookingHours: number;
  capacityNegotiable: boolean;
  minBookingHoursNegotiable: boolean;
  earliestStartTime: string | null;
  latestEndTime: string | null;
  bookingIncrementMinutes: number | null;
  venueName: string;
}

export interface BookingRequestDraft {
  eventDate: string;
  startTime: string;
  endTime: string;
  attendees: number;
}

/** Adapter: Venue -> policy, applying the "undefined means non-negotiable / no window" defaults. */
export function toVenueBookingPolicy(venue: Venue): VenueBookingPolicy {
  return {
    maxCapacity: venue.maxCapacity,
    seatedCapacity: venue.seatedCapacity,
    minBookingHours: venue.minBookingHours,
    capacityNegotiable: venue.capacityNegotiable ?? false,
    minBookingHoursNegotiable: venue.minBookingHoursNegotiable ?? false,
    earliestStartTime: venue.earliestStartTime ?? null,
    latestEndTime: venue.latestEndTime ?? null,
    bookingIncrementMinutes: venue.bookingIncrementMinutes ?? null,
    venueName: venue.name,
  };
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" -> minutes since midnight, or null if unparseable. */
export function parseTimeToMinutes(hhmm: string): number | null {
  const match = TIME_RE.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since midnight -> "HH:mm". */
export function formatMinutesAsTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60)
    .toString()
    .padStart(2, "0");
  const mm = (normalized % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * "HH:mm" (24h) -> "6:00 PM" for display. Times are STORED as 24h ("HH:mm",
 * what <input type="time"> produces) but never shown that way — every
 * user-facing surface goes through this or formatTimeRange().
 */
export function formatTimeDisplay(hhmm: string): string {
  const minutes = parseTimeToMinutes(hhmm);
  if (minutes === null) return hhmm;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Duration in minutes, treating end <= start as crossing midnight
 * (18:00 -> 02:00 = 480 minutes). Returns null for unparseable input, and 0
 * when start === end (callers treat 0 as invalid, not as a 24h booking).
 */
export function computeBookingDurationMinutes(startTime: string, endTime: string): number | null {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return null;
  if (start === end) return 0;
  return end > start ? end - start : 1440 - start + end;
}

export interface BookingWindow {
  startMinutes: number;
  endMinutes: number;
  lengthMinutes: number;
  crossesMidnight: boolean;
}

/**
 * Normalizes an owner-stated window onto a single axis so the same math
 * covers same-day and overnight windows: a booking fits iff
 * offsetFromWindowStart(bookingStart) + bookingDuration <= windowLengthMinutes.
 */
export function computeBookingWindow(earliestStartTime: string, latestEndTime: string): BookingWindow | null {
  const startMinutes = parseTimeToMinutes(earliestStartTime);
  const endMinutes = parseTimeToMinutes(latestEndTime);
  if (startMinutes === null || endMinutes === null) return null;
  const lengthMinutes = ((endMinutes - startMinutes + 1440) % 1440) || 1440;
  return { startMinutes, endMinutes, lengthMinutes, crossesMidnight: endMinutes <= startMinutes };
}

export function isWithinBookingWindow(
  startTime: string,
  endTime: string,
  earliestStartTime: string,
  latestEndTime: string
): boolean {
  const window = computeBookingWindow(earliestStartTime, latestEndTime);
  const duration = computeBookingDurationMinutes(startTime, endTime);
  const start = parseTimeToMinutes(startTime);
  if (!window || duration === null || duration === 0 || start === null) return false;
  const offset = ((start - window.startMinutes + 1440) % 1440);
  return offset + duration <= window.lengthMinutes;
}

export function isOnIncrement(hhmm: string, incrementMinutes: number): boolean {
  const minutes = parseTimeToMinutes(hhmm);
  if (minutes === null || incrementMinutes <= 0) return false;
  return minutes % incrementMinutes === 0;
}

/** The one entry point BookingPanel calls. Returns [] when everything is fine. */
export function evaluateBookingRequest(
  draft: BookingRequestDraft,
  policy: VenueBookingPolicy,
  todayIsoDate: string
): BookingConstraintViolation[] {
  const violations: BookingConstraintViolation[] = [];

  if (!draft.eventDate || !draft.startTime || !draft.endTime || !draft.attendees) {
    violations.push({
      code: "missing_fields",
      severity: "block",
      message: "Fill in a date, start/end time, and guest count.",
    });
    return violations;
  }

  if (draft.eventDate < todayIsoDate) {
    violations.push({ code: "past_date", severity: "block", message: "Choose a date that hasn't already passed." });
  }

  const duration = computeBookingDurationMinutes(draft.startTime, draft.endTime);
  if (duration === null || duration === 0) {
    violations.push({
      code: "end_equals_start",
      severity: "block",
      message: "Start and end time can't be the same — enter a real time range.",
    });
  }

  if (draft.attendees > policy.maxCapacity) {
    if (policy.capacityNegotiable) {
      violations.push({
        code: "over_max_capacity",
        severity: "confirm",
        message: "",
        confirmTitle: "This is over the venue's stated capacity",
        confirmBody: `${policy.venueName} lists a maximum capacity of ${policy.maxCapacity} guests — your request is for ${draft.attendees}. The host has said they'll consider larger groups, but capacity limits often reflect fire-code or permit restrictions the host can't waive on their own. Submit anyway, or adjust your guest count for a better chance of approval?`,
      });
    } else {
      violations.push({
        code: "over_max_capacity",
        severity: "block",
        message: `This space holds up to ${policy.maxCapacity} guests.`,
      });
    }
  }

  if (duration !== null && duration > 0 && duration < policy.minBookingHours * 60) {
    if (policy.minBookingHoursNegotiable) {
      violations.push({
        code: "below_min_hours",
        severity: "confirm",
        message: "",
        confirmTitle: "This is shorter than the venue's preferred booking length",
        confirmBody: `${policy.venueName} prefers bookings of at least ${policy.minBookingHours} hours. The host has said they'll consider shorter bookings — you can still submit your request, or change your event details for a better chance of it being accepted.`,
      });
    } else {
      violations.push({
        code: "below_min_hours",
        severity: "block",
        message: `This venue requires a minimum booking of ${policy.minBookingHours} hours.`,
      });
    }
  }

  if (policy.earliestStartTime && policy.latestEndTime) {
    if (!isWithinBookingWindow(draft.startTime, draft.endTime, policy.earliestStartTime, policy.latestEndTime)) {
      violations.push({
        code: "outside_time_window",
        severity: "block",
        message: `${policy.venueName} only accepts events ${formatBookingWindow(policy.earliestStartTime, policy.latestEndTime)}.`,
      });
    }
  }

  if (policy.bookingIncrementMinutes) {
    const startOk = isOnIncrement(draft.startTime, policy.bookingIncrementMinutes);
    const endOk = isOnIncrement(draft.endTime, policy.bookingIncrementMinutes);
    if (!startOk || !endOk) {
      violations.push({
        code: "not_on_increment",
        severity: "block",
        message: `${policy.venueName} only accepts bookings in ${formatBookingIncrement(policy.bookingIncrementMinutes)}.`,
      });
    }
  }

  return violations;
}

export function getBlockingViolations(violations: BookingConstraintViolation[]): BookingConstraintViolation[] {
  return violations.filter((v) => v.severity === "block");
}

export function getConfirmableViolations(violations: BookingConstraintViolation[]): BookingConstraintViolation[] {
  return violations.filter((v) => v.severity === "confirm");
}

/** "6:00 PM – 2:00 AM (next day)" / "9:00 AM – 11:00 PM" / null when no window is set. */
export function formatBookingWindow(
  earliestStartTime: string | undefined | null,
  latestEndTime: string | undefined | null
): string | null {
  if (!earliestStartTime || !latestEndTime) return null;
  const window = computeBookingWindow(earliestStartTime, latestEndTime);
  if (!window) return null;
  const suffix = window.crossesMidnight ? " (next day)" : "";
  return `${formatTimeDisplay(earliestStartTime)} – ${formatTimeDisplay(latestEndTime)}${suffix}`;
}

/** "6:00 PM – 11:00 PM" — the display form of a booking's own start/end pair. */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTimeDisplay(startTime)} – ${formatTimeDisplay(endTime)}`;
}

/** "15-minute increments" / "1-hour increments" / null. */
export function formatBookingIncrement(incrementMinutes: number | undefined | null): string | null {
  if (!incrementMinutes) return null;
  if (incrementMinutes === 60) return "1-hour increments";
  return `${incrementMinutes}-minute increments`;
}
