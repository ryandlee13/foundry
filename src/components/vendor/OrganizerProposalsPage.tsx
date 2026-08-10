"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getProposalsForNeed } from "@/lib/vendors/proposals";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { acceptProposal, declineProposalWithNotification, startConversation } from "@/lib/vendors/engagements";
import { shortlistProposal } from "@/lib/vendors/proposals";
import { getThreadForProposal } from "@/lib/vendors/messages";
import { getSkillName } from "@/lib/vendors/skills";
import { PRICING_MODEL_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/vendors/labels";
import { formatExpiration, formatDeadlineDate, getEffectiveProposalStatus } from "@/lib/vendors/expiration";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import Dialog from "@/components/ui/Dialog";
import type { EventNeed, ProposalStatus, VendorProfile, VendorProposal } from "@/lib/types/vendors";

type SortOption =
  | "recommended"
  | "lowest_price"
  | "highest_rating"
  | "most_experience"
  | "most_completed_events"
  | "newest"
  | "expiring_soon";

const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  lowest_price: "Lowest price",
  highest_rating: "Highest rating",
  most_experience: "Most experience",
  most_completed_events: "Most Foundry events",
  newest: "Newest proposal",
  expiring_soon: "Expiring soon",
};

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-paper-dim text-ink-soft",
  submitted: "bg-brass/15 text-brass-dark",
  shortlisted: "bg-brass/15 text-brass-dark",
  in_discussion: "bg-brass/15 text-brass-dark",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-wine/10 text-wine",
  withdrawn: "bg-paper-dim text-ink-soft",
  expired: "bg-wine/10 text-wine",
  canceled: "bg-paper-dim text-ink-soft",
  closed_opportunity_filled: "bg-paper-dim text-ink-soft",
};

export default function OrganizerProposalsPage({ bookingId, needId }: { bookingId: string; needId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [need, setNeed] = useState<EventNeed | null>(null);
  const [proposals, setProposals] = useState<VendorProposal[]>([]);
  const [vendorsById, setVendorsById] = useState<Record<string, VendorProfile>>({});
  const [threadIdByProposal, setThreadIdByProposal] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortOption>("recommended");
  const [now, setNow] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingAccept, setConfirmingAccept] = useState<VendorProposal | null>(null);
  const [decliningProposal, setDecliningProposal] = useState<VendorProposal | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const refresh = useCallback(() => {
    const found = getEventNeedById(needId);
    setNeed(found ?? null);
    setNow(new Date().toISOString());
    if (found) {
      const list = getProposalsForNeed(found.id);
      setProposals(list);
      const vendors: Record<string, VendorProfile> = {};
      const threadIds: Record<string, string> = {};
      for (const p of list) {
        const v = getVendorProfileById(p.vendorProfileId);
        if (v) vendors[p.vendorProfileId] = v;
        const thread = getThreadForProposal(p.id);
        if (thread) threadIds[p.id] = thread.id;
      }
      setVendorsById(vendors);
      setThreadIdByProposal(threadIds);
    }
    setLoaded(true);
  }, [needId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const sorted = useMemo(() => {
    const list = [...proposals];
    switch (sort) {
      case "lowest_price":
        return list.sort((a, b) => a.proposedAmount - b.proposedAmount);
      case "highest_rating":
        return list.sort((a, b) => (vendorsById[b.vendorProfileId]?.averageRating ?? 0) - (vendorsById[a.vendorProfileId]?.averageRating ?? 0));
      case "most_experience":
        return list.sort((a, b) => (vendorsById[b.vendorProfileId]?.yearsExperience ?? 0) - (vendorsById[a.vendorProfileId]?.yearsExperience ?? 0));
      case "most_completed_events":
        return list.sort((a, b) => (vendorsById[b.vendorProfileId]?.completedEventCount ?? 0) - (vendorsById[a.vendorProfileId]?.completedEventCount ?? 0));
      case "newest":
        return list.sort((a, b) => new Date(b.submittedAt ?? b.createdAt).getTime() - new Date(a.submittedAt ?? a.createdAt).getTime());
      case "expiring_soon":
        return list.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
      case "recommended":
      default:
        // Deterministic: skill already guaranteed, then rating desc, then completed events desc, then status (submitted before shortlisted-equal).
        return list.sort((a, b) => {
          const ratingDiff = (vendorsById[b.vendorProfileId]?.averageRating ?? 0) - (vendorsById[a.vendorProfileId]?.averageRating ?? 0);
          if (ratingDiff !== 0) return ratingDiff;
          return (vendorsById[b.vendorProfileId]?.completedEventCount ?? 0) - (vendorsById[a.vendorProfileId]?.completedEventCount ?? 0);
        });
    }
  }, [proposals, sort, vendorsById]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading proposals…" />;
  }

  if (!need) {
    return <ErrorState title="Request not found" description="This vendor request may have been removed." />;
  }

  if (!user || need.organizerId !== user.id) {
    return <ErrorState title="Not authorized" description="You can only review proposals on your own vendor requests." />;
  }

  function openAcceptConfirm(proposal: VendorProposal) {
    setError(null);
    const effectiveStatus = getEffectiveProposalStatus(proposal, now);
    if (effectiveStatus === "expired") {
      setError("This bid has expired — the vendor needs to renew it before you can accept.");
      return;
    }
    setConfirmingAccept(proposal);
  }

  function confirmAccept() {
    if (!confirmingAccept) return;
    try {
      acceptProposal(confirmingAccept.id);
      setConfirmingAccept(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept this proposal.");
      setConfirmingAccept(null);
    }
  }

  function openDeclineDialog(proposal: VendorProposal) {
    setDeclineReason("");
    setDecliningProposal(proposal);
  }

  function confirmDecline() {
    if (!decliningProposal) return;
    declineProposalWithNotification(decliningProposal.id, declineReason || undefined);
    setDecliningProposal(null);
    refresh();
  }

  function handleShortlist(proposal: VendorProposal) {
    shortlistProposal(proposal.id);
    refresh();
  }

  function handleStartConversation(proposal: VendorProposal) {
    setError(null);
    try {
      const { thread } = startConversation(proposal.id);
      router.push(`/dashboard/messages/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start a conversation.");
    }
  }

  return (
    <div>
      <Link href={`/dashboard/organizer/bookings/${bookingId}/vendors`} className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to vendor requests
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{need.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {getSkillName(need.skillSlug)} · {need.positionsAvailable - need.positionsFilled} of {need.positionsAvailable} open ·{" "}
            {proposals.length} proposal{proposals.length === 1 ? "" : "s"} · Proposals due {formatDeadlineDate(need.proposalDeadline)}
          </p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass">
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-4 rounded-lg border border-wine/30 bg-wine/5 px-3.5 py-2.5 text-sm text-wine">{error}</p>}

      <div className="mt-6">
        {sorted.length === 0 ? (
          <EmptyState title="No proposals yet" description="Proposals will appear here once vendors start bidding on this request." />
        ) : (
          <ul className="space-y-4">
            {sorted.map((proposal) => {
              const vendor = vendorsById[proposal.vendorProfileId];
              const effectiveStatus = getEffectiveProposalStatus(proposal, now);
              const isActionable =
                effectiveStatus === "submitted" || effectiveStatus === "shortlisted" || effectiveStatus === "in_discussion";
              const threadId = threadIdByProposal[proposal.id];
              return (
                <li key={proposal.id} className="rounded-2xl border border-line bg-paper p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {vendor?.profilePhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
                        <img src={vendor.profilePhoto} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-dim font-display text-lg text-ink-soft">
                          {vendor?.displayName.charAt(0) ?? "?"}
                        </div>
                      )}
                      <div>
                        {vendor ? (
                          <Link href={`/vendors/${vendor.slug}`} className="font-display text-base font-semibold text-ink hover:underline">
                            {vendor.displayName}
                          </Link>
                        ) : (
                          <p className="font-display text-base font-semibold text-ink">Vendor</p>
                        )}
                        <p className="text-xs text-ink-soft">
                          {vendor?.averageRating ? `★ ${vendor.averageRating} (${vendor.reviewCount})` : "New to Foundry"}
                          {vendor && vendor.completedEventCount > 0 && ` · ${vendor.completedEventCount} Foundry events`}
                          {vendor?.location.homeCity && ` · ${vendor.location.homeCity}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-ink">${proposal.proposedAmount}</p>
                      <p className="text-xs text-ink-soft">{PRICING_MODEL_LABELS[proposal.pricingModel]}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-ink-soft">{proposal.message}</p>
                  {proposal.deliverables && (
                    <p className="mt-2 text-xs text-ink-soft">
                      <span className="font-semibold text-ink">Deliverables: </span>
                      {proposal.deliverables}
                    </p>
                  )}
                  {proposal.equipmentIncluded && (
                    <p className="mt-1 text-xs text-ink-soft">
                      <span className="font-semibold text-ink">Equipment: </span>
                      {proposal.equipmentIncluded}
                    </p>
                  )}

                  {proposal.portfolioLinkIds.length > 0 && vendor && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {vendor.portfolioLinks
                        .filter((link) => proposal.portfolioLinkIds.includes(link.id))
                        .map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-brass"
                          >
                            {link.title || link.url}
                          </a>
                        ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[effectiveStatus]}`}>
                      {PROPOSAL_STATUS_LABELS[effectiveStatus]}
                    </span>
                    <span className="text-xs text-ink-soft">{formatExpiration(proposal.expiresAt, now)}</span>
                  </div>

                  {isActionable && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                      {effectiveStatus === "submitted" && (
                        <button type="button" onClick={() => handleShortlist(proposal)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                          Shortlist
                        </button>
                      )}
                      {threadId ? (
                        <Link href={`/dashboard/messages/${threadId}`} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                          Continue conversation
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartConversation(proposal)}
                          className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim"
                        >
                          Start Conversation
                        </button>
                      )}
                      <button type="button" onClick={() => openAcceptConfirm(proposal)} className="rounded-full bg-wine px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-wine-soft">
                        Finalize Deal
                      </button>
                      <button type="button" onClick={() => openDeclineDialog(proposal)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine hover:bg-wine/5">
                        Decline
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={confirmingAccept !== null}
        onClose={() => setConfirmingAccept(null)}
        labelledBy="accept-proposal-title"
        panelClassName="w-full max-w-md p-6"
      >
        <h2 id="accept-proposal-title" className="font-display text-xl font-semibold text-ink">
          Finalize this vendor?
        </h2>
        {confirmingAccept && (
          <p className="mt-3 text-sm text-ink-soft">
            This confirms a ${confirmingAccept.proposedAmount} engagement and its deliverables, notifies the vendor,
            and closes out any other active proposals once every position for this request is filled.
            {threadIdByProposal[confirmingAccept.id] && " If you've been messaging this vendor, that conversation continues."}
            {need.positionsAvailable > 1 &&
              ` ${need.positionsAvailable - need.positionsFilled} of ${need.positionsAvailable} positions are currently open.`}
          </p>
        )}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmingAccept(null)}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmAccept}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Finalize Deal
          </button>
        </div>
      </Dialog>

      <Dialog
        open={decliningProposal !== null}
        onClose={() => setDecliningProposal(null)}
        labelledBy="decline-proposal-title"
        panelClassName="w-full max-w-md p-6"
      >
        <h2 id="decline-proposal-title" className="font-display text-xl font-semibold text-ink">
          Decline this proposal?
        </h2>
        <label className="mt-3 block text-sm font-medium text-ink">Reason (optional, shared with the vendor)</label>
        <textarea
          rows={3}
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setDecliningProposal(null)}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDecline}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Confirm decline
          </button>
        </div>
      </Dialog>
    </div>
  );
}
