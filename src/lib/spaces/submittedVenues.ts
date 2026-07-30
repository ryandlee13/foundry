import type { Venue } from "@/lib/types/spaces";
import { VENUES } from "./venues";

/**
 * Browser-local venue listings submitted through /list-your-venue. Same
 * "prototype, not a real backend" caveat as src/lib/auth/storage.ts — these
 * only exist in the browser that submitted them, and immediately go live
 * with no admin review (see the scoped exception noted in CLAUDE.md).
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

/** Seed venues plus anything submitted in this browser. */
export function getAllVenues(): Venue[] {
  return [...VENUES, ...getSubmittedVenues()];
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
