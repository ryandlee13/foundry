import { findAccountById } from "@/lib/auth/storage";
import {
  getBookingById,
  getBookingsForOrganizer,
  getBookingsForVenue,
  formatEventLabel,
} from "@/lib/spaces/bookings";
import { getVenuesOwnedBy } from "@/lib/spaces/submittedVenues";
import {
  getThreadsForParticipant,
  getMessagesForThread,
  isEventThread,
  isProposalThread,
} from "@/lib/vendors/messages";
import {
  getEngagementById,
  getEngagementsForBooking,
  getEngagementsForVendor,
  getUnassignedEngagementsForOrganizer,
} from "@/lib/vendors/engagements";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getVendorProfileById, getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import { getReviewForEngagement } from "@/lib/vendors/reviews";
import { resolveBookingTone, resolveEngagementTone, type ViewerRole } from "@/lib/ui/statusTone";
import { summarizeTurn } from "@/lib/ui/whoseTurn";
import { selectUpNext, UP_NEXT_PRIORITY, type UpNextItem } from "./upNext";

/**
 * Builds the "Up next" list for one person, out of storage.
 *
 * Thread-shaped items come from `summarizeTurn()` — the same function behind
 * the thread header line and the inbox's "Needs my reply" filter — rather than
 * from a second set of rules. Three surfaces each deciding for themselves what
 * is waiting on you is three chances to disagree, and the one that disagrees is
 * the one people stop trusting.
 *
 * Items that aren't conversations (a pending booking request, an unleft
 * review) are added per role below.
 */

/** Threads where the viewer owes someone an answer. */
function threadItems(accountId: string): UpNextItem[] {
  const items: UpNextItem[] = [];

  for (const thread of getThreadsForParticipant(accountId)) {
    const messages = getMessagesForThread(thread.id);

    const roleOf = (candidateId: string): ViewerRole => {
      if (candidateId === thread.organizerId) return "organizer";
      return getVendorProfileByOwnerId(candidateId) ? "vendor" : "venue_operator";
    };

    const engagementStatus =
      isProposalThread(thread) && thread.engagementId
        ? (getEngagementById(thread.engagementId)?.status ?? null)
        : null;

    const turn = summarizeTurn({
      messages,
      viewer: roleOf(accountId),
      senderRoleOf: roleOf,
      senderNameOf: (id) => findAccountById(id)?.name.split(" ")[0] ?? "Foundry user",
      engagementStatus,
    });

    if (!turn.isViewersTurn || !turn.status) continue;

    // Name the event, not the thread kind — "Rooftop party" tells the viewer
    // which of their three events this is about.
    let context: string;
    if (isProposalThread(thread)) {
      const need = getEventNeedById(thread.eventNeedId);
      const booking = need ? getBookingById(need.bookingId) : undefined;
      context = booking ? formatEventLabel(booking) : (need?.title ?? "A vendor request");
    } else {
      const booking = getBookingById(thread.bookingId);
      context = booking ? formatEventLabel(booking) : "A booking";
    }

    items.push({
      id: `thread-${thread.id}`,
      title: turn.detail ?? turn.status.label,
      context: isEventThread(thread) ? `${context} · event room` : context,
      href: `/dashboard/messages/${thread.id}`,
      status: turn.status,
      priority: UP_NEXT_PRIORITY.terms,
    });
  }

  return items;
}

export function buildOrganizerUpNext(accountId: string): UpNextItem[] {
  const items = threadItems(accountId);

  /*
   * Reviews a vendor is waiting on. Lowest band — nobody is blocked — but it
   * belongs here because no other surface ever mentions an unreviewed
   * engagement, so they were simply never left.
   */
  for (const booking of getBookingsForOrganizer(accountId)) {
    for (const engagement of getEngagementsForBooking(booking.id)) {
      if (engagement.status !== "completed") continue;
      if (getReviewForEngagement(engagement.id)) continue;
      const vendor = getVendorProfileById(engagement.vendorProfileId);
      items.push({
        id: `review-${engagement.id}`,
        title: `Review ${vendor?.displayName ?? "a vendor"}`,
        context: formatEventLabel(booking),
        href: `/dashboard/organizer/reviews/${engagement.id}`,
        status: { tone: "act", label: "Review owed" },
        priority: UP_NEXT_PRIORITY.housekeeping,
      });
    }
  }

  /*
   * Vendors hired before there was a venue. One row however many there are —
   * they all lead to the same page, and five identical rows would crowd out
   * everything else.
   */
  const unassigned = getUnassignedEngagementsForOrganizer(accountId);
  if (unassigned.length > 0) {
    items.push({
      id: "assign-unassigned",
      title: `Move ${unassigned.length} vendor${unassigned.length === 1 ? "" : "s"} to a venue`,
      context: "Hired with no event attached yet",
      href: "/dashboard/organizer/vendors/unassigned",
      status: { tone: "act", label: "No venue yet" },
      priority: UP_NEXT_PRIORITY.housekeeping,
    });
  }

  return selectUpNext(items);
}

export function buildVenueOwnerUpNext(accountId: string): UpNextItem[] {
  const items = threadItems(accountId);

  /*
   * Pending booking requests — the highest band there is. A planner can do
   * nothing at all until the host answers, and "I never saw the request" is
   * the exact failure this strip exists to prevent.
   */
  for (const venue of getVenuesOwnedBy(accountId)) {
    for (const booking of getBookingsForVenue(venue.id)) {
      if (booking.status !== "pending") continue;
      items.push({
        id: `request-${booking.id}`,
        title: "Answer a booking request",
        context: `${formatEventLabel(booking)} · ${venue.name}`,
        href: "/dashboard/venue",
        status: resolveBookingTone("pending", "venue_operator"),
        priority: UP_NEXT_PRIORITY.blocking_someone,
      });
    }
  }

  return selectUpNext(items);
}

export function buildVendorUpNext(accountId: string): UpNextItem[] {
  const items = threadItems(accountId);

  const profile = getVendorProfileByOwnerId(accountId);
  if (profile) {
    /*
     * Terms sent and unanswered. This blocks two people, not one: the
     * organizer's hire is held open, and every competing proposal on that need
     * stays frozen until the vendor acts.
     */
    for (const engagement of getEngagementsForVendor(profile.id)) {
      if (engagement.status !== "pending_vendor_confirmation") continue;
      const booking = getBookingById(engagement.bookingId);
      items.push({
        id: `confirm-${engagement.id}`,
        title: "Confirm or decline terms",
        context: booking ? formatEventLabel(booking) : "A gig with no venue yet",
        href: "/dashboard/vendor/confirmed",
        status: resolveEngagementTone("pending_vendor_confirmation", "vendor"),
        priority: UP_NEXT_PRIORITY.blocking_someone,
      });
    }
  }

  return selectUpNext(items);
}
