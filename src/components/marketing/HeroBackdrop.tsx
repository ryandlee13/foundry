import { VENUES } from "@/lib/spaces/venues";

/**
 * A tiled backdrop of real listings behind the hero headline.
 *
 * NOTE: there is no photography in this repo — seed venues are represented
 * everywhere by a two-color `visualAccent` gradient plus an emoji icon (see
 * VenueImagePlaceholder), deliberately, so no fictional listing is ever shown
 * with a real place's photo. This reuses that same visual language rather
 * than shipping stock imagery that would imply venues we don't have. Swap the
 * tiles for real cover photos once listings actually carry them.
 */
const TILE_COUNT = 12;

export default function HeroBackdrop() {
  const tiles = VENUES.slice(0, TILE_COUNT);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="grid h-full w-full grid-cols-3 gap-2 p-2 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((venue, index) => (
          <div
            key={venue.id}
            className="relative flex items-center justify-center overflow-hidden rounded-2xl"
            style={{
              background: `linear-gradient(150deg, ${venue.visualAccent[0]}, ${venue.visualAccent[1]})`,
              // Staggered so the grid reads as a collage rather than a flat block.
              opacity: 0.32 + (index % 3) * 0.08,
            }}
          >
            <span className="text-3xl opacity-70 sm:text-4xl">{venue.icon}</span>
          </div>
        ))}
      </div>

      {/* Scrim: keeps the headline readable over the tiles at every breakpoint. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 92%, transparent) 42%, color-mix(in srgb, var(--color-paper) 70%, transparent) 100%)",
        }}
      />
    </div>
  );
}
