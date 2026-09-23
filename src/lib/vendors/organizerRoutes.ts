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
  return bookingId ? `/dashboard/organizer/bookings/${bookingId}/vendors` : "/dashboard/organizer/vendors";
}

export function organizerProposalsPath(bookingId: string | null, needId: string): string {
  return `${organizerVendorsPath(bookingId)}/${needId}/proposals`;
}
