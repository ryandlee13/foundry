import { getBookingById, getBookingVenueOwnerId, formatEventLabel } from "./bookings";
import { getVenueBySlugAnywhere } from "./submittedVenues";
import {
  addEventThreadParticipants,
  getEventThreadForBooking,
  getOrCreateEventThread,
} from "@/lib/vendors/messages";
import { createNotification } from "@/lib/vendors/notifications";
import {
  getEngagementById,
  getEngagementsForBooking,
  setEngagementBooking,
} from "@/lib/vendors/engagements";
import { updateEventNeed } from "@/lib/vendors/eventNeeds";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import type { Booking } from "@/lib/types/spaces";
import type { EventMessageThread, EngagementStatus, VendorEngagement } from "@/lib/types/vendors";

/**
 * The three-way event room: planner + venue operator + every confirmed vendor,
 * in one conversation about one event.
 *
 * Why it exists: once a planner has booked a space and hired a DJ, the next
 * thing that has to happen is load-in time, power, and who gets there when —
 * and with only 1:1 threads the planner relays that by hand or starts a group
 * text. Either way the coordination leaves Foundry and doesn't come back.
 *
 * When it opens: **automatically, as soon as a vendor is confirmed on a
 * confirmed booking** — see ensureEventRoom(). It used to wait on the organizer
 * clicking "Open event room", which meant the vendor who needed to ask the
 * venue about load-in had no way to do it until the planner happened to notice.
 * The conditions haven't changed (confirmed booking, a venue with a host
 * account, at least one confirmed vendor); only the trigger has. This is at
 * explicit user direction and reverses the previous "organizer-created only"
 * invariant — see docs/SECURITY.md's "Chat unlock timing".
 *
 * There is no "open the event room" button any more — a panel offering to do
 * something that has already happened is just clutter. openEventRoom() survives
 * as the organizer-gated path used by assignEngagementToBooking(). Suppliers
 * still cannot create or join a room themselves: the automatic path is keyed
 * off the organizer's own hiring decision (they finalized the deal), not off
 * anything a vendor or venue can do alone.
 *
 * Same import-direction note as bookingWorkflow.ts: this lives under
 * src/lib/spaces (a booking is a spaces concept) and imports from
 * src/lib/vendors. bookings.ts itself stays vendor-free so the existing
 * vendors/seed.ts -> spaces/bookings.ts edge stays acyclic.
 */

/** The engagement statuses that mean a vendor is actually working this event. */
const ACTIVE_ENGAGEMENT_STATUSES: EngagementStatus[] = ["confirmed", "in_progress", "completed"];

/**
 * Pure: who belongs in the room, organizer excluded (they're the thread's
 * organizerId, not a participant entry). Deduped and order-stable so repeated
 * syncs don't churn the stored array.
 */
export function computeEventRoomParticipants(input: {
  venueOwnerId: string | null;
  vendorOwnerIds: string[];
  organizerId: string;
}): string[] {
  const candidates = [...(input.venueOwnerId ? [input.venueOwnerId] : []), ...input.vendorOwnerIds];
  return [...new Set(candidates)].filter((id) => id !== input.organizerId);
}

export type EventRoomBlockReason =
  | "not_organizer"
  | "booking_not_confirmed"
  | "no_venue_host"
  | "no_confirmed_vendor";

export interface EventRoomReadiness {
  ready: boolean;
  reason: EventRoomBlockReason | null;
}

/**
 * Pure: may this actor open the room for this booking yet?
 *
 * Requires a confirmed booking AND at least one confirmed vendor, because the
 * room's whole value is the three-way introduction — opening it with only a
 * venue in it duplicates the booking thread that already exists.
 *
 * A seed venue with no owner account (`venueOwnerId: null`) has nobody to
 * introduce, so it's blocked rather than silently opening a two-person room.
 */
export function evaluateEventRoomReadiness(input: {
  booking: Pick<Booking, "organizerId" | "status">;
  venueOwnerId: string | null;
  vendorOwnerIds: string[];
  actorAccountId: string;
}): EventRoomReadiness {
  if (input.booking.organizerId !== input.actorAccountId) return { ready: false, reason: "not_organizer" };
  if (input.booking.status !== "confirmed") return { ready: false, reason: "booking_not_confirmed" };
  if (!input.venueOwnerId) return { ready: false, reason: "no_venue_host" };
  if (input.vendorOwnerIds.length === 0) return { ready: false, reason: "no_confirmed_vendor" };
  return { ready: true, reason: null };
}

export const EVENT_ROOM_BLOCK_COPY: Record<EventRoomBlockReason, string> = {
  not_organizer: "Only the event organizer can open the event room.",
  booking_not_confirmed: "Open the event room once your venue confirms this booking.",
  no_venue_host: "This listing has no host account to bring into the room.",
  no_confirmed_vendor: "An event room opens once a vendor has confirmed for this event.",
};

/** Owner accounts of every vendor actively working this booking. Reads storage. */
export function getActiveVendorOwnerIdsForBooking(bookingId: string): string[] {
  return getEngagementsForBooking(bookingId)
    .filter((engagement) => ACTIVE_ENGAGEMENT_STATUSES.includes(engagement.status))
    .map((engagement) => getVendorProfileById(engagement.vendorProfileId)?.ownerId)
    .filter((ownerId): ownerId is string => Boolean(ownerId));
}

export interface OpenEventRoomResult {
  booking: Booking;
  thread: EventMessageThread;
  /** Participants added by this call — empty when the room already existed and nobody new had confirmed. */
  addedParticipantIds: string[];
}

/**
 * ORGANIZER-ONLY. Throws when the actor isn't the organizer, the booking isn't
 * confirmed, the venue has no host account, or no vendor has confirmed yet.
 *
 * Idempotent: called again it reuses the existing room and syncs in any vendor
 * who has confirmed since — which is exactly what a planner who hires a second
 * vendor a week later expects to happen.
 */
export function openEventRoom(bookingId: string, actorAccountId: string): OpenEventRoomResult {
  const booking = getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");

  const venueOwnerId = getBookingVenueOwnerId(booking);
  const vendorOwnerIds = getActiveVendorOwnerIdsForBooking(bookingId);
  const readiness = evaluateEventRoomReadiness({ booking, venueOwnerId, vendorOwnerIds, actorAccountId });
  if (!readiness.ready || !venueOwnerId) {
    // The `!venueOwnerId` half is unreachable — readiness already rejects a
    // listing with no host — but it's what proves the non-null to the compiler,
    // and an assertion here would be a worse trade than a redundant branch.
    throw new Error(EVENT_ROOM_BLOCK_COPY[readiness.reason ?? "no_venue_host"]);
  }

  return createOrSyncEventRoom(booking, venueOwnerId, vendorOwnerIds);
}

/**
 * The write half of opening a room, with no authorization in it — every caller
 * must have decided the actor is allowed first. Shared by openEventRoom() (the
 * organizer's explicit click) and ensureEventRoom() (the automatic path).
 */
function createOrSyncEventRoom(
  booking: Booking,
  venueOwnerId: string,
  vendorOwnerIds: string[]
): OpenEventRoomResult {
  const venue = getVenueBySlugAnywhere(booking.venueSlug);
  if (!venue) throw new Error("Venue not found.");

  const participantIds = computeEventRoomParticipants({
    venueOwnerId,
    vendorOwnerIds,
    organizerId: booking.organizerId,
  });

  const existing = getEventThreadForBooking(booking.id);
  if (existing) {
    const addedParticipantIds = addEventThreadParticipants(existing.id, participantIds);
    notifyParticipants(addedParticipantIds, existing.id, booking);
    // Re-read so the caller gets the grown participant list, not the stale one.
    return { booking, thread: getEventThreadForBooking(booking.id) ?? existing, addedParticipantIds };
  }

  const thread = getOrCreateEventThread({
    bookingId: booking.id,
    venueId: venue.id,
    organizerId: booking.organizerId,
    participantIds,
  });
  notifyParticipants(participantIds, thread.id, booking);

  return { booking, thread, addedParticipantIds: participantIds };
}

/**
 * Opens the room the moment it's possible, with no click and no actor.
 *
 * Non-throwing by design: callers pass bookings they haven't individually
 * vetted, and "this event has no confirmed vendor yet" or "this is a seed venue
 * with no host account" are ordinary states here, not errors. Returns null for
 * anything it can't open, and is idempotent — calling it repeatedly reuses the
 * existing room and syncs in whoever has confirmed since.
 *
 * Same "make sure it simply exists" pattern as ensureBookingConversation() in
 * bookingWorkflow.ts. Deliberately not called from confirmEngagementTerms():
 * engagements.ts (vendors) importing this module (spaces) would close a cycle,
 * since this module already imports engagements.ts. Call it from the surfaces
 * that load instead.
 */
export function ensureEventRoom(bookingId: string | null): EventMessageThread | null {
  if (!bookingId) return null;

  const booking = getBookingById(bookingId);
  if (!booking || booking.status !== "confirmed") return null;

  const venueOwnerId = getBookingVenueOwnerId(booking);
  if (!venueOwnerId) return null;

  const vendorOwnerIds = getActiveVendorOwnerIdsForBooking(bookingId);
  if (vendorOwnerIds.length === 0) return null;

  try {
    return createOrSyncEventRoom(booking, venueOwnerId, vendorOwnerIds).thread;
  } catch {
    return null;
  }
}

/** ensureEventRoom() for callers holding an engagement rather than a booking. */
export function ensureEventRoomForEngagement(engagementId: string): EventMessageThread | null {
  return ensureEventRoom(getEngagementById(engagementId)?.bookingId ?? null);
}

/**
 * Brings newly-confirmed vendors into an existing room. No-op when no room
 * exists — use ensureEventRoom() if one should be created.
 */
export function syncEventRoomParticipants(bookingId: string): string[] {
  const thread = getEventThreadForBooking(bookingId);
  if (!thread) return [];

  const booking = getBookingById(bookingId);
  if (!booking) return [];

  const participantIds = computeEventRoomParticipants({
    venueOwnerId: getBookingVenueOwnerId(booking),
    vendorOwnerIds: getActiveVendorOwnerIdsForBooking(bookingId),
    organizerId: booking.organizerId,
  });

  const added = addEventThreadParticipants(thread.id, participantIds);
  notifyParticipants(added, thread.id, booking);
  return added;
}

export type AssignmentBlockReason =
  | "not_organizer"
  | "already_assigned"
  | "engagement_not_active"
  | "booking_not_confirmed";

export interface AssignmentEligibility {
  ok: boolean;
  reason: AssignmentBlockReason | null;
}

export const ASSIGNMENT_BLOCK_COPY: Record<AssignmentBlockReason, string> = {
  not_organizer: "Only the organizer who hired this vendor can assign them to an event.",
  already_assigned: "This vendor is already assigned to an event.",
  engagement_not_active: "Only a confirmed vendor can be assigned to an event.",
  booking_not_confirmed: "Pick an event with a confirmed booking.",
};

/**
 * Pure: may this vendor be attached to this event?
 *
 * Assignment is one-way. Moving a vendor between events would silently change
 * who is in an event room they've already been talking in, and nothing asks
 * for that — so an engagement that already has a booking is refused rather
 * than reassigned.
 */
export function evaluateAssignment(input: {
  engagement: Pick<VendorEngagement, "organizerId" | "bookingId" | "status">;
  booking: Pick<Booking, "organizerId" | "status">;
  actorAccountId: string;
}): AssignmentEligibility {
  const { engagement, booking, actorAccountId } = input;
  if (engagement.organizerId !== actorAccountId || booking.organizerId !== actorAccountId) {
    return { ok: false, reason: "not_organizer" };
  }
  if (engagement.bookingId !== null) return { ok: false, reason: "already_assigned" };
  if (!ACTIVE_ENGAGEMENT_STATUSES.includes(engagement.status)) {
    return { ok: false, reason: "engagement_not_active" };
  }
  if (booking.status !== "confirmed") return { ok: false, reason: "booking_not_confirmed" };
  return { ok: true, reason: null };
}

/** Pure: the events a loose vendor could be attached to — the organizer's own confirmed bookings. */
export function selectAssignableBookings<T extends Pick<Booking, "organizerId" | "status">>(
  bookings: T[],
  organizerId: string
): T[] {
  return bookings.filter((booking) => booking.organizerId === organizerId && booking.status === "confirmed");
}

export interface AssignEngagementResult {
  engagement: VendorEngagement;
  booking: Booking;
  /** Null when the event isn't eligible for a room yet (e.g. a seed venue with no host account). */
  thread: EventMessageThread | null;
}

/**
 * Attaches a vendor hired without an event to one of the organizer's confirmed
 * bookings, and opens the three-way room in the same step.
 *
 * The need and the engagement move together — leaving the parent need
 * unassigned would make the vendor's gig detail page and the organizer's roster
 * disagree about which event this is. Both are set before the room opens so
 * getActiveVendorOwnerIdsForBooking() can already see the new vendor.
 *
 * Opening the room is a best-effort follow-through, not a precondition: a
 * booking at a seed venue has no host account to introduce anyone to, and
 * failing the assignment for that reason would strand the vendor unassigned
 * forever.
 */
export function assignEngagementToBooking(
  engagementId: string,
  bookingId: string,
  actorAccountId: string
): AssignEngagementResult {
  const engagement = getEngagementById(engagementId);
  if (!engagement) throw new Error("Engagement not found.");
  const booking = getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");

  const eligibility = evaluateAssignment({ engagement, booking, actorAccountId });
  if (!eligibility.ok) {
    throw new Error(ASSIGNMENT_BLOCK_COPY[eligibility.reason ?? "not_organizer"]);
  }

  updateEventNeed(engagement.eventNeedId, { bookingId });
  const updated = setEngagementBooking(engagementId, bookingId);
  if (!updated) throw new Error("Couldn't assign this vendor.");

  const vendorProfile = getVendorProfileById(engagement.vendorProfileId);
  if (vendorProfile) {
    createNotification({
      recipientId: vendorProfile.ownerId,
      type: "event_updated",
      title: "Your booking now has an event",
      body: `The organizer attached your confirmed work to ${formatEventLabel(booking)}.`,
      link: "/dashboard/vendor/confirmed",
    });
  }

  let thread: EventMessageThread | null = null;
  try {
    thread = openEventRoom(bookingId, actorAccountId).thread;
  } catch {
    // See the doc comment: the assignment stands even when no room can open.
  }

  return { engagement: updated, booking, thread };
}

function notifyParticipants(recipientIds: string[], threadId: string, booking: Booking): void {
  for (const recipientId of recipientIds) {
    createNotification({
      recipientId,
      type: "event_room_opened",
      title: "You've been added to an event room",
      body: `The organizer opened a shared conversation for ${formatEventLabel(booking)} — the venue and vendors are all in it.`,
      link: `/dashboard/messages/${threadId}`,
    });
  }
}
