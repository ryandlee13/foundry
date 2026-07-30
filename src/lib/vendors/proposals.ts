import type { BidExpirationDays, VendorProposal } from "@/lib/types/vendors";
import { computeExpiresAt, getEffectiveProposalStatus, formatExpiration } from "./expiration";
import { getEventNeedById } from "./eventNeeds";
import { getVendorProfileById } from "./profiles";
import { createNotification, createNotificationsForMany } from "./notifications";

/** Browser-local vendor proposals (bids). Same prototype caveat as profiles.ts. */
const PROPOSALS_KEY = "foundry.vendors.proposals";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getProposals(): VendorProposal[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(PROPOSALS_KEY);
    return raw ? (JSON.parse(raw) as VendorProposal[]) : [];
  } catch {
    return [];
  }
}

function saveProposals(proposals: VendorProposal[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PROPOSALS_KEY, JSON.stringify(proposals));
}

/** Every read below returns proposals with their effective (possibly lapsed-to-expired) status applied. */
function withEffectiveStatus(proposals: VendorProposal[]): VendorProposal[] {
  return proposals.map((proposal) => ({ ...proposal, status: getEffectiveProposalStatus(proposal) }));
}

export function getProposalById(id: string): VendorProposal | undefined {
  return withEffectiveStatus(getProposals()).find((proposal) => proposal.id === id);
}

export function getProposalsForNeed(eventNeedId: string): VendorProposal[] {
  return withEffectiveStatus(getProposals().filter((proposal) => proposal.eventNeedId === eventNeedId));
}

export function getProposalsForVendor(vendorProfileId: string): VendorProposal[] {
  return withEffectiveStatus(getProposals().filter((proposal) => proposal.vendorProfileId === vendorProfileId));
}

/** Pure predicate (no storage access) so the "one active bid per need" rule is unit-testable without a browser. */
export function findActiveProposal(
  proposals: VendorProposal[],
  vendorProfileId: string,
  eventNeedId: string
): VendorProposal | undefined {
  return proposals.find(
    (proposal) =>
      proposal.vendorProfileId === vendorProfileId &&
      proposal.eventNeedId === eventNeedId &&
      (proposal.status === "submitted" || proposal.status === "shortlisted")
  );
}

/** A vendor may only have one active (submitted or shortlisted) proposal per event need at a time. */
export function getActiveProposal(vendorProfileId: string, eventNeedId: string): VendorProposal | undefined {
  return findActiveProposal(getProposalsForVendor(vendorProfileId), vendorProfileId, eventNeedId);
}

export function createProposal(input: {
  eventNeedId: string;
  vendorProfileId: string;
  proposedAmount: number;
  pricingModel: VendorProposal["pricingModel"];
  message: string;
  deliverables: string;
  equipmentIncluded: string;
  availabilityConfirmed: boolean;
  setupRequirements: string;
  portfolioLinkIds: string[];
  questionsForOrganizer: string;
  expirationDays: BidExpirationDays;
}): VendorProposal {
  const existing = getActiveProposal(input.vendorProfileId, input.eventNeedId);
  if (existing) {
    throw new Error("You already have an active proposal on this opportunity. Withdraw it before submitting a new one.");
  }

  const now = new Date().toISOString();
  const proposal: VendorProposal = {
    id: crypto.randomUUID(),
    eventNeedId: input.eventNeedId,
    vendorProfileId: input.vendorProfileId,
    proposedAmount: input.proposedAmount,
    pricingModel: input.pricingModel,
    message: input.message,
    deliverables: input.deliverables,
    equipmentIncluded: input.equipmentIncluded,
    availabilityConfirmed: input.availabilityConfirmed,
    setupRequirements: input.setupRequirements,
    portfolioLinkIds: input.portfolioLinkIds,
    questionsForOrganizer: input.questionsForOrganizer,
    expiresAt: computeExpiresAt(now, input.expirationDays),
    status: "submitted",
    declineReason: null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  saveProposals([...getProposals(), proposal]);

  const need = getEventNeedById(input.eventNeedId);
  if (need) {
    createNotification({
      recipientId: need.organizerId,
      type: "new_proposal",
      title: "New proposal received",
      body: `A vendor submitted a proposal for "${need.title}".`,
      link: `/dashboard/organizer/bookings/${need.bookingId}/vendors/${need.id}/proposals`,
    });
  }

  return proposal;
}

function updateProposalRaw(id: string, patch: Partial<VendorProposal>): VendorProposal | undefined {
  const proposals = getProposals();
  const index = proposals.findIndex((proposal) => proposal.id === id);
  if (index === -1) return undefined;

  const updated: VendorProposal = { ...proposals[index], ...patch, id: proposals[index].id, updatedAt: new Date().toISOString() };
  const next = [...proposals];
  next[index] = updated;
  saveProposals(next);
  return updated;
}

/** A vendor may edit an active proposal's terms before it's accepted. */
export function editProposal(
  id: string,
  patch: Pick<
    VendorProposal,
    "proposedAmount" | "pricingModel" | "message" | "deliverables" | "equipmentIncluded" | "setupRequirements"
  >
): VendorProposal | undefined {
  const proposal = getProposalById(id);
  if (!proposal || (proposal.status !== "submitted" && proposal.status !== "shortlisted")) {
    throw new Error("Only an active, un-accepted proposal can be edited.");
  }
  return updateProposalRaw(id, patch);
}

export function withdrawProposal(id: string): VendorProposal | undefined {
  const proposal = getProposalById(id);
  const updated = updateProposalRaw(id, { status: "withdrawn" });
  const need = proposal ? getEventNeedById(proposal.eventNeedId) : undefined;
  if (need) {
    createNotification({
      recipientId: need.organizerId,
      type: "vendor_withdrew",
      title: "A vendor withdrew their proposal",
      body: `A proposal for "${need.title}" was withdrawn.`,
      link: `/dashboard/organizer/bookings/${need.bookingId}/vendors/${need.id}/proposals`,
    });
  }
  return updated;
}

export function shortlistProposal(id: string): VendorProposal | undefined {
  const updated = updateProposalRaw(id, { status: "shortlisted" });
  if (updated) {
    const vendorProfile = getVendorProfileById(updated.vendorProfileId);
    const need = getEventNeedById(updated.eventNeedId);
    if (vendorProfile && need) {
      createNotification({
        recipientId: vendorProfile.ownerId,
        type: "bid_shortlisted",
        title: "You've been shortlisted",
        body: `Your proposal for "${need.title}" was shortlisted.`,
        link: "/dashboard/vendor/bids",
      });
    }
  }
  return updated;
}

/**
 * Creates a "bid expiring soon" notification for any of the vendor's active
 * proposals expiring within 24 hours — computed lazily on page load (there's
 * no background job in this prototype), skipping proposals already notified.
 * Mirrors the "badge computed from local data on page load" convention used
 * elsewhere in this codebase (see useOwnedVenuesData).
 */
export function ensureExpiringBidNotifications(vendorProfileId: string): void {
  const HOURS_24_MS = 24 * 60 * 60 * 1000;
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + HOURS_24_MS);

  const expiringSoon = getProposalsForVendor(vendorProfileId).filter(
    (proposal) =>
      (proposal.status === "submitted" || proposal.status === "shortlisted") &&
      new Date(proposal.expiresAt) <= soonThreshold &&
      new Date(proposal.expiresAt) > now
  );

  const vendorProfile = getVendorProfileById(vendorProfileId);
  if (!vendorProfile || expiringSoon.length === 0) return;

  createNotificationsForMany(
    [vendorProfile.ownerId],
    {
      type: "bid_expiring",
      title: "A bid is expiring soon",
      body:
        expiringSoon.length === 1
          ? `Your proposal expires ${formatExpiration(expiringSoon[0].expiresAt).toLowerCase()}.`
          : `${expiringSoon.length} of your proposals are expiring within 24 hours.`,
      link: "/dashboard/vendor/bids",
    }
  );
}

export function declineProposal(id: string, reason?: string): VendorProposal | undefined {
  return updateProposalRaw(id, { status: "declined", declineReason: reason?.trim() || null });
}

/** Vendors renew an expired proposal by re-submitting with a fresh expiration window. */
export function renewProposal(id: string, expirationDays: BidExpirationDays): VendorProposal | undefined {
  const proposal = getProposalById(id);
  if (!proposal || proposal.status !== "expired") {
    throw new Error("Only an expired proposal can be renewed.");
  }
  const now = new Date().toISOString();
  return updateProposalRaw(id, { status: "submitted", expiresAt: computeExpiresAt(now, expirationDays), submittedAt: now });
}

/** Internal: used by the accept-proposal orchestration in engagements.ts. */
export function markProposalAccepted(id: string): VendorProposal | undefined {
  return updateProposalRaw(id, { status: "accepted" });
}
