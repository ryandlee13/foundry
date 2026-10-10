import { BOOKING_STATUS_LABELS } from "@/lib/spaces/labels";
import {
  ENGAGEMENT_STATUS_LABELS,
  EVENT_NEED_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  VENDOR_PROFILE_STATUS_LABELS,
} from "@/lib/vendors/labels";
import type { BookingStatus } from "@/lib/types/spaces";
import type {
  BookingContractStatus,
  BookingProposalStatus,
  DealProposalStatus,
  EngagementStatus,
  EventNeedStatus,
  ProposalStatus,
  VendorProfileStatus,
} from "@/lib/types/vendors";

/**
 * The single place a status becomes a color and a sentence.
 *
 * Before this existed, eight `STATUS_STYLES` maps across seven files each
 * picked their own colors, and green was the only semantic color in the
 * palette — so "pending", "needs your action" and "waiting on someone else"
 * all rendered identically. A badge told you an enum name and nothing about
 * whether you had to do something.
 *
 * The organizing principle is **whose move is it**, not what the raw state is
 * called. That is why almost every function here takes the viewer's role: one
 * `pending_vendor_confirmation` engagement is "Waiting on vendor" to the
 * planner and "Your confirmation needed" to the vendor, and those two want
 * different colors on screen because they want different behaviour from the
 * person reading them.
 *
 * Labels come from the existing `*_STATUS_LABELS` maps wherever the neutral
 * wording is already right, so there is one label vocabulary in the codebase
 * rather than two competing ones. This module only writes its own text where
 * the viewer changes what the words should say.
 *
 * Pure — no storage, no `window`, no React. Tested in node.
 */

export type StatusTone =
  /** Settled, agreed, done. Nobody needs to do anything. */
  | "ok"
  /** Live, but the ball is in the other party's court. */
  | "wait"
  /** The viewer has to do something. Also gets a dot — never color alone. */
  | "act"
  /** Over, and not in a good way: declined, expired, withdrawn, canceled. */
  | "muted";

export interface StatusDescriptor {
  tone: StatusTone;
  label: string;
}

/**
 * Which side of the marketplace is looking at the badge.
 *
 * `admin` is deliberately absent: a moderator is never the subject of "your
 * turn", so admin surfaces read the viewer-neutral `*_STATUS_LABELS` directly
 * instead of pretending the state is about them.
 */
export type ViewerRole = "organizer" | "vendor" | "venue_operator";

const tone = (tone: StatusTone, label: string): StatusDescriptor => ({ tone, label });

/**
 * A venue booking request.
 *
 * `pending` is the asymmetric one: the planner is waiting on a decision they
 * can't influence, while the host is the one person who can end the wait.
 */
export function resolveBookingTone(status: BookingStatus, viewer: ViewerRole): StatusDescriptor {
  switch (status) {
    case "pending":
      return viewer === "venue_operator"
        ? tone("act", "Needs your reply")
        : tone("wait", "Awaiting host");
    case "confirmed":
      return tone("ok", BOOKING_STATUS_LABELS.confirmed);
    case "declined":
      return tone("muted", BOOKING_STATUS_LABELS.declined);
  }
}

/**
 * A vendor's bid on a request.
 *
 * `submitted`/`shortlisted` put the organizer on the hook to respond and leave
 * the vendor waiting. `in_discussion` is live for both sides, so neither gets
 * an action color — a conversation isn't a task.
 */
export function resolveProposalTone(status: ProposalStatus, viewer: ViewerRole): StatusDescriptor {
  switch (status) {
    case "draft":
      return viewer === "vendor" ? tone("act", "Finish your bid") : tone("muted", PROPOSAL_STATUS_LABELS.draft);
    case "submitted":
      return viewer === "organizer"
        ? tone("act", "New bid to review")
        : tone("wait", "Awaiting organizer");
    case "shortlisted":
      return viewer === "organizer"
        ? tone("act", "Shortlisted — your call")
        : tone("wait", PROPOSAL_STATUS_LABELS.shortlisted);
    case "in_discussion":
      return tone("wait", PROPOSAL_STATUS_LABELS.in_discussion);
    case "accepted":
      return tone("ok", PROPOSAL_STATUS_LABELS.accepted);
    case "declined":
      return tone("muted", PROPOSAL_STATUS_LABELS.declined);
    case "withdrawn":
      return tone("muted", PROPOSAL_STATUS_LABELS.withdrawn);
    case "expired":
      return tone("muted", PROPOSAL_STATUS_LABELS.expired);
    case "canceled":
      return tone("muted", PROPOSAL_STATUS_LABELS.canceled);
    case "closed_opportunity_filled":
      return tone("muted", PROPOSAL_STATUS_LABELS.closed_opportunity_filled);
  }
}

/**
 * A hire in flight.
 *
 * `pending_vendor_confirmation` is the canonical case this whole module exists
 * for: the organizer has sent terms and can only wait, while the vendor is one
 * click from settling it.
 */
export function resolveEngagementTone(status: EngagementStatus, viewer: ViewerRole): StatusDescriptor {
  switch (status) {
    case "pending_vendor_confirmation":
      return viewer === "vendor"
        ? tone("act", "Your confirmation needed")
        : tone("wait", "Waiting on vendor");
    case "confirmed":
      return tone("ok", ENGAGEMENT_STATUS_LABELS.confirmed);
    case "in_progress":
      return tone("ok", ENGAGEMENT_STATUS_LABELS.in_progress);
    case "completed":
      return tone("ok", ENGAGEMENT_STATUS_LABELS.completed);
    case "declined_by_vendor":
      return tone("muted", ENGAGEMENT_STATUS_LABELS.declined_by_vendor);
    case "canceled_by_organizer":
      return tone("muted", ENGAGEMENT_STATUS_LABELS.canceled_by_organizer);
    case "canceled_by_vendor":
      return tone("muted", ENGAGEMENT_STATUS_LABELS.canceled_by_vendor);
    /*
     * Disputed is `act` for everyone on purpose. It is the one state where
     * leaving it alone is never the right move, whichever side you're on.
     */
    case "disputed":
      return tone("act", ENGAGEMENT_STATUS_LABELS.disputed);
  }
}

/**
 * An organizer's "looking for a ___" posting. Only ever shown to the
 * organizer who owns it, so this one needs no viewer.
 */
export function resolveEventNeedTone(status: EventNeedStatus): StatusDescriptor {
  switch (status) {
    case "draft":
      return tone("act", "Not posted yet");
    case "published":
      return tone("wait", "Collecting bids");
    case "paused":
      return tone("muted", EVENT_NEED_STATUS_LABELS.paused);
    case "filled":
      return tone("ok", EVENT_NEED_STATUS_LABELS.filled);
    case "closed":
      return tone("muted", EVENT_NEED_STATUS_LABELS.closed);
    case "canceled":
      return tone("muted", EVENT_NEED_STATUS_LABELS.canceled);
  }
}

/**
 * A vendor's own public listing. Shown to the vendor and to admins; a planner
 * never sees a non-published profile at all (`VendorProfileLookup` enforces
 * that), so there is no organizer reading to account for.
 */
export function resolveVendorProfileTone(status: VendorProfileStatus): StatusDescriptor {
  switch (status) {
    case "draft":
      return tone("act", "Finish your profile");
    case "pending_review":
      return tone("wait", VENDOR_PROFILE_STATUS_LABELS.pending_review);
    case "published":
      return tone("ok", VENDOR_PROFILE_STATUS_LABELS.published);
    case "rejected":
      return tone("muted", VENDOR_PROFILE_STATUS_LABELS.rejected);
    case "suspended":
      return tone("muted", VENDOR_PROFILE_STATUS_LABELS.suspended);
  }
}

/**
 * A venue owner's in-thread offer — revised terms, or a deposit ask.
 *
 * Note this is an *offer*, not a payment: an accepted deposit request records
 * that the planner agreed to pay, and nothing more. No money moves through
 * Foundry (Phase 7), so "Accepted" here must never be read or relabelled as
 * "Paid" — see docs/SECURITY.md and `formatProposalFootnote()`.
 */
export function resolveBookingProposalTone(
  status: BookingProposalStatus,
  viewer: ViewerRole
): StatusDescriptor {
  switch (status) {
    case "sent":
      return viewer === "organizer"
        ? tone("act", "Your response needed")
        : tone("wait", "Awaiting planner");
    case "accepted":
      return tone("ok", "Accepted");
    case "declined":
      return tone("muted", "Declined");
  }
}

/** A round of vendor deal terms. Either side can send one, so either side can owe a reply. */
export function resolveDealProposalTone(
  status: DealProposalStatus,
  viewer: ViewerRole,
  /** Who sent this round — the other party is the one who owes an answer. */
  senderRole: ViewerRole
): StatusDescriptor {
  switch (status) {
    case "sent":
      return viewer === senderRole
        ? tone("wait", "Awaiting their reply")
        : tone("act", "Your response needed");
    case "accepted":
      return tone("ok", "Agreed");
    case "declined":
      return tone("muted", "Declined");
    case "superseded":
      return tone("muted", "Superseded");
  }
}

/**
 * A formal contract. Written and signed by the host, countersigned by the
 * planner — so a `sent` contract is always the planner's move.
 *
 * Signing records that two people put their names to a text on a date. It is
 * not a claim of legal enforceability and Foundry is not a party to it, which
 * is why `signed` says "Signed" and never "Executed" or "Binding" — see
 * `formatContractFootnote()`'s TODO(legal).
 */
export function resolveContractTone(
  status: BookingContractStatus,
  viewer: ViewerRole
): StatusDescriptor {
  switch (status) {
    case "sent":
      return viewer === "organizer"
        ? tone("act", "Your signature needed")
        : tone("wait", "Awaiting planner signature");
    case "signed":
      return tone("ok", "Signed");
    case "declined":
      return tone("muted", "Declined");
    case "withdrawn":
      return tone("muted", "Withdrawn");
  }
}

/** True when this descriptor is something the viewer personally has to act on. */
export function needsViewerAction(descriptor: StatusDescriptor): boolean {
  return descriptor.tone === "act";
}
