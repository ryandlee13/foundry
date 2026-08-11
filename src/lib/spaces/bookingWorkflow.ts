import { getBookingById, updateBookingStatus, getBookingVenueOwnerId } from "./bookings";
import { getVenueBySlugAnywhere } from "./submittedVenues";
import { getOrCreateThreadForBooking } from "@/lib/vendors/messages";
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

export function acceptBookingRequest(bookingId: string): Booking | undefined {
  const updated = updateBookingStatus(bookingId, "confirmed");
  if (!updated) return undefined;

  createNotification({
    recipientId: updated.organizerId,
    type: "venue_booking_accepted",
    title: "Your booking request was accepted",
    body: `${updated.venueName} accepted your request for ${updated.eventDate}.`,
    // Not a thread link — the thread doesn't exist yet; the host still has to
    // click "Go to messages" to open one. See docs/SECURITY.md "Chat unlock timing".
    link: "/dashboard/organizer",
  });

  return updated;
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
 * HOST-ONLY. Throws when the actor isn't the venue owner, or the booking
 * isn't confirmed. The venue mirror of "a vendor can never create a
 * thread" — an organizer can never create a booking thread, only reply once
 * the host has opened one. See docs/SECURITY.md "Chat unlock timing".
 */
export function startBookingConversation(bookingId: string, actorAccountId: string): StartBookingConversationResult {
  const booking = getBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "confirmed") {
    throw new Error("Only a confirmed booking can start a conversation.");
  }

  const venueOwnerId = getBookingVenueOwnerId(booking);
  if (!venueOwnerId || venueOwnerId !== actorAccountId) {
    throw new Error("Only the venue owner can start this conversation.");
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
