"use client";

import Link from "next/link";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";
import type { Venue } from "@/lib/types/spaces";

function formatLiveSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The venue owner's listings at a glance — the venue-side mirror of
 * VendorProfileSummary. Visibility hides a listing from Discover Spaces;
 * the owner keeps full access to edit it either way.
 */
export default function VenueProfileSummary({
  venues,
  onToggleVisibility,
}: {
  venues: Venue[];
  onToggleVisibility: (venue: Venue) => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          {venues.length === 1 ? "Your venue" : "Your venues"}
        </h2>
        <Link
          href="/dashboard/venue"
          className="text-xs font-semibold text-brass-dark transition-colors hover:underline"
        >
          Manage bookings →
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {venues.map((venue) => {
          const isPublic = !venue.listingHidden;
          return (
            <li key={venue.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-3">
              <Link href={`/spaces/${venue.slug}?from=dashboard`} className="shrink-0">
                <VenueImagePlaceholder
                  accent={venue.visualAccent}
                  icon={venue.icon}
                  imageCount={0}
                  photoUrl={venue.photos?.[0]}
                  className="h-16 w-20 rounded-lg"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/spaces/${venue.slug}?from=dashboard`} className="font-display text-base font-semibold text-ink hover:underline">
                  {venue.name}
                </Link>
                <p className="truncate text-xs text-ink-soft">
                  {venue.neighborhood}, {venue.city}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isPublic ? "bg-brass/15 text-brass-dark" : "bg-paper-dim text-ink-soft"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? "bg-brass-dark" : "bg-ink-soft"}`} />
                  {isPublic ? `Public · live since ${formatLiveSince(venue.publishedAt ?? venue.createdAt)}` : "Private"}
                </span>
              </div>

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/dashboard/venue/listings/${venue.id}`}
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(venue)}
                  className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                >
                  {isPublic ? "Make private" : "Make public"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
