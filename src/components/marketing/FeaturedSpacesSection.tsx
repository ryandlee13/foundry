import Link from "next/link";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";
import { getFeaturedVenues } from "@/lib/spaces/featured";

function formatPriceRange(min: number, max: number): string {
  return min === max ? `$${min}/hr` : `$${min}–$${max}/hr`;
}

/**
 * A slice of real Discover Spaces inventory on the homepage, so the site
 * reads as a marketplace with rooms in it rather than a landing page.
 *
 * Cards are a compact cousin of VenueCard rather than VenueCard itself: that
 * one needs a VenueWithDistance and carries a save button and amenity list,
 * none of which mean anything outside a search result. Card chrome, radii,
 * and type scale are copied from it verbatim so the two read as the same
 * component family.
 *
 * Imagery comes from VenueImagePlaceholder, exactly as /spaces does — these
 * are fictional listings, and dressing them in real photographs of real San
 * Francisco rooms would misrepresent actual businesses.
 */
export default function FeaturedSpacesSection() {
  const featured = getFeaturedVenues();

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              Featured spaces
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Rooftops, lofts, galleries, and late-night rooms across San Francisco.
            </p>
          </div>
          <Link
            href="/spaces"
            className="rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Browse all spaces
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(({ venue, category }) => (
            <article
              key={venue.slug}
              className="group relative overflow-hidden rounded-2xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-lg"
            >
              <VenueImagePlaceholder
                accent={venue.visualAccent}
                icon={venue.icon}
                // Passing 1 suppresses the "1 / 5" counter, which is a
                // search-result affordance and reads as noise here.
                imageCount={1}
                className="aspect-[4/3] w-full"
              >
                <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur-sm">
                  {category}
                </span>
              </VenueImagePlaceholder>

              <div className="p-4">
                <h3 className="truncate font-display text-lg font-semibold text-ink">
                  {venue.name}
                </h3>
                <p className="text-xs text-ink-soft">
                  {venue.neighborhood}, {venue.city}
                </p>

                <p className="mt-2 line-clamp-2 text-sm leading-snug text-ink-soft">
                  {venue.tagline}
                </p>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-xs font-medium text-ink-soft">
                  <span>Up to {venue.maxCapacity} guests</span>
                  <span className="font-semibold text-ink">
                    {formatPriceRange(venue.minHourlyRate, venue.maxHourlyRate)}
                  </span>
                </div>
              </div>

              <Link
                href={`/spaces/${venue.slug}`}
                className="absolute inset-0"
                aria-label={`View ${venue.name}`}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
