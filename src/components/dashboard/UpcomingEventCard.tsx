import Link from "next/link";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";
import { formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { INTERACTIVE_CARD } from "@/lib/ui/interactive";
import type { Booking, Venue } from "@/lib/types/spaces";

/**
 * One upcoming event, led by the venue's photo — an owner with several
 * listings needs to tell at a glance which space an event is in.
 *
 * The whole card navigates. Only the thumbnail used to be a link, so the
 * title, date, and venue name — the parts anyone would actually aim at — did
 * nothing when clicked, and the card had no hover state to suggest otherwise.
 *
 * Done with an overlay link rather than by wrapping the card, because
 * `trailing` carries its own buttons and nesting interactive elements is
 * invalid. Same pattern as GigCard and VendorProfileCard; the trailing slot
 * sits above the overlay so its controls still work.
 */
export default function UpcomingEventCard({
  booking,
  venue,
  trailing,
  href,
}: {
  booking: Booking;
  venue?: Venue;
  trailing?: React.ReactNode;
  /** Defaults to the venue listing — the only destination that makes sense for every role. */
  href?: string;
}) {
  const destination = href ?? `/spaces/${booking.venueSlug}?from=dashboard`;

  return (
    <li className={`group relative flex items-center gap-4 rounded-2xl border border-line bg-paper p-3 ${INTERACTIVE_CARD}`}>
      <Link href={destination} className="absolute inset-0 z-0" aria-label={`Open ${formatEventLabel(booking)}`} />

      <div className="pointer-events-none shrink-0">
        {venue ? (
          <VenueImagePlaceholder
            accent={venue.visualAccent}
            icon={venue.icon}
            imageCount={0}
            photoUrl={venue.photos?.[0]}
            className="h-16 w-20 rounded-xl"
          />
        ) : (
          <div className="h-16 w-20 rounded-xl bg-paper-dim" />
        )}
      </div>

      <div className="pointer-events-none min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold text-ink">{formatEventLabel(booking)}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {formatEventDate(booking.eventDate)} · {formatTimeRange(booking.startTime, booking.endTime)} ·{" "}
          {booking.attendees} guests
        </p>
        <p className="truncate text-xs text-ink-soft">{booking.venueName}</p>
      </div>

      {/* Above the overlay, so these stay clickable in their own right. */}
      {trailing && <div className="relative z-10 shrink-0">{trailing}</div>}
    </li>
  );
}
