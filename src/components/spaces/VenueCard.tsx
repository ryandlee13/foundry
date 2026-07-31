"use client";

import { useState } from "react";
import Link from "next/link";
import { BADGE_LABELS, SPACE_TYPE_LABELS } from "@/lib/spaces/labels";
import { formatDistanceMiles } from "@/lib/spaces/distance";
import VenueAmenityList from "./VenueAmenityList";
import VenueImagePlaceholder from "./VenueImagePlaceholder";
import type { VenueWithDistance } from "@/lib/types/spaces";

function formatPriceRange(min: number, max: number): string {
  return min === max ? `$${min}/hr` : `$${min}–$${max}/hr`;
}

export default function VenueCard({ venue }: { venue: VenueWithDistance }) {
  const [saved, setSaved] = useState(false);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-lg">
      <div className="relative">
        <VenueImagePlaceholder
          accent={venue.visualAccent}
          icon={venue.icon}
          imageCount={venue.images.length}
          photoUrl={venue.photos?.[0]}
          className="aspect-[4/3] w-full"
        >
          {venue.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
              {BADGE_LABELS[venue.badge]}
            </span>
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
      </div>

      <Link href={`/spaces/${venue.slug}`} className="absolute inset-0" aria-label={`View ${venue.name}`} />
    </article>
  );
}
