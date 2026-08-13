import type { Venue } from "@/lib/types/spaces";
import { VENUES } from "./venues";

/**
 * Browser-local venue listings submitted through /list-your-venue. Same
 * "prototype, not a real backend" caveat as src/lib/auth/storage.ts — these
 * only exist in the browser that submitted them, and immediately go live
 * with no admin review (see the scoped exception noted in CLAUDE.md).
 *
 * Adopted seed venues (see adoptSeedVenues() below) are stored here too, as
 * literal copies of the seed record with the same id/slug — a submitted
 * entry always supersedes a seed entry sharing its id (selectVisibleSeedVenues),
 * so there is never a duplicate listing once a seed venue has been adopted.
 */
const SUBMITTED_VENUES_KEY = "foundry.venues.submitted";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getSubmittedVenues(): Venue[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SUBMITTED_VENUES_KEY);
    return raw ? (JSON.parse(raw) as Venue[]) : [];
  } catch {
    return [];
  }
}

/** Thrown when the browser's localStorage quota won't fit the venue being saved. */
export class VenueStorageQuotaError extends Error {
  constructor() {
    super(
      "Your browser's storage is full for this prototype (listings and photos are saved right in your browser, with no server yet). Try removing a few photos from this listing, or delete an older draft, then submit again."
    );
    this.name = "VenueStorageQuotaError";
  }
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

function saveSubmittedVenues(venues: Venue[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SUBMITTED_VENUES_KEY, JSON.stringify(venues));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new VenueStorageQuotaError();
    }
    throw error;
  }
}

export function addSubmittedVenue(venue: Venue): void {
  saveSubmittedVenues([...getSubmittedVenues(), venue]);
}

/**
 * Pure: seed venues that haven't been superseded by a submitted copy sharing
 * the same id. This is the mechanism behind adopted seed venues — adopting
 * one copies it into submitted-venue storage under a real owner, and from
 * then on the submitted copy (editable, owned) is what renders instead of
 * the static seed entry, without ever duplicating the listing.
 */
export function selectVisibleSeedVenues(seedVenues: Venue[], submittedVenues: Venue[]): Venue[] {
  const submittedIds = new Set(submittedVenues.map((venue) => venue.id));
  return seedVenues.filter((venue) => !submittedIds.has(venue.id));
}

/** Seed venues (minus any adopted/superseded ones) plus anything submitted in this browser. */
export function getAllVenues(): Venue[] {
  const submitted = getSubmittedVenues();
  return [...selectVisibleSeedVenues(VENUES, submitted), ...submitted];
}

/** Pure: drops listings their owner has switched to private. */
export function selectPubliclyVisible(venues: Venue[]): Venue[] {
  return venues.filter((venue) => !venue.listingHidden);
}

/**
 * What Discover Spaces shows. Owner-facing views deliberately use
 * getAllVenues()/getVenuesOwnedBy() instead, so an owner can still see and
 * edit a listing they've made private.
 */
export function getPubliclyVisibleVenues(): Venue[] {
  return selectPubliclyVisible(getAllVenues());
}

/** Owner-controlled listing visibility. Returns undefined for a seed venue nobody owns. */
export function setVenueVisibility(id: string, listingHidden: boolean): Venue | undefined {
  return updateSubmittedVenue(id, { listingHidden });
}

export function getAllSlugs(): string[] {
  return getAllVenues().map((venue) => venue.slug);
}

export function getVenuesOwnedBy(ownerId: string): Venue[] {
  return getSubmittedVenues().filter((venue) => venue.ownerId === ownerId);
}

export function getVenueBySlugAnywhere(slug: string): Venue | undefined {
  return getAllVenues().find((venue) => venue.slug === slug);
}

export function getVenueById(id: string): Venue | undefined {
  return getAllVenues().find((venue) => venue.id === id);
}

/**
 * Never touches id/slug/ownerId — a venue's URL and ownership are immutable
 * after publish (see CLAUDE.md). Throws VenueStorageQuotaError under the same
 * conditions as addSubmittedVenue (re-saving up to 20 photo data URLs can
 * overflow the quota just as easily as a fresh submission).
 */
export function updateSubmittedVenue(id: string, patch: Partial<Omit<Venue, "id" | "slug" | "ownerId">>): Venue | undefined {
  const venues = getSubmittedVenues();
  const index = venues.findIndex((venue) => venue.id === id);
  if (index === -1) return undefined;

  const updated: Venue = {
    ...venues[index],
    ...patch,
    id: venues[index].id,
    slug: venues[index].slug,
    ownerId: venues[index].ownerId,
    updatedAt: new Date().toISOString(),
  };
  const next = [...venues];
  next[index] = updated;
  saveSubmittedVenues(next);
  return updated;
}

/**
 * DEV ONLY (called exclusively from the seed-venue-owner dev seeder). Copies
 * the given seed venues into submitted-venue storage under `ownerId`,
 * preserving id/slug/content so every existing lookup (Booking.venueSlug,
 * /spaces/{slug} links, getVenueBySlugAnywhere) keeps working unchanged.
 * Idempotent per venue id — already-adopted venues are left untouched.
 */
export function adoptSeedVenues(ownerId: string, seedVenueIds: string[], publishedAt: string): Venue[] {
  const submitted = getSubmittedVenues();
  const alreadyAdoptedIds = new Set(submitted.map((venue) => venue.id));
  const toAdopt = VENUES.filter((venue) => seedVenueIds.includes(venue.id) && !alreadyAdoptedIds.has(venue.id));
  if (toAdopt.length === 0) {
    return submitted.filter((venue) => seedVenueIds.includes(venue.id));
  }

  const adopted = toAdopt.map((seed) => ({ ...seed, ownerId, publishedAt }));
  saveSubmittedVenues([...submitted, ...adopted]);
  return adopted;
}
