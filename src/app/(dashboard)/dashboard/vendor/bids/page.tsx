"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import { getProposalsForVendor, withdrawProposal, renewProposal } from "@/lib/vendors/proposals";
import { getEventNeedById } from "@/lib/vendors/eventNeeds";
import { getSkillName } from "@/lib/vendors/skills";
import { PROPOSAL_STATUS_LABELS } from "@/lib/vendors/labels";
import { formatExpiration } from "@/lib/vendors/expiration";
import { BID_EXPIRATION_DAYS } from "@/lib/types/vendors";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { BidExpirationDays, EventNeed, ProposalStatus, VendorProposal } from "@/lib/types/vendors";

const STATUS_STYLES: Record<ProposalStatus, string> = {
  draft: "bg-paper-dim text-ink-soft",
  submitted: "bg-brass/15 text-brass-dark",
  shortlisted: "bg-brass/15 text-brass-dark",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-wine/10 text-wine",
  withdrawn: "bg-paper-dim text-ink-soft",
  expired: "bg-wine/10 text-wine",
  canceled: "bg-paper-dim text-ink-soft",
};

const TABS: { key: "active" | "all"; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "all", label: "All" },
];

export default function VendorBidsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [proposals, setProposals] = useState<VendorProposal[]>([]);
  const [needsById, setNeedsById] = useState<Record<string, EventNeed>>({});
  const [tab, setTab] = useState<"active" | "all">("active");
  const [now, setNow] = useState("");

  const refresh = useCallback(() => {
    if (!user) return;
    const profile = getVendorProfileByOwnerId(user.id);
    if (!profile) {
      setLoaded(true);
      return;
    }
    const list = getProposalsForVendor(profile.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setProposals(list);
    setNow(new Date().toISOString());

    const needs: Record<string, EventNeed> = {};
    for (const p of list) {
      const need = getEventNeedById(p.eventNeedId);
      if (need) needs[p.eventNeedId] = need;
    }
    setNeedsById(needs);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading your bids…" />;
  }

  const visible = proposals.filter((p) => (tab === "active" ? p.status === "submitted" || p.status === "shortlisted" : true));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">My bids</h1>
      <p className="mt-1 text-sm text-ink-soft">Track your submitted proposals across every stage.</p>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? "border-wine text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {visible.length === 0 ? (
          <EmptyState
            title="No bids here yet"
            description="Browse Discover Gigs to find opportunities matching your skills."
            action={
              <Link href="/dashboard/vendor/gigs" className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
                Discover gigs
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((proposal) => {
              const need = needsById[proposal.eventNeedId];
              return (
                <li key={proposal.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/dashboard/vendor/gigs/${proposal.eventNeedId}`} className="font-display text-base font-semibold text-ink hover:underline">
                        {need?.title ?? "Opportunity"}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {need ? getSkillName(need.skillSlug) : ""} · ${proposal.proposedAmount} ·{" "}
                        {proposal.status === "submitted" || proposal.status === "shortlisted"
                          ? formatExpiration(proposal.expiresAt, now)
                          : `Submitted ${proposal.submittedAt?.slice(0, 10)}`}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[proposal.status]}`}>
                      {PROPOSAL_STATUS_LABELS[proposal.status]}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(proposal.status === "submitted" || proposal.status === "shortlisted") && (
                      <button
                        type="button"
                        onClick={() => {
                          withdrawProposal(proposal.id);
                          refresh();
                        }}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine hover:bg-wine/5"
                      >
                        Withdraw
                      </button>
                    )}
                    {proposal.status === "expired" && (
                      <button
                        type="button"
                        onClick={() => {
                          renewProposal(proposal.id, BID_EXPIRATION_DAYS[1] as BidExpirationDays);
                          refresh();
                        }}
                        className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim"
                      >
                        Renew
                      </button>
                    )}
                    {proposal.status === "accepted" && (
                      <Link href="/dashboard/vendor/confirmed" className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                        View confirmed gig
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
