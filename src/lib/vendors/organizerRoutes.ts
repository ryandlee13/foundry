/**
 * Organizer-side vendor URLs, in one place.
 *
 * A vendor request is anchored to a booking *or* to nothing at all (see
 * `EventNeed.bookingId`), and every link, back-link, and notification has to
 * agree on where an unassigned one lives. Built by hand at ten call sites, the
 * null case silently produced `/dashboard/organizer/bookings/null/vendors`,
 * which routes to a 404 and looks like data loss rather than a bad link.
 *
 * Pure — no storage access.
 */

export function organizerVendorsPath(bookingId: string | null): string {
  return bookingId
    ? `/dashboard/organizer/bookings/${bookingId}/vendors`
    : // `/dashboard/organizer/vendors` itself is the Vendors tab — the list of
      // the planner's events. Requests with no event yet live one level down,
      // still reachable by URL but still not linked from anywhere (see
      // CLAUDE.md's "hide vendors without an event" note).
      "/dashboard/organizer/vendors/unassigned";
}

export function organizerProposalsPath(bookingId: string | null, needId: string): string {
  return `${organizerVendorsPath(bookingId)}/${needId}/proposals`;
}

/**
 * The event hub — one page per confirmed booking, holding that event's
 * progress, vendors, and conversations.
 *
 * Keyed by booking id because a confirmed `Booking` *is* the event in this
 * prototype; there is no events table (see docs/DATABASE.md). The route is
 * `/events/[bookingId]` rather than `/bookings/[id]` because "event" is what
 * a planner calls the thing, and the booking is an implementation detail of
 * how it's currently anchored.
 *
 * Null means the vendor lobby: hires that have no event to belong to yet.
 */
export function organizerEventPath(bookingId: string | null): string {
  return bookingId
    ? `/dashboard/organizer/events/${bookingId}`
    : "/dashboard/organizer/vendors/unassigned";
}
