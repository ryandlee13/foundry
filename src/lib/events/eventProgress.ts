import type { Booking } from "@/lib/types/spaces";

/**
 * Where an event stands, as six steps.
 *
 * A planner had no single view of this. The booking's status lived on one page,
 * vendor confirmations on another, the contract inside a conversation, and
 * whether a review was owed nowhere at all — so "is this event actually ready"
 * could only be answered by visiting four screens and holding the result in
 * your head.
 *
 * Every step is DERIVED from data that already exists. No new stored fields, no
 * `progress` column to fall out of sync with reality — if the booking is
 * confirmed and two vendors have confirmed, the stepper says so because that is
 * what the records say, not because something wrote a stage number down.
 *
 * Pure: no storage, no `window`, no clock. `todayIso` is passed in.
 */

export type EventStepKey = "venue" | "vendors" | "terms" | "contract" | "event_day" | "reviews";

export type StepState =
  /** Settled. Nothing more to do here. */
  | "done"
  /** The step the event is actually sitting on right now. At most one. */
  | "current"
  /** Not reached yet. */
  | "upcoming"
  /**
   * Genuinely optional and not taken. Only the contract step uses this:
   * contracts are optional in the booking flow, so a signed one is a milestone
   * but an unsent one is not a gap — rendering it as incomplete forever would
   * make every event look unfinished.
   */
  | "skipped";

export interface ProgressStep {
  key: EventStepKey;
  label: string;
  state: StepState;
  /** One short line of what's true right now — "2 confirmed, 1 awaiting". */
  detail: string;
}

export interface EventProgress {
  steps: ProgressStep[];
  /** Steps in a `done` state, for the "3 of 6" summary. */
  completedCount: number;
  /** Counts the contract only when it was actually part of this booking. */
  applicableCount: number;
  /** The step the event is sitting on, or null once everything is settled. */
  currentStep: ProgressStep | null;
}

export interface EventProgressInput {
  /** Null for the vendor-lobby bucket: vendors hired before there was a venue. */
  booking: Pick<Booking, "status" | "eventDate"> | null;
  /** Vendor requests posted for this event. */
  needCount: number;
  confirmedVendorCount: number;
  /** Engagements still waiting on the vendor to accept the terms they were sent. */
  awaitingVendorCount: number;
  /** An offer from the venue the planner hasn't answered. */
  openVenueOfferCount: number;
  /** A contract was sent, whatever its current state. */
  contractSent: boolean;
  contractSigned: boolean;
  /** Completed engagements this planner could review. */
  reviewableCount: number;
  reviewedCount: number;
  todayIso: string;
}

function pluralVendors(count: number): string {
  return `${count} vendor${count === 1 ? "" : "s"}`;
}

/**
 * Builds the six steps with only `done` / `upcoming` decided, then marks the
 * first unfinished one `current` in a second pass — which is what guarantees at
 * most one `current` even when several steps are incomplete.
 */
export function computeEventProgress(input: EventProgressInput): EventProgress {
  const {
    booking,
    needCount,
    confirmedVendorCount,
    awaitingVendorCount,
    openVenueOfferCount,
    contractSent,
    contractSigned,
    reviewableCount,
    reviewedCount,
    todayIso,
  } = input;

  const venueConfirmed = booking?.status === "confirmed";
  const eventPassed = Boolean(booking && booking.eventDate < todayIso);

  const venue: ProgressStep = {
    key: "venue",
    label: "Venue",
    state: venueConfirmed ? "done" : "upcoming",
    detail: !booking
      ? "No venue yet — these vendors aren't attached to an event."
      : booking.status === "confirmed"
        ? "Booked and confirmed."
        : booking.status === "declined"
          ? "The host declined this request."
          : "Waiting on the host to accept.",
  };

  const vendors: ProgressStep = {
    key: "vendors",
    label: "Vendors",
    state: confirmedVendorCount > 0 ? "done" : "upcoming",
    detail:
      confirmedVendorCount > 0
        ? awaitingVendorCount > 0
          ? `${pluralVendors(confirmedVendorCount)} confirmed, ${awaitingVendorCount} still to answer.`
          : `${pluralVendors(confirmedVendorCount)} confirmed.`
        : awaitingVendorCount > 0
          ? `${awaitingVendorCount} sent terms, waiting on their answer.`
          : needCount > 0
            ? `${needCount} request${needCount === 1 ? "" : "s"} posted, nobody hired yet.`
            : "No vendor requests posted yet.",
  };

  /*
   * "Terms" is about loose ends, not paperwork: an offer the planner hasn't
   * answered, or a vendor who hasn't answered theirs. It can only be done once
   * somebody has actually been hired — with no vendors there are no terms to
   * have agreed, and calling that settled would be flattering.
   */
  const nothingOutstanding = openVenueOfferCount === 0 && awaitingVendorCount === 0;
  const terms: ProgressStep = {
    key: "terms",
    label: "Terms agreed",
    state: venueConfirmed && confirmedVendorCount > 0 && nothingOutstanding ? "done" : "upcoming",
    detail:
      openVenueOfferCount > 0
        ? "The venue sent terms you haven't answered."
        : awaitingVendorCount > 0
          ? `${awaitingVendorCount} vendor${awaitingVendorCount === 1 ? "" : "s"} still to confirm terms.`
          : confirmedVendorCount > 0 && venueConfirmed
            ? "Everything agreed with the venue and your vendors."
            : "Nothing outstanding yet.",
  };

  /*
   * Optional on purpose. Contracts aren't required to settle a booking — the
   * venue privacy gate keys on confirmation, not on a signature, precisely
   * because plenty of hosts never send one. So an unsent contract past the
   * event is `skipped`, not an unfinished step that makes a completed event
   * read as incomplete forever.
   */
  const contract: ProgressStep = {
    key: "contract",
    label: "Contract signed",
    state: contractSigned ? "done" : contractSent ? "upcoming" : eventPassed ? "skipped" : "skipped",
    detail: contractSigned
      ? "Signed by both sides."
      : contractSent
        ? "Sent — waiting on your signature."
        : "Optional. Your host hasn't sent one.",
  };

  const eventDay: ProgressStep = {
    key: "event_day",
    label: "Event day",
    state: eventPassed ? "done" : "upcoming",
    detail: !booking
      ? "No date yet."
      : eventPassed
        ? "This event has happened."
        : "Still ahead.",
  };

  const reviews: ProgressStep = {
    key: "reviews",
    label: "Reviews",
    state: reviewableCount > 0 && reviewedCount >= reviewableCount ? "done" : "upcoming",
    detail:
      reviewableCount === 0
        ? "Once a vendor marks their work complete, you can review them."
        : reviewedCount >= reviewableCount
          ? "All reviews left."
          : `${reviewableCount - reviewedCount} vendor${reviewableCount - reviewedCount === 1 ? "" : "s"} waiting on a review.`,
  };

  const steps = [venue, vendors, terms, contract, eventDay, reviews];

  /*
   * Second pass. The first step that isn't finished is where the event
   * actually sits — `skipped` counts as settled for this purpose, or an event
   * whose host never sent a contract would park on that step forever.
   */
  const currentIndex = steps.findIndex((step) => step.state === "upcoming");
  if (currentIndex !== -1) steps[currentIndex] = { ...steps[currentIndex], state: "current" };

  const applicableCount = steps.filter((step) => step.state !== "skipped").length;

  return {
    steps,
    completedCount: steps.filter((step) => step.state === "done").length,
    applicableCount,
    currentStep: currentIndex === -1 ? null : steps[currentIndex],
  };
}
