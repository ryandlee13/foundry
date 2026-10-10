import {
  getBookingById,
  getBookingsForOrganizer,
  formatEventLabel,
} from "@/lib/spaces/bookings";
import { computeBookingDurationMinutes } from "@/lib/spaces/bookingConstraints";
import { estimateBookingValue } from "@/lib/spaces/venueEarnings";
import { resolveContractState } from "@/lib/spaces/bookingContracts";
import { getVenueById } from "@/lib/spaces/submittedVenues";
import { hasDisclosedDetails, resolveVenueDisclosure } from "@/lib/spaces/venueIdentity";
import { getThreadForBooking, getMessagesForThread } from "@/lib/vendors/messages";
import { getEngagementsForBooking, getUnassignedEngagementsForOrganizer } from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { getSkillName } from "@/lib/vendors/skills";
import { resolveBookingTone, resolveEngagementTone } from "@/lib/ui/statusTone";
import {
  resolveVendorLine,
  resolveVenueLine,
  summarizeLedger,
  type EventLedger,
  type LedgerLineItem,
} from "./eventLedger";
import type { BookingContractAttachment, BookingProposalAttachment, EngagementStatus } from "@/lib/types/vendors";

/**
 * Assembles an event's ledger out of storage.
 *
 * Same split as everywhere else in this layer: the rules — basis, precedence,
 * which amounts may be summed — live in the pure, tested `eventLedger.ts`, and
 * this file only fetches and shapes. If you find yourself writing a decision
 * here, it belongs on the other side of that boundary.
 */

/** Engagements that represent real committed money. */
const ACTIVE_STATUSES: EngagementStatus[] = ["confirmed", "in_progress", "completed"];

/** Hours in a booking's window, for turning a rate into an estimate. */
function bookedHours(startTime: string, endTime: string): number | null {
  const minutes = computeBookingDurationMinutes(startTime, endTime);
  if (minutes === null || minutes <= 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

/**
 * The name to show for a venue in a planner's finance view.
 *
 * Goes through `resolveVenueDisclosure()` rather than reading `realName` off
 * the venue — docs/SECURITY.md #5 — so the operating name appears only for the
 * organizer of a confirmed booking, and only when there is one to show. The
 * public descriptive title is the fallback, never a blank.
 */
function venueNameFor(bookingId: string, viewerId: string): string {
  const booking = getBookingById(bookingId);
  if (!booking) return "Venue";

  const venue = getVenueById(booking.venueId);
  if (!venue) return booking.venueName;

  const disclosure = resolveVenueDisclosure({
    venue,
    viewerId,
    viewerBookings: getBookingsForOrganizer(viewerId),
  });

  if (disclosure.reason === "confirmed_booking" && hasDisclosedDetails(disclosure) && disclosure.realName) {
    return disclosure.realName;
  }
  return booking.venueName;
}

export function resolveEventLedger(bookingId: string, viewerId: string): EventLedger {
  const booking = getBookingById(bookingId);
  if (!booking) return summarizeLedger([]);

  const venue = getVenueById(booking.venueId);
  const venueName = venueNameFor(bookingId, viewerId);

  /*
   * Offers and contracts are message attachments, so the booking thread is the
   * only place the agreed figures exist — the same derivation the conversation
   * and the progress stepper both do. No thread means nothing agreed yet, which
   * is correct rather than unknown.
   */
  const thread = getThreadForBooking(bookingId);
  const messages = thread ? getMessagesForThread(thread.id) : [];
  const proposals = messages
    .map((message) => message.proposal)
    .filter((proposal): proposal is BookingProposalAttachment => Boolean(proposal));
  const contracts = messages
    .map((message) => message.contract)
    .filter((contract): contract is BookingContractAttachment => Boolean(contract));

  const signed = resolveContractState(contracts).signed;

  // Latest accepted revised-terms offer; a deposit request isn't a price for
  // the booking, so it never sets the venue line's amount.
  const acceptedTerms = proposals
    .filter((proposal) => proposal.kind === "revised_terms" && proposal.status === "accepted")
    .sort((a, b) => (a.respondedAt ?? "").localeCompare(b.respondedAt ?? ""));
  const acceptedOffer = acceptedTerms[acceptedTerms.length - 1];

  const depositRequests = proposals
    .filter((proposal) => proposal.kind === "deposit_request" && proposal.status !== "declined")
    .map((proposal) => ({ amount: proposal.depositAmount, dueDate: proposal.dueDate }));

  const venueLine = resolveVenueLine({
    venueName,
    status: resolveBookingTone(booking.status, "organizer"),
    signedContractTotal: signed?.totalAmount ?? null,
    signedContractDeposit: signed?.depositAmount ?? null,
    signedContractBalanceDue: signed?.balanceDueDate ?? null,
    acceptedOfferTotal: acceptedOffer?.estimatedTotal ?? null,
    depositRequests,
    estimateAmount: venue ? estimateBookingValue(booking, venue) : null,
  });

  const hours = bookedHours(booking.startTime, booking.endTime);
  const vendorLines = getEngagementsForBooking(bookingId)
    .filter((engagement) => ACTIVE_STATUSES.includes(engagement.status))
    .map((engagement) => {
      const need = getEventNeedById(engagement.eventNeedId);
      const profile = getVendorProfileById(engagement.vendorProfileId);
      return resolveVendorLine({
        engagementId: engagement.id,
        label: need ? getSkillName(need.skillSlug) : "Vendor",
        counterparty: profile?.displayName ?? "Vendor",
        status: resolveEngagementTone(engagement.status, "organizer"),
        amount: engagement.agreedAmount,
        pricingModel: engagement.pricingModel,
        hours,
        // What the planner said they wanted to spend on this request.
        budgetAmount: need?.budgetMax ?? null,
      });
    });

  return summarizeLedger([venueLine, ...vendorLines]);
}

/**
 * Lines for vendors hired before there was a venue.
 *
 * Every one of these is `rate_only` or `firm` — never an estimate — because
 * there is no booking window to multiply a rate by. That's the whole reason
 * they're reported separately from any event's ledger rather than folded into
 * one: they have no event to belong to.
 */
export function resolveUnassignedVendorLines(organizerId: string): LedgerLineItem[] {
  return getUnassignedEngagementsForOrganizer(organizerId).map((engagement) => {
    const need = getEventNeedById(engagement.eventNeedId);
    const profile = getVendorProfileById(engagement.vendorProfileId);
    return resolveVendorLine({
      engagementId: engagement.id,
      label: need ? getSkillName(need.skillSlug) : "Vendor",
      counterparty: profile?.displayName ?? "Vendor",
      status: resolveEngagementTone(engagement.status, "organizer"),
      amount: engagement.agreedAmount,
      pricingModel: engagement.pricingModel,
      hours: null,
      budgetAmount: need?.budgetMax ?? null,
    });
  });
}

export interface OrganizerEventLedger {
  bookingId: string;
  eventLabel: string;
  eventDate: string;
  ledger: EventLedger;
}

/** Every event this planner has, each with its own ledger, soonest first. */
export function resolveOrganizerLedgers(organizerId: string): OrganizerEventLedger[] {
  return getBookingsForOrganizer(organizerId)
    .filter((booking) => booking.status !== "declined")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .map((booking) => ({
      bookingId: booking.id,
      eventLabel: formatEventLabel(booking),
      eventDate: booking.eventDate,
      ledger: resolveEventLedger(booking.id, organizerId),
    }));
}
