import type { EngagementStatus, VendorEngagement, VendorProposal } from "@/lib/types/vendors";
import { getEventNeedById, fillOnePosition, canFillPosition } from "./eventNeeds";
import { getProposalById, markProposalAccepted, declineProposal } from "./proposals";
import { getVendorProfileById, updateVendorProfile } from "./profiles";
import { getOrCreateThreadForEngagement } from "./messages";
import { createNotification } from "./notifications";
import { createPortfolioItem } from "./eventPortfolio";
import { getSkillName } from "./skills";

/** Browser-local confirmed vendor engagements, created only via acceptProposal() below. */
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

export interface AcceptProposalResult {
  proposal: VendorProposal;
  engagement: VendorEngagement;
}

/**
 * The single cross-entity "accept" transaction: marks the proposal accepted,
 * fills one position on the event need (auto-closing it once full), creates
 * the engagement, unlocks the post-acceptance message thread, and notifies
 * the vendor. Mirrors docs/ARCHITECTURE.md's "cross-row transitions go
 * through one function, not chained client writes" principle, adapted to
 * this client-only prototype (no server RPC exists to run it atomically for
 * real — see CLAUDE.md).
 */
export function acceptProposal(proposalId: string): AcceptProposalResult {
  const proposal = getProposalById(proposalId);
  if (!proposal) throw new Error("Proposal not found.");
  if (proposal.status !== "submitted" && proposal.status !== "shortlisted") {
    throw new Error("Only a submitted or shortlisted proposal can be accepted.");
  }

  const need = getEventNeedById(proposal.eventNeedId);
  if (!need) throw new Error("Event need not found.");
  if (!canFillPosition(need)) {
    throw new Error("All positions for this request are already filled.");
  }

  const vendorProfile = getVendorProfileById(proposal.vendorProfileId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const updatedProposal = markProposalAccepted(proposalId);
  if (!updatedProposal) throw new Error("Failed to update proposal.");
  fillOnePosition(need.id);

  const now = new Date().toISOString();
  const engagement: VendorEngagement = {
    id: crypto.randomUUID(),
    eventNeedId: need.id,
    bookingId: need.bookingId,
    organizerId: need.organizerId,
    vendorProfileId: proposal.vendorProfileId,
    acceptedProposalId: proposal.id,
    agreedAmount: proposal.proposedAmount,
    pricingModel: proposal.pricingModel,
    agreedDeliverables: proposal.deliverables,
    status: "confirmed",
    completedAt: null,
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  saveAll([...getAll(), engagement]);

  getOrCreateThreadForEngagement({
    engagementId: engagement.id,
    organizerId: need.organizerId,
    vendorOwnerId: vendorProfile.ownerId,
  });

  createNotification({
    recipientId: vendorProfile.ownerId,
    type: "bid_accepted",
    title: "Your proposal was accepted",
    body: `Your proposal for "${need.title}" was accepted. You can now message the organizer.`,
    link: "/dashboard/vendor/confirmed",
  });

  return { proposal: updatedProposal, engagement };
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
