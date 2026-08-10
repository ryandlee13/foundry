import type { BidExpirationDays, ProposalStatus, VendorProposal } from "@/lib/types/vendors";

const DAY_MS = 24 * 60 * 60 * 1000;

export function computeExpiresAt(fromIso: string, days: BidExpirationDays): string {
  return new Date(new Date(fromIso).getTime() + days * DAY_MS).toISOString();
}

export function isPastExpiration(expiresAt: string, now: string = new Date().toISOString()): boolean {
  return new Date(expiresAt).getTime() <= new Date(now).getTime();
}

/**
 * There's no background-job infrastructure in this prototype (or the real
 * backend yet), so an expired bid isn't re-written to status "expired" by a
 * scheduled process — it's derived at read time from `expiresAt`. Only
 * "submitted", "shortlisted", and "in_discussion" proposals can lapse into
 * "expired"; terminal statuses (accepted/declined/withdrawn/canceled/
 * closed_opportunity_filled) are left as-is. An abandoned in-discussion
 * proposal must still be able to lapse, or it permanently blocks the
 * one-active-bid-per-need guard and permanently occupies a competitive-bid
 * summary slot.
 */
export function getEffectiveProposalStatus(
  proposal: Pick<VendorProposal, "status" | "expiresAt">,
  now: string = new Date().toISOString()
): ProposalStatus {
  const isLapsable =
    proposal.status === "submitted" || proposal.status === "shortlisted" || proposal.status === "in_discussion";
  if (isLapsable && isPastExpiration(proposal.expiresAt, now)) return "expired";
  return proposal.status;
}

export function formatExpiration(expiresAt: string, now: string = new Date().toISOString()): string {
  const diffMs = new Date(expiresAt).getTime() - new Date(now).getTime();
  if (diffMs <= 0) return "Expired";
  const days = Math.floor(diffMs / DAY_MS);
  const hours = Math.floor((diffMs % DAY_MS) / (60 * 60 * 1000));
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  return "Expires within the hour";
}

/** Short human date for a full ISO timestamp, e.g. proposal deadlines that now carry a time-of-day component. */
export function formatDeadlineDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
