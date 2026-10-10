import { getBookingById } from "@/lib/spaces/bookings";
import { resolveContractState } from "@/lib/spaces/bookingContracts";
import { getEventNeedsForBooking } from "@/lib/vendors/eventNeeds";
import { getEngagementsForBooking } from "@/lib/vendors/engagements";
import { getThreadForBooking, getMessagesForThread } from "@/lib/vendors/messages";
import { getReviewForEngagement } from "@/lib/vendors/reviews";
import { computeEventProgress, type EventProgress } from "./eventProgress";
import type { BookingContractAttachment } from "@/lib/types/vendors";

/**
 * Gathers what `computeEventProgress()` needs out of storage.
 *
 * The split is the one CLAUDE.md asks for throughout this layer: the rules live
 * in a pure function that takes its inputs as arguments and is tested in node,
 * and this thin wrapper is the only part that touches localStorage. Anything
 * resembling a decision belongs on the other side of this file, not in here.
 */
export function resolveEventProgress(bookingId: string | null, todayIso: string): EventProgress {
  const booking = bookingId ? (getBookingById(bookingId) ?? null) : null;

  const needs = bookingId ? getEventNeedsForBooking(bookingId) : [];
  const engagements = bookingId ? getEngagementsForBooking(bookingId) : [];

  const confirmedVendorCount = engagements.filter(
    (engagement) =>
      engagement.status === "confirmed" ||
      engagement.status === "in_progress" ||
      engagement.status === "completed"
  ).length;
  const awaitingVendorCount = engagements.filter(
    (engagement) => engagement.status === "pending_vendor_confirmation"
  ).length;

  /*
   * Offers and contracts are message attachments, so the only way to know
   * what's outstanding is to read the booking thread — the same derivation the
   * conversation view does. A booking with no thread yet simply has nothing
   * outstanding, which is correct rather than unknown.
   */
  const thread = bookingId ? getThreadForBooking(bookingId) : undefined;
  const messages = thread ? getMessagesForThread(thread.id) : [];
  const openVenueOfferCount = messages.filter((message) => message.proposal?.status === "sent").length;
  const contracts = messages
    .map((message) => message.contract)
    .filter((contract): contract is BookingContractAttachment => Boolean(contract));
  const contractState = resolveContractState(contracts);

  /*
   * Reviewable means `completed` — the same bar checkReviewEligibility()
   * enforces. It isn't called here because it answers a per-engagement
   * permission question (is this the right organizer, is there already a
   * review) and this only needs the count of what's outstanding.
   */
  const completed = engagements.filter((engagement) => engagement.status === "completed");
  const reviewedCount = completed.filter((engagement) => getReviewForEngagement(engagement.id)).length;

  return computeEventProgress({
    booking,
    needCount: needs.length,
    confirmedVendorCount,
    awaitingVendorCount,
    openVenueOfferCount,
    contractSent: contracts.length > 0,
    contractSigned: contractState.signed !== null,
    reviewableCount: completed.length,
    reviewedCount,
    todayIso,
  });
}
