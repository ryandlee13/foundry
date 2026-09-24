import type { EngagementStatus, EventNeed, EventNeedStatus, VendorEngagement } from "@/lib/types/vendors";

/**
 * Where an event's vendor hiring actually stands, in one line.
 *
 * The organizer's booking list showed a booking's own status and nothing else,
 * so "is anyone coming to DJ this?" meant opening the event. This is the
 * answer, computed from the needs and engagements already loaded.
 *
 * Pure — takes its inputs as arguments so the rule is testable without a
 * browser, per the vendor-layer convention.
 */

/** Requests still capable of receiving bids. `filled`/`closed`/`canceled` are done with. */
const OPEN_NEED_STATUSES: EventNeedStatus[] = ["draft", "published", "paused"];

/** A vendor who is actually on the job (or has finished it). */
const CONFIRMED_ENGAGEMENT_STATUSES: EngagementStatus[] = ["confirmed", "in_progress", "completed"];

export interface EventVendorSummary {
  requestCount: number;
  openRequestCount: number;
  confirmedCount: number;
  /** Finalized by the organizer, not yet accepted by the vendor. */
  awaitingVendorCount: number;
  /** One-line status for the collapsed row. */
  headline: string;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function summarizeEventVendors(input: {
  needs: Pick<EventNeed, "status">[];
  engagements: Pick<VendorEngagement, "status">[];
}): EventVendorSummary {
  const requestCount = input.needs.length;
  const openRequestCount = input.needs.filter((need) => OPEN_NEED_STATUSES.includes(need.status)).length;
  const confirmedCount = input.engagements.filter((engagement) =>
    CONFIRMED_ENGAGEMENT_STATUSES.includes(engagement.status)
  ).length;
  const awaitingVendorCount = input.engagements.filter(
    (engagement) => engagement.status === "pending_vendor_confirmation"
  ).length;

  const parts: string[] = [];
  if (confirmedCount > 0) parts.push(`${plural(confirmedCount, "vendor")} confirmed`);
  if (awaitingVendorCount > 0) parts.push(`${awaitingVendorCount} awaiting confirmation`);
  if (openRequestCount > 0) parts.push(`${plural(openRequestCount, "open request")}`);

  // Distinguishes "you haven't asked anyone" from "you asked and everything has
  // since closed" — the same empty-looking row, two very different situations.
  const headline =
    parts.length > 0
      ? parts.join(" · ")
      : requestCount > 0
        ? "No vendors booked — all requests closed"
        : "No vendor requests yet";

  return { requestCount, openRequestCount, confirmedCount, awaitingVendorCount, headline };
}
