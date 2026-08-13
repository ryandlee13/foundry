import Link from "next/link";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";
import { formatEventLabel } from "@/lib/spaces/bookings";
import type { Booking, Venue } from "@/lib/types/spaces";

function formatEventDate(dateIso: string): string {
  // Parsed as local noon so a "YYYY-MM-DD" date can't shift a day across time zones.
  const date = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * One upcoming event, led by the venue's photo — an owner with several
 * listings needs to tell at a glance which space an event is in.
 */
export default function UpcomingEventCard({
  booking,
  venue,
  trailing,
}: {
  booking: Booking;
  venue?: Venue;
  trailing?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-line bg-paper p-3">
      <Link href={`/spaces/${booking.venueSlug}`} className="shrink-0">
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
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold text-ink">{formatEventLabel(booking)}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {formatEventDate(booking.eventDate)} · {booking.startTime}–{booking.endTime} · {booking.attendees} guests
        </p>
        <p className="truncate text-xs text-ink-soft">{booking.venueName}</p>
      </div>

      {trailing && <div className="shrink-0">{trailing}</div>}
    </li>
  );
}
