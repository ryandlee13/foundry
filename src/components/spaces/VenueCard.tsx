"use client";

import { useState } from "react";
import Link from "next/link";
import { BADGE_LABELS, SPACE_TYPE_LABELS } from "@/lib/spaces/labels";
import { formatDistanceMiles } from "@/lib/spaces/distance";
import { getEventsDoneForVenue } from "@/lib/spaces/reviews";
import VenueAmenityList from "./VenueAmenityList";
import VenueImagePlaceholder from "./VenueImagePlaceholder";
import type { VenueWithDistance } from "@/lib/types/spaces";

function formatPriceRange(min: number, max: number): string {
  return min === max ? `$${min}/hr` : `$${min}–$${max}/hr`;
}

/**
 * Sits above the card's full-bleed link (`z-10`, like the save heart) and is
 * always visible rather than hover-only, so it works on touch.
 */
function PhotoArrow({
  direction,
  venueName,
  onClick,
}: {
  direction: "previous" | "next";
  venueName: string;
  onClick: (event: React.MouseEvent) => void;
}) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      aria-label={`Show the ${direction} photo of ${venueName}`}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-paper/80 text-ink opacity-80 backdrop-blur-sm transition-all hover:bg-paper hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brass ${
        isNext ? "right-2" : "left-2"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.25}>
        <path
          d={isNext ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function VenueCard({
  venue,
  prefillQuery = "",
}: {
  venue: VenueWithDistance;
  /**
   * The planner's search brief (date, times, guest count, event type) as a
   * query string, carried onto the venue link so the booking form over there
   * opens already filled in. See src/lib/spaces/bookingPrefill.ts.
   */
  prefillQuery?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  /*
   * Events-hosted is invented filler (getEventsDoneForVenue is a hash, not a
   * count of real bookings), so it is gated to seed venues exactly the way
   * VenueReviews is — a real owner's freshly-submitted listing must never
   * claim events it hasn't had. Same gate, same reason: see CLAUDE.md's
   * placeholder-copy rule. Replace with a real booking count, don't widen
   * the gate.
   */
  const isSeedVenue = venue.ownerId === null;
  const eventsHosted = isSeedVenue ? getEventsDoneForVenue(venue.id) : null;

  /*
   * Paging through a listing's photos without opening it, so two spaces can be
   * compared side by side in the grid.
   *
   * Only real uploaded photos page. The seed listings are fictional and carry
   * none on purpose (CLAUDE.md's placeholder-copy rule — a real photograph of a
   * real San Francisco room would misrepresent an actual business), so arrows
   * there would step between identical gradients and feel broken.
   */
  const photos = venue.photos ?? [];
  const canBrowsePhotos = photos.length > 1;

  function stepPhoto(event: React.MouseEvent, delta: number) {
    // The whole card is covered by an absolutely-positioned <Link>; without
    // this, browsing photos navigates to the venue page instead.
    event.preventDefault();
    event.stopPropagation();
    setPhotoIndex((current) => (current + delta + photos.length) % photos.length);
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-lg">
      <div className="relative">
        <VenueImagePlaceholder
          accent={venue.visualAccent}
          icon={venue.icon}
          imageCount={venue.images.length}
          currentIndex={photoIndex + 1}
          photoUrl={photos[photoIndex]}
          className="aspect-[4/3] w-full"
        >
          {venue.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
              {BADGE_LABELS[venue.badge]}
            </span>
          )}

          {canBrowsePhotos && (
            <>
              <PhotoArrow
                direction="previous"
                venueName={venue.name}
                onClick={(event) => stepPhoto(event, -1)}
              />
              <PhotoArrow direction="next" venueName={venue.name} onClick={(event) => stepPhoto(event, 1)} />
            </>
          )}
        </VenueImagePlaceholder>

        <button
          type="button"
          aria-label={saved ? `Remove ${venue.name} from saved spaces` : `Save ${venue.name}`}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink/40 text-paper backdrop-blur-sm transition-colors hover:bg-ink/60"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path d="M12 20.5s-7.5-4.7-9.8-9.4C.8 7.7 2.5 4.5 5.8 4c2-.3 3.8.6 4.9 2.2.9-1.6 2.9-2.5 4.9-2.2 3.3.5 5 3.7 3.6 7.1-2.3 4.7-9.8 9.4-9.8 9.4Z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold text-ink">{venue.name}</h3>
            <p className="text-xs text-ink-soft">
              {venue.neighborhood}, {venue.city} · {SPACE_TYPE_LABELS[venue.spaceType]}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-ink-soft">
            {formatDistanceMiles(venue.distanceMiles)}
          </span>
        </div>

        <p className="mt-2 text-sm leading-snug text-ink-soft">{venue.tagline}</p>

        <div className="mt-3">
          <VenueAmenityList amenities={venue.amenities} amenityNotes={venue.amenityNotes} limit={4} />
        </div>

        <div className="mt-4 flex items-center justify-end border-t border-line pt-3 text-right text-xs font-medium text-ink-soft">
          <span>
            Up to {venue.maxCapacity} guests · {venue.minBookingHours} hr minimum ·{" "}
            <span className="font-semibold text-ink">
              {formatPriceRange(venue.minHourlyRate, venue.maxHourlyRate)}
            </span>
          </span>
        </div>

        {eventsHosted !== null && (
          <p className="mt-2 text-xs text-ink-soft">
            <span className="font-semibold text-ink">{eventsHosted}</span> events hosted here
          </p>
        )}
      </div>

      <Link
        href={prefillQuery ? `/spaces/${venue.slug}?${prefillQuery}` : `/spaces/${venue.slug}`}
        className="absolute inset-0"
        aria-label={`View ${venue.name}`}
      />
    </article>
  );
}
