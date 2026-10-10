import type { StatusDescriptor } from "@/lib/ui/statusTone";

/**
 * The short list of things actually waiting on the person reading the page.
 *
 * Every role's dashboard opened on a summary of what exists — bookings, gigs,
 * listings — and none of them answered the question people actually arrive
 * with, which is "what do I have to do". That answer was spread across four
 * pages, so the common failure was simply not noticing a request for days.
 *
 * Deliberately capped and deliberately boring: it is a to-do list, not a feed.
 * Anything already settled belongs on the page it lives on, not here.
 *
 * Pure. Callers assemble the items from storage; this only orders and trims.
 */

export interface UpNextItem {
  id: string;
  /** What to do, imperative — "Answer a booking request". */
  title: string;
  /** Which thing it's about — "Rooftop party · Bayview Loft". */
  context: string;
  href: string;
  status: StatusDescriptor;
  /**
   * Lower sorts first. Callers use the bands below rather than raw numbers so
   * the ordering rationale lives in one place.
   */
  priority: number;
}

/**
 * Priority bands, in the order a person would want to be interrupted about
 * them. Someone else is blocked on the first two; the rest are the viewer's
 * own housekeeping.
 */
export const UP_NEXT_PRIORITY = {
  /** Another party is waiting on a yes/no that only this person can give. */
  blocking_someone: 10,
  /** Money or signature terms are open and addressed to this person. */
  terms: 20,
  /** A conversation is waiting on a reply. */
  reply: 30,
  /** The viewer's own next step, nobody blocked. */
  housekeeping: 40,
} as const;

export const UP_NEXT_LIMIT = 5;

/**
 * Sorted, trimmed, and de-duplicated by href.
 *
 * De-duping matters because the same action can be surfaced by two different
 * paths — an unanswered contract is both an open offer and an unread thread —
 * and listing it twice makes the strip look padded.
 */
export function selectUpNext(items: UpNextItem[], limit: number = UP_NEXT_LIMIT): UpNextItem[] {
  const seen = new Set<string>();
  const unique: UpNextItem[] = [];
  for (const item of items) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    unique.push(item);
  }

  return unique
    .sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.title.localeCompare(b.title)))
    .slice(0, limit);
}
