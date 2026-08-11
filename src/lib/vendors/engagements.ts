import type { AgreedTerms, EngagementStatus, PricingModel, ProposalMessageThread, VendorEngagement, VendorProposal } from "@/lib/types/vendors";
import { getEventNeedById, fillOnePosition, releaseOnePosition, canFillPosition } from "./eventNeeds";
import {
  getProposalById,
  getProposalsForNeed,
  markProposalAccepted,
  markProposalInDiscussion,
  closeProposalOpportunityFilled,
  selectProposalsToCloseOnFill,
  declineProposal,
} from "./proposals";
import { getVendorProfileById, updateVendorProfile } from "./profiles";
import { getOrCreateThreadForProposal, attachEngagementToThread } from "./messages";
import { createNotification } from "./notifications";
import { createPortfolioItem } from "./eventPortfolio";
import { getSkillName } from "./skills";

/** Browser-local vendor engagements, created only via finalizeDeal() below (initially "pending_vendor_confirmation" until the vendor confirms via confirmEngagementTerms()). */
const ENGAGEMENTS_KEY = "foundry.vendors.engagements";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getAll(): VendorEngagement[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ENGAGEMENTS_KEY);
    return raw ? (JSON.parse(raw) as VendorEngagement[]) : [];
  } catch {
    return [];
  }
}

function saveAll(engagements: VendorEngagement[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ENGAGEMENTS_KEY, JSON.stringify(engagements));
}

export function getEngagementById(id: string): VendorEngagement | undefined {
  return getAll().find((engagement) => engagement.id === id);
}

export function getEngagementsForOrganizer(organizerId: string): VendorEngagement[] {
  return getAll().filter((engagement) => engagement.organizerId === organizerId);
}

export function getEngagementsForVendor(vendorProfileId: string): VendorEngagement[] {
  return getAll().filter((engagement) => engagement.vendorProfileId === vendorProfileId);
}

export function getEngagementsForBooking(bookingId: string): VendorEngagement[] {
  return getAll().filter((engagement) => engagement.bookingId === bookingId);
}

export function getEngagementForProposal(proposalId: string): VendorEngagement | undefined {
  return getAll().find((engagement) => engagement.acceptedProposalId === proposalId);
}

function updateEngagementRaw(id: string, patch: Partial<VendorEngagement>): VendorEngagement | undefined {
  const engagements = getAll();
  const index = engagements.findIndex((engagement) => engagement.id === id);
  if (index === -1) return undefined;
  const updated: VendorEngagement = { ...engagements[index], ...patch, id: engagements[index].id, updatedAt: new Date().toISOString() };
  const next = [...engagements];
  next[index] = updated;
  saveAll(next);
  return updated;
}

export interface StartConversationResult {
  proposal: VendorProposal;
  thread: ProposalMessageThread;
}

/**
 * The planner's pre-commitment "I'm interested, let's talk" action. Opens
 * (or reuses) a message thread anchored to this proposal and moves it to
 * "in_discussion" — deliberately does NOT create a VendorEngagement, does
 * NOT touch competing proposals, and is idempotent (calling it again on an
 * already-in-discussion proposal just returns the existing thread without
 * re-notifying the vendor).
 */
export function startConversation(proposalId: string): StartConversationResult {
  const proposal = getProposalById(proposalId);
  if (!proposal) throw new Error("Proposal not found.");
  if (proposal.status !== "submitted" && proposal.status !== "shortlisted" && proposal.status !== "in_discussion") {
    throw new Error("Only an active proposal can start a conversation.");
  }

  const need = getEventNeedById(proposal.eventNeedId);
  if (!need) throw new Error("Event need not found.");
  const vendorProfile = getVendorProfileById(proposal.vendorProfileId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const alreadyInDiscussion = proposal.status === "in_discussion";
  const updatedProposal = alreadyInDiscussion ? proposal : markProposalInDiscussion(proposalId);
  if (!updatedProposal) throw new Error("Failed to update proposal.");

  const thread = getOrCreateThreadForProposal({
    proposalId: proposal.id,
    eventNeedId: need.id,
    organizerId: need.organizerId,
    counterpartyId: vendorProfile.ownerId,
  });

  if (!alreadyInDiscussion) {
    createNotification({
      recipientId: vendorProfile.ownerId,
      type: "conversation_started",
      title: "An organizer wants to talk",
      body: `The organizer for "${need.title}" started a conversation about your proposal. This doesn't finalize anything yet.`,
      link: `/dashboard/messages/${thread.id}`,
    });
  }

  return { proposal: updatedProposal, thread };
}

export interface FinalizeDealInput {
  proposalId: string;
  /** Omit to keep the proposal's terms verbatim ("Finalize as proposed"); supply to record negotiated terms ("Edit deal terms"). */
  terms?: { amount: number; pricingModel: PricingModel; deliverables: string };
}

export interface FinalizeDealResult {
  proposal: VendorProposal;
  engagement: VendorEngagement;
  thread: ProposalMessageThread;
}

/**
 * The organizer's half of finalizing a deal: marks the proposal accepted,
 * HOLDS one position on the event need immediately (auto-closing it once
 * full — this prevents the organizer from finalizing two vendors for one
 * slot while the first is still awaiting confirmation), locks an AgreedTerms
 * record (either the proposal's own terms or organizer-edited ones), creates
 * the engagement in "pending_vendor_confirmation", upgrades (or creates) the
 * message thread, and notifies the vendor that final terms are waiting on
 * them. Does NOT close competing proposals yet — see confirmEngagementTerms().
 * Mirrors docs/ARCHITECTURE.md's "cross-row transitions go through one
 * function, not chained client writes" principle, adapted to this
 * client-only prototype (no server RPC exists to run it atomically for real
 * — see CLAUDE.md and this feature's known-limitations note on cross-tab races).
 */
export function finalizeDeal(input: FinalizeDealInput): FinalizeDealResult {
  const proposal = getProposalById(input.proposalId);
  if (!proposal) throw new Error("Proposal not found.");
  if (proposal.status !== "submitted" && proposal.status !== "shortlisted" && proposal.status !== "in_discussion") {
    throw new Error("Only a submitted, shortlisted, or in-discussion proposal can be finalized.");
  }

  const need = getEventNeedById(proposal.eventNeedId);
  if (!need) throw new Error("Event need not found.");
  if (!canFillPosition(need)) {
    throw new Error("All positions for this request are already filled.");
  }

  const vendorProfile = getVendorProfileById(proposal.vendorProfileId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const updatedProposal = markProposalAccepted(input.proposalId);
  if (!updatedProposal) throw new Error("Failed to update proposal.");
  fillOnePosition(need.id);

  const now = new Date().toISOString();
  const finalAmount = input.terms?.amount ?? proposal.proposedAmount;
  const finalPricingModel = input.terms?.pricingModel ?? proposal.pricingModel;
  const finalDeliverables = input.terms?.deliverables ?? proposal.deliverables;
  const terms: AgreedTerms = {
    amount: finalAmount,
    pricingModel: finalPricingModel,
    deliverables: finalDeliverables,
    editedFromProposal: Boolean(input.terms),
    proposedByOrganizerAt: now,
    confirmedByVendorAt: null,
    declinedByVendorAt: null,
    declineReason: null,
  };

  const engagement: VendorEngagement = {
    id: crypto.randomUUID(),
    eventNeedId: need.id,
    bookingId: need.bookingId,
    organizerId: need.organizerId,
    vendorProfileId: proposal.vendorProfileId,
    acceptedProposalId: proposal.id,
    agreedAmount: finalAmount,
    pricingModel: finalPricingModel,
    agreedDeliverables: finalDeliverables,
    status: "pending_vendor_confirmation",
    completedAt: null,
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
    terms,
  };
  saveAll([...getAll(), engagement]);

  const thread = getOrCreateThreadForProposal({
    proposalId: proposal.id,
    eventNeedId: need.id,
    organizerId: need.organizerId,
    counterpartyId: vendorProfile.ownerId,
  });
  attachEngagementToThread(proposal.id, engagement.id);

  createNotification({
    recipientId: vendorProfile.ownerId,
    type: "bid_accepted",
    title: "Final terms are ready for your confirmation",
    body: `The organizer for "${need.title}" locked in final terms — $${finalAmount}. Review and confirm to finalize the deal.`,
    link: "/dashboard/vendor/confirmed",
  });

  return { proposal: updatedProposal, engagement, thread };
}

/**
 * The vendor's half: accepts the locked terms. Ownership-guarded — only the
 * vendor on this engagement may confirm it. Once confirmed, if the event
 * need is now fully filled, sweeps and closes every other still-active
 * proposal on it (deferred here from finalizeDeal() specifically so a later
 * decline doesn't require reopening already-closed competitors).
 */
export function confirmEngagementTerms(engagementId: string, actorAccountId: string): VendorEngagement {
  const engagement = getEngagementById(engagementId);
  if (!engagement) throw new Error("Engagement not found.");
  const vendorProfile = getVendorProfileById(engagement.vendorProfileId);
  if (!vendorProfile || vendorProfile.ownerId !== actorAccountId) {
    throw new Error("Only the vendor on this engagement can confirm it.");
  }
  if (engagement.status !== "pending_vendor_confirmation") {
    throw new Error("This engagement isn't awaiting confirmation.");
  }

  const now = new Date().toISOString();
  const updatedTerms: AgreedTerms | undefined = engagement.terms
    ? { ...engagement.terms, confirmedByVendorAt: now }
    : undefined;
  const updated = updateEngagementRaw(engagementId, { status: "confirmed", terms: updatedTerms });
  if (!updated) throw new Error("Failed to confirm engagement.");

  createNotification({
    recipientId: engagement.organizerId,
    type: "terms_confirmed_by_vendor",
    title: "Vendor confirmed the deal",
    body: `${vendorProfile.displayName} confirmed the final terms.`,
    link: `/dashboard/organizer/bookings/${engagement.bookingId}/vendors`,
  });

  const need = getEventNeedById(engagement.eventNeedId);
  if (need && need.positionsFilled >= need.positionsAvailable) {
    const idsToClose = selectProposalsToCloseOnFill(getProposalsForNeed(need.id), engagement.acceptedProposalId);
    for (const id of idsToClose) {
      closeProposalOpportunityFilled(id);
      const losingProposal = getProposalById(id);
      const losingVendor = losingProposal ? getVendorProfileById(losingProposal.vendorProfileId) : undefined;
      if (losingVendor) {
        createNotification({
          recipientId: losingVendor.ownerId,
          type: "opportunity_filled",
          title: "Opportunity filled",
          body: `The ${getSkillName(need.skillSlug)} position for "${need.title}" has been filled. Your proposal has been closed.`,
          link: "/dashboard/vendor/bids",
        });
      }
    }
  }

  return updated;
}

/**
 * The vendor's other half: declines the locked terms. Releases the position
 * finalizeDeal() held and restores the proposal to "in_discussion" (still an
 * active state — declined isn't a proposal-side terminal outcome, since the
 * organizer may renegotiate or finalize a different vendor).
 */
export function declineEngagementTerms(engagementId: string, actorAccountId: string, reason?: string): VendorEngagement {
  const engagement = getEngagementById(engagementId);
  if (!engagement) throw new Error("Engagement not found.");
  const vendorProfile = getVendorProfileById(engagement.vendorProfileId);
  if (!vendorProfile || vendorProfile.ownerId !== actorAccountId) {
    throw new Error("Only the vendor on this engagement can decline it.");
  }
  if (engagement.status !== "pending_vendor_confirmation") {
    throw new Error("This engagement isn't awaiting confirmation.");
  }

  const now = new Date().toISOString();
  const updatedTerms: AgreedTerms | undefined = engagement.terms
    ? { ...engagement.terms, declinedByVendorAt: now, declineReason: reason?.trim() || null }
    : undefined;
  const updated = updateEngagementRaw(engagementId, { status: "declined_by_vendor", terms: updatedTerms });
  if (!updated) throw new Error("Failed to decline engagement.");

  releaseOnePosition(engagement.eventNeedId);
  markProposalInDiscussion(engagement.acceptedProposalId);

  createNotification({
    recipientId: engagement.organizerId,
    type: "terms_declined_by_vendor",
    title: "Vendor declined the final terms",
    body: `${vendorProfile.displayName} declined the final terms${reason ? `: "${reason}"` : "."}`,
    link: `/dashboard/organizer/bookings/${engagement.bookingId}/vendors/${engagement.eventNeedId}/proposals`,
  });

  return updated;
}

export function declineProposalWithNotification(proposalId: string, reason?: string): VendorProposal | undefined {
  const proposal = getProposalById(proposalId);
  if (!proposal) return undefined;
  const need = getEventNeedById(proposal.eventNeedId);
  const vendorProfile = getVendorProfileById(proposal.vendorProfileId);
  const updated = declineProposal(proposalId, reason);

  if (need && vendorProfile) {
    createNotification({
      recipientId: vendorProfile.ownerId,
      type: "bid_declined",
      title: "Your proposal was declined",
      body: `Your proposal for "${need.title}" was declined.`,
      link: "/dashboard/vendor/bids",
    });
  }
  return updated;
}

function setStatus(id: string, status: EngagementStatus): VendorEngagement | undefined {
  return updateEngagementRaw(id, {
    status,
    completedAt: status === "completed" ? new Date().toISOString() : undefined,
    canceledAt: status === "canceled_by_organizer" || status === "canceled_by_vendor" ? new Date().toISOString() : undefined,
  });
}

export function startEngagement(id: string): VendorEngagement | undefined {
  return setStatus(id, "in_progress");
}

export function completeEngagement(id: string): VendorEngagement | undefined {
  const engagement = getEngagementById(id);
  if (!engagement) return undefined;
  const updated = setStatus(id, "completed");
  const vendorProfile = getVendorProfileById(engagement.vendorProfileId);
  const need = getEventNeedById(engagement.eventNeedId);

  if (vendorProfile) {
    createNotification({
      recipientId: vendorProfile.ownerId,
      type: "vendor_marked_complete",
      title: "Event marked complete",
      body: "The organizer marked your engagement as complete. They may leave a review soon.",
      link: "/dashboard/vendor/confirmed",
    });
    updateVendorProfile(vendorProfile.id, { completedEventCount: vendorProfile.completedEventCount + 1 });

    if (need) {
      createPortfolioItem({
        vendorProfileId: vendorProfile.id,
        engagementId: id,
        displayTitle: need.title || `${getSkillName(need.skillSlug)} gig`,
        eventDate: need.eventDate,
        skillSlug: need.skillSlug,
      });
    }
  }

  return updated;
}

export function cancelEngagementByOrganizer(id: string): VendorEngagement | undefined {
  return setStatus(id, "canceled_by_organizer");
}

export function cancelEngagementByVendor(id: string): VendorEngagement | undefined {
  const engagement = getEngagementById(id);
  const updated = setStatus(id, "canceled_by_vendor");
  if (engagement) {
    createNotification({
      recipientId: engagement.organizerId,
      type: "vendor_canceled",
      title: "A vendor canceled",
      body: "A confirmed vendor canceled their engagement on your event.",
      link: `/dashboard/organizer/bookings/${engagement.bookingId}/vendors`,
    });
  }
  return updated;
}
