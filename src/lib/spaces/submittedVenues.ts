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

function saveSubmittedVenues(venues: Venue[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SUBMITTED_VENUES_KEY, JSON.stringify(venues));
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
