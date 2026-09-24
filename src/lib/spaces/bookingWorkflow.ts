import { getBookingById, updateBookingStatus, getBookingVenueOwnerId } from "./bookings";
import { getVenueBySlugAnywhere } from "./submittedVenues";
import { getOrCreateThreadForBooking, sendMessage } from "@/lib/vendors/messages";
import { createNotification } from "@/lib/vendors/notifications";
import type { Booking } from "@/lib/types/spaces";
import type { BookingMessageThread } from "@/lib/types/vendors";

/**
 * Cross-entity booking-accept/decline/messaging orchestration — mirrors
 * engagements.ts's "one function per transition, not chained client writes"
 * convention. Lives under src/lib/spaces (not src/lib/vendors) since bookings
 * are a spaces concept; it imports messages/notifications from vendors/ (the
 * first spaces -> vendors import), but bookings.ts itself stays vendor-free
 * so the existing vendors/seed.ts -> spaces/bookings.ts edge stays acyclic.
 */

export interface AcceptBookingResult {
  booking: Booking;
  /** Null only when the venue has no owner account to converse with (seed listings). */
  thread: BookingMessageThread | null;
}

/**
 * HOST-ONLY. Accepts the request and opens the conversation in the same step.
 *
 * Accepting used to notify the planner and stop there, leaving them with a
 * confirmed booking and no way to reply until the host separately clicked "Go
 * to messages" — so the two people who had just agreed to work together had
 * nowhere to talk, and went to email.
 *
 * This does NOT weaken the host-initiated rule (docs/SECURITY.md "Chat unlock
 * timing"): the thread is still created by the host's own action, and an
 * organizer still cannot create one. Accepting *is* the host agreeing, so it's
 * the natural moment for the channel to exist.
 *
 * An optional `message` is sent as the thread's first message. A conversation
 * that opens empty is one nobody starts — the host has just read the whole
 * request and is the one person with something specific to say, so this is the
 * cheapest moment to capture it. Blank is fine; the thread still opens.
 *
 * Ordered deliberately: ownership is verified before the status changes, so a
 * failure can't leave a confirmed booking behind with no thread.
 */
export function acceptBookingRequest(
  bookingId: string,
  actorAccountId: string,
  message?: string
): AcceptBookingResult {
  const booking = getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "pending") throw new Error("This request has already been decided.");

  const venueOwnerId = getBookingVenueOwnerId(booking);
  if (!venueOwnerId || venueOwnerId !== actorAccountId) {
    throw new Error("Only the venue owner can accept this request.");
  }

  const updated = updateBookingStatus(bookingId, "confirmed");
  if (!updated) throw new Error("Couldn't accept this request.");

  const venue = getVenueBySlugAnywhere(updated.venueSlug);
  const thread = venue
    ? getOrCreateThreadForBooking({
        bookingId: updated.id,
        venueId: venue.id,
        organizerId: updated.organizerId,
        venueOwnerId,
      })
    : null;

  const note = message?.trim();
  if (thread && note) {
    sendMessage({ threadId: thread.id, senderId: actorAccountId, body: note });
  }

  createNotification({
    recipientId: updated.organizerId,
    type: "venue_booking_accepted",
    title: "Your booking request was accepted",
    body:
      thread && note
        ? `${updated.venueName} accepted your request for ${updated.eventDate} and sent you a message.`
        : thread
          ? `${updated.venueName} accepted your request for ${updated.eventDate}. Your conversation with the host is open — say hello.`
          : `${updated.venueName} accepted your request for ${updated.eventDate}.`,
    link: thread ? `/dashboard/messages/${thread.id}` : "/dashboard/organizer",
  });

  return { booking: updated, thread };
}

export function declineBookingRequest(bookingId: string): Booking | undefined {
  const updated = updateBookingStatus(bookingId, "declined");
  if (!updated) return undefined;

  createNotification({
    recipientId: updated.organizerId,
    type: "venue_booking_declined",
    title: "Your booking request was declined",
    body: `${updated.venueName} declined your request for ${updated.eventDate}.`,
    link: "/dashboard/organizer",
  });

  return updated;
}

export interface StartBookingConversationResult {
  booking: Booking;
  thread: BookingMessageThread;
}

/**
 * Shared gate for opening a booking thread.
 *
 * Two rules, and which applies depends on the booking's state:
 *
 *  - **Before the host decides** (`pending`), the channel is HOST-ONLY. A
 *    planner may not open a line to a host who hasn't agreed to anything —
 *    that's the anti-spam invariant the original design was built around, and
 *    it still holds.
 *  - **Once `confirmed`, either party may open it.** The host agreeing is
 *    exactly what makes the planner a legitimate correspondent, and a
 *    one-directional channel between two people who have already committed to
 *    each other just pushes the planner to email for anything the host didn't
 *    think to ask about.
 *
 * A `declined` booking is excluded from both — once the host says no, the
 * channel doesn't open.
 */
function openBookingThread(
  bookingId: string,
  actorAccountId: string,
  options: { allowedStatuses: Booking["status"][]; hostOnly: boolean }
): StartBookingConversationResult {
  const booking = getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (!options.allowedStatuses.includes(booking.status)) {
    throw new Error("This booking can't start a conversation right now.");
  }

  const venueOwnerId = getBookingVenueOwnerId(booking);
  if (!venueOwnerId) throw new Error("This listing has no host account to message.");

  const isHost = venueOwnerId === actorAccountId;
  const isOrganizer = booking.organizerId === actorAccountId;
  if (options.hostOnly && !isHost) {
    throw new Error("Only the venue owner can start this conversation.");
  }
  if (!isHost && !isOrganizer) {
    throw new Error("Only the host or the organizer on this booking can open this conversation.");
  }

  const venue = getVenueBySlugAnywhere(booking.venueSlug);
  if (!venue) throw new Error("Venue not found.");

  const thread = getOrCreateThreadForBooking({
    bookingId: booking.id,
    venueId: venue.id,
    organizerId: booking.organizerId,
    venueOwnerId,
  });

  return { booking, thread };
}

/**
 * EITHER PARTY, confirmed bookings only. Idempotent — reuses the existing
 * thread, so both sides' "Go to messages" land in the same conversation.
 */
export function openBookingConversation(bookingId: string, actorAccountId: string): StartBookingConversationResult {
  return openBookingThread(bookingId, actorAccountId, { allowedStatuses: ["confirmed"], hostOnly: false });
}

/**
 * Non-throwing `openBookingConversation`, for making sure the thread simply
 * exists rather than acting on a click.
 *
 * Callers list bookings they don't individually vet — a seed venue with no host
 * account, or a booking still pending, is an ordinary case here, not an error
 * worth surfacing. Returns null for anything it can't open.
 */
export function ensureBookingConversation(
  bookingId: string,
  actorAccountId: string
): BookingMessageThread | null {
  try {
    return openBookingConversation(bookingId, actorAccountId).thread;
  } catch {
    return null;
  }
}

/**
 * HOST-ONLY. Opens a thread on a booking the host hasn't decided yet and
 * sends their opening question, so "I need more detail before I accept" isn't
 * forced through accept-or-decline.
 *
 * Deliberately leaves the booking `pending`: asking a question is not a
 * decision, and auto-confirming to unlock chat would make the accept
 * meaningless. Host-only because the booking is still undecided — see
 * openBookingThread for why that flips once it's confirmed.
 */
export function startBookingInquiry(
  bookingId: string,
  actorAccountId: string,
  question: string
): StartBookingConversationResult {
  const trimmed = question.trim();
  if (!trimmed) throw new Error("Enter a question to send.");

  const result = openBookingThread(bookingId, actorAccountId, {
    allowedStatuses: ["pending", "confirmed"],
    hostOnly: true,
  });

  sendMessage({ threadId: result.thread.id, senderId: actorAccountId, body: trimmed });

  createNotification({
    recipientId: result.booking.organizerId,
    type: "venue_booking_requested",
    title: `${result.booking.venueName} has a question`,
    body: "The host asked for more detail before confirming your request.",
    link: `/dashboard/messages/${result.thread.id}`,
  });

  return result;
}
