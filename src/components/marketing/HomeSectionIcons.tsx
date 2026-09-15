import { SHARED } from "./MarketplaceIcons";

/**
 * Line-art icons for the homepage's value-prop and vendor-category sections.
 * Same 64x64 grid and stroke config as the marketplace diagram (SHARED) so
 * every icon on the page reads as one set.
 *
 * Deliberately not emoji: the venue amenity lists use emoji (see
 * AMENITY_ICONS), but those are dense inline labels. At section-heading size
 * emoji render at wildly different weights and colors per platform, which is
 * what the diagram icons were drawn to avoid.
 */

type IconProps = { className?: string };

/* --- "One event, one place" ------------------------------------------- */

/** Magnifier over a map pin — searching a city for a place. */
export function DiscoverIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <circle cx="27" cy="27" r="16" />
      <path d="M38.5 38.5 52 52" />
      <path d="M27 34c4.5-4.6 6.8-8.2 6.8-11a6.8 6.8 0 0 0-13.6 0c0 2.8 2.3 6.4 6.8 11Z" />
      <circle cx="27" cy="23" r="2" />
    </svg>
  );
}

/** Two stacked bars of different length — offers lined up against each other. */
export function CompareIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <rect x="8" y="12" width="48" height="40" rx="5" />
      <path d="M17 24h20" />
      <path d="M17 32h30" />
      <path d="M17 40h13" />
    </svg>
  );
}

/** Two overlapping speech bubbles — a conversation with two sides. */
export function CommunicateIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <path d="M40 34H20l-9 8V16a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4Z" />
      <path d="M40 22h9a4 4 0 0 1 4 4v22l-8-7H28a4 4 0 0 1-4-4v-3" />
    </svg>
  );
}

/** A chart line climbing across axes — progress you can see. */
export function TrackIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <path d="M12 10v40a4 4 0 0 0 4 4h36" />
      <path d="M21 42l11-12 8 7 12-16" />
      <path d="M52 21h-7M52 21v7" />
    </svg>
  );
}

/* --- Popular vendor categories ---------------------------------------- */

/** Turntable platter and tonearm. */
export function DjIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <rect x="8" y="14" width="48" height="36" rx="5" />
      <circle cx="27" cy="32" r="11" />
      <circle cx="27" cy="32" r="2.5" />
      <path d="M46 22v13" />
    </svg>
  );
}

/** Camera body with a lens. */
export function PhotographerIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <path d="M8 22a4 4 0 0 1 4-4h7l4-6h18l4 6h7a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" />
      <circle cx="32" cy="33" r="10" />
    </svg>
  );
}

/** A bloom on a stem with two leaves. */
export function FloristIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <circle cx="32" cy="20" r="6" />
      <path d="M32 26c-4 4-6 8-6 12a6 6 0 0 0 12 0c0-4-2-8-6-12Z" />
      <path d="M32 44v12" />
      <path d="M32 48c-6 0-10-3-11-8 6-1 10 2 11 8Zm0 0c6 0 10-3 11-8-6-1-10 2-11 8Z" />
    </svg>
  );
}

/** Cloche over a plate. */
export function ChefIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <path d="M11 40a21 21 0 0 1 42 0Z" />
      <path d="M7 47h50" />
      <path d="M32 19v-5" />
      <circle cx="32" cy="12" r="2.5" />
    </svg>
  );
}

/** Booth with a curtain and a strip of prints. */
export function PhotoBoothIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <rect x="10" y="9" width="44" height="46" rx="5" />
      <path d="M10 21h44" />
      <rect x="19" y="29" width="16" height="18" rx="2" />
      <path d="M42 29v18" />
      <path d="M39 33h6M39 39h6" />
    </svg>
  );
}

/** Cine camera with a lens barrel. */
export function VideographerIcon({ className = "" }: IconProps) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <rect x="8" y="20" width="32" height="24" rx="4" />
      <path d="M40 30l14-7v18l-14-7Z" />
      <path d="M17 27v10" />
    </svg>
  );
}
