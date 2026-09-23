import { SF_LOCATIONS } from "./locations";
import type { Booking, Venue } from "@/lib/types/spaces";

/**
 * Who is allowed to see a venue's real identity, and when.
 *
 * Two things about a listing are private until a deal is done:
 *  - `Venue.realName` — the operating name. The public listing carries a
 *    descriptive title instead, so a planner can't search the name, find the
 *    venue's own site, and book around Foundry.
 *  - `Venue.exactAddress` — the street address. The public listing shows only
 *    the district (docs/SECURITY.md #5).
 *
 * Both unlock together, for the planner on a *confirmed* booking. Confirmation
 * is the trigger because it's the first point at which the host has actually
 * agreed to host this person — before that, a listing view is just a search
 * result and there's nothing to disclose against.
 *
 * Pure: takes the viewer's bookings as an argument rather than reading storage,
 * so the rule is unit-testable and there is exactly one place to audit. No
 * component may read `realName` or `exactAddress` off a Venue directly.
 */

export interface VenueDisclosure {
  /** The operating name, or null when the viewer hasn't earned it. */
  realName: string | null;
  /** The street address, or null. */
  exactAddress: string | null;
  /** Why the viewer can (or can't) see the above — drives the explanatory copy. */
  reason: "owner" | "confirmed_booking" | "withheld";
}

const WITHHELD: VenueDisclosure = { realName: null, exactAddress: null, reason: "withheld" };

type DisclosureVenue = Pick<Venue, "id" | "name" | "exactAddress" | "ownerId"> & Pick<Venue, "realName">;
type DisclosureBooking = Pick<Booking, "organizerId" | "venueId" | "status">;

export function resolveVenueDisclosure(input: {
  venue: DisclosureVenue;
  /** Null for a signed-out visitor. */
  viewerId: string | null;
  /** The viewer's own bookings. Bookings belonging to anyone else are ignored, not trusted. */
  viewerBookings: DisclosureBooking[];
}): VenueDisclosure {
  const { venue, viewerId, viewerBookings } = input;
  if (!viewerId) return WITHHELD;

  const disclosed: Omit<VenueDisclosure, "reason"> = {
    // Listings that predate this field have no separate real name; the public
    // title is all there is, so there's nothing extra to reveal.
    realName: venue.realName?.trim() || null,
    exactAddress: venue.exactAddress,
  };

  if (venue.ownerId !== null && venue.ownerId === viewerId) {
    return { ...disclosed, reason: "owner" };
  }

  const hasConfirmedBooking = viewerBookings.some(
    (booking) =>
      booking.organizerId === viewerId && booking.venueId === venue.id && booking.status === "confirmed"
  );
  if (hasConfirmedBooking) {
    return { ...disclosed, reason: "confirmed_booking" };
  }

  return WITHHELD;
}

/** Copy for the public listing, explaining what's held back and what unlocks it. */
export const VENUE_PRIVACY_NOTICE =
  "This host lists their space by description. The venue's name and exact address are shared with you as soon as your booking is confirmed.";

/**
 * Normalizes for comparison: lowercase, punctuation stripped, whitespace
 * collapsed. "The Green Room, LLC" and "the green room llc" compare equal.
 */
function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words too generic to count as a leak on their own — a title is *expected* to say "loft" or "bar". */
const GENERIC_WORDS = [
  "the", "a", "an", "and", "of", "at", "on", "in", "co", "company", "llc", "inc", "sf",
  "san", "francisco", "venue", "space", "spaces", "room", "rooms", "hall", "studio",
  "studios", "bar", "club", "lounge", "loft", "gallery", "house", "kitchen", "cafe",
  "restaurant", "rooftop", "garden", "center", "centre",
];

/**
 * Neighborhood words, from the same catalog Discover Spaces searches. A title
 * is *supposed* to say where the space is, so "The Mission Loft" listed as
 * "Bright loft in the Mission" must not read as a leak — without this, every
 * venue named after its own neighborhood is unlistable.
 */
const PLACE_WORDS = SF_LOCATIONS.flatMap((location) => normalizeForMatch(location.label).split(" ")).filter(
  (word) => word.length > 2
);

const GENERIC_NAME_WORDS = new Set([...GENERIC_WORDS, ...PLACE_WORDS]);

/**
 * Pure: does this public title give away the operating name?
 *
 * The point of the descriptive title is that searching it shouldn't surface the
 * venue, so a title containing the real name defeats the whole mechanism. Two
 * ways it can leak, both caught here: the full name appearing verbatim, or
 * every distinctive word of the name appearing somewhere in the title.
 *
 * Generic words are ignored on purpose — blocking "loft" because the venue is
 * called "The Mission Loft" would make the field impossible to fill in, and a
 * validator people route around protects nothing.
 */
export function publicTitleLeaksRealName(publicTitle: string, realName: string): boolean {
  const title = normalizeForMatch(publicTitle);
  const real = normalizeForMatch(realName);
  if (!title || !real) return false;

  if (title.includes(real)) return true;

  const distinctive = real.split(" ").filter((word) => word.length > 2 && !GENERIC_NAME_WORDS.has(word));
  if (distinctive.length === 0) return false;

  const titleWords = new Set(title.split(" "));
  return distinctive.every((word) => titleWords.has(word));
}
