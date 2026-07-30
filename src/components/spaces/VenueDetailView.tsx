import { SPACE_TYPE_LABELS, EVENT_TYPE_LABELS, RULE_LABELS } from "@/lib/spaces/labels";
import VenueAmenityList from "@/components/spaces/VenueAmenityList";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";
import VenueHostLine from "@/components/spaces/VenueHostLine";
import VenueReviews from "@/components/spaces/VenueReviews";
import BookingPanel from "@/components/spaces/BookingPanel";
import type { Venue } from "@/lib/types/spaces";

export default function VenueDetailView({ venue }: { venue: Venue }) {
  const allowedRules = (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[]).filter(
    (key) => venue.rules[key]
  );

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <VenueImagePlaceholder
          accent={venue.visualAccent}
          icon={venue.icon}
          imageCount={venue.images.length}
          photoUrl={venue.photos?.[0]}
          className="aspect-[16/10] rounded-2xl sm:col-span-3 sm:row-span-2 sm:aspect-auto"
        />
        {venue.images.slice(1, 3).map((image, index) => (
          <VenueImagePlaceholder
            key={image + index}
            accent={venue.visualAccent}
            icon={venue.icon}
            imageCount={venue.images.length}
            currentIndex={index + 2}
            photoUrl={venue.photos?.[index + 1]}
            className="hidden aspect-square rounded-2xl sm:flex"
          />
        ))}
      </div>

      {venue.videoNames && venue.videoNames.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          🎥 Video walkthrough included
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {venue.badge && (
            <span className="inline-block rounded-full bg-paper-dim px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
              {venue.badge === "new" ? "New" : venue.badge === "popular" ? "Popular" : "Great for nightlife"}
            </span>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {venue.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {venue.neighborhood}, {venue.city} · {SPACE_TYPE_LABELS[venue.spaceType]}
          </p>
          <VenueHostLine ownerId={venue.ownerId} />
          <p className="mt-4 text-base leading-relaxed text-ink-soft">{venue.description}</p>

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">Good for</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {venue.eventTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft"
                >
                  {EVENT_TYPE_LABELS[type]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">Amenities Included</h2>
            <div className="mt-3">
              <VenueAmenityList amenities={venue.amenities} />
            </div>
          </div>

          {allowedRules.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Venue rules</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {allowedRules.map((key) => (
                  <li key={key}>{RULE_LABELS[key]}</li>
                ))}
              </ul>
            </div>
          )}

          {venue.availabilityExamples.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">
                Typical availability
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {venue.availabilityExamples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </div>
          )}

          {venue.ownerId === null && <VenueReviews venueId={venue.id} />}
        </div>

        <aside className="lg:col-span-1">
          <BookingPanel venue={venue} />
        </aside>
      </div>
    </>
  );
}
