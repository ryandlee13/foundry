"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { findAccountById } from "@/lib/auth/storage";
import { getEventNeedById, formatNeedEventLabel } from "@/lib/vendors/eventNeeds";
import { getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import { getProposalsForNeed, getActiveProposal, withdrawProposal, renewProposal } from "@/lib/vendors/proposals";
import { getThreadForProposal } from "@/lib/vendors/messages";
import { computeCompetitiveBidSummary } from "@/lib/vendors/matching";
import { getBookingById } from "@/lib/spaces/bookings";
import { getSkillName } from "@/lib/vendors/skills";
import { EXPERIENCE_LEVEL_LABELS, PRICING_MODEL_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/vendors/labels";
import { formatExpiration, formatDeadlineDate, computeExpiresAt } from "@/lib/vendors/expiration";
import Dialog from "@/components/ui/Dialog";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import BidForm from "./BidForm";
import type { EventNeed, VendorProfile, VendorProposal } from "@/lib/types/vendors";

function formatBudget(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Contact for quote";
  if (min !== null && max !== null) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

const PROPOSAL_STATUS_STYLES: Record<string, string> = {
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

export default function GigDetailPage({ needId }: { needId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [need, setNeed] = useState<EventNeed | null>(null);
  const [eventLabel, setEventLabel] = useState("");
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [myProposal, setMyProposal] = useState<VendorProposal | null>(null);
  const [myThreadId, setMyThreadId] = useState<string | null>(null);
  const [bidForm, setBidForm] = useState<"none" | "new" | "edit">("none");
  const [now, setNow] = useState("");

  const refresh = useCallback(() => {
    const found = getEventNeedById(needId);
    setNeed(found ?? null);
    setNow(new Date().toISOString());
    if (found) {
      const booking = getBookingById(found.bookingId);
      setEventLabel(formatNeedEventLabel(found, booking?.eventName ?? null));
    }

    if (user) {
      const vendorProfile = getVendorProfileByOwnerId(user.id);
      setProfile(vendorProfile ?? null);
      if (vendorProfile && found) {
        const proposal = getActiveProposal(vendorProfile.id, found.id) ?? null;
        setMyProposal(proposal);
        setMyThreadId(proposal ? (getThreadForProposal(proposal.id)?.id ?? null) : null);
      }
    }
    setLoaded(true);
  }, [needId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading opportunity…" />;
  }

  if (!need) {
    return <ErrorState title="Opportunity not found" description="This request may have been closed or removed." />;
  }

  const organizer = findAccountById(need.organizerId);
  const proposals = getProposalsForNeed(need.id);
  const bidSummary = computeCompetitiveBidSummary(proposals);
  const hasSubmittedBid = Boolean(myProposal);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/vendor/gigs" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to Discover Gigs
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-paper p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{eventLabel}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-brass-dark">{getSkillName(need.skillSlug)}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink sm:text-3xl">{need.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {need.locationType === "remote" ? "Remote" : need.publicLocation} · Posted by{" "}
          {organizer ? organizer.name.split(" ")[0] : "an organizer"}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{need.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ink-soft">Date</dt>
            <dd className="font-medium text-ink">{need.eventDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Time</dt>
            <dd className="font-medium text-ink">
              {need.startTime}–{need.endTime}
            </dd>
          </div>
          {need.setupTime && (
            <div>
              <dt className="text-xs text-ink-soft">Setup</dt>
              <dd className="font-medium text-ink">{need.setupTime}</dd>
            </div>
          )}
          {need.estimatedAttendance !== null && (
            <div>
              <dt className="text-xs text-ink-soft">Attendance</dt>
              <dd className="font-medium text-ink">{need.estimatedAttendance} guests</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-ink-soft">Budget</dt>
            <dd className="font-medium text-ink">{formatBudget(need.budgetMin, need.budgetMax)}</dd>
          </div>
          {need.preferredPricingModel && (
            <div>
              <dt className="text-xs text-ink-soft">Preferred pricing</dt>
              <dd className="font-medium text-ink">{PRICING_MODEL_LABELS[need.preferredPricingModel]}</dd>
            </div>
          )}
          {need.experiencePreference && (
            <div>
              <dt className="text-xs text-ink-soft">Experience preferred</dt>
              <dd className="font-medium text-ink">{EXPERIENCE_LEVEL_LABELS[need.experiencePreference]}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-ink-soft">Positions</dt>
            <dd className="font-medium text-ink">
              {need.positionsAvailable - need.positionsFilled} of {need.positionsAvailable} open
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-soft">Proposal deadline</dt>
            <dd className="font-medium text-ink">
              {formatDeadlineDate(need.proposalDeadline)} ({formatExpiration(need.proposalDeadline, now)})
            </dd>
          </div>
        </dl>

        {need.deliverables && (
          <div className="mt-6">
            <h2 className="font-display text-base font-semibold text-ink">Deliverables</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{need.deliverables}</p>
          </div>
        )}

        {need.equipmentRequirements && (
          <div className="mt-4">
            <h2 className="font-display text-base font-semibold text-ink">Equipment requirements</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{need.equipmentRequirements}</p>
          </div>
        )}

        {need.additionalNotes && (
          <div className="mt-4">
            <h2 className="font-display text-base font-semibold text-ink">Additional notes</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{need.additionalNotes}</p>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-line bg-paper-dim p-4">
          <p className="text-sm font-semibold text-ink">
            {bidSummary.totalBids} bid{bidSummary.totalBids === 1 ? "" : "s"} submitted · {need.positionsAvailable} position
            {need.positionsAvailable === 1 ? "" : "s"} available
          </p>
          {hasSubmittedBid && bidSummary.totalBids > 0 && (
            <div className="mt-2 text-xs text-ink-soft">
              <p>Anonymized market summary, now that you&apos;ve bid:</p>
              <ul className="mt-1 space-y-0.5">
                {bidSummary.lowestActiveAmount !== null && <li>Lowest active bid: ${bidSummary.lowestActiveAmount}</li>}
                {bidSummary.highestActiveAmount !== null && <li>Highest active bid: ${bidSummary.highestActiveAmount}</li>}
                {bidSummary.medianActiveAmount !== null && <li>Median active bid: ${bidSummary.medianActiveAmount}</li>}
                {bidSummary.pricingModelsRepresented.length > 0 && (
                  <li>Pricing models: {bidSummary.pricingModelsRepresented.map((m) => PRICING_MODEL_LABELS[m]).join(", ")}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6">
          {!profile ? (
            <p className="text-sm text-ink-soft">
              <Link href="/dashboard/vendor/onboarding" className="font-semibold text-brass-dark underline">
                Create a vendor profile
              </Link>{" "}
              to place a bid.
            </p>
          ) : myProposal ? (
            <div className="rounded-xl border border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PROPOSAL_STATUS_STYLES[myProposal.status] ?? ""}`}>
                  {PROPOSAL_STATUS_LABELS[myProposal.status]}
                </span>
                <span className="text-sm font-semibold text-ink">${myProposal.proposedAmount}</span>
              </div>
              {myProposal.status === "in_discussion" && (
                <p className="mt-2 text-sm text-ink-soft">
                  The organizer wants to discuss further before deciding.
                  {myThreadId && (
                    <>
                      {" "}
                      <Link href={`/dashboard/messages/${myThreadId}`} className="font-semibold text-brass-dark underline">
                        Check your messages
                      </Link>
                      .
                    </>
                  )}
                </p>
              )}
              {myProposal.status === "closed_opportunity_filled" && (
                <p className="mt-2 text-sm text-ink-soft">This opportunity was filled by another vendor.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {(myProposal.status === "submitted" || myProposal.status === "shortlisted" || myProposal.status === "in_discussion") && (
                  <>
                    <button type="button" onClick={() => setBidForm("edit")} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                      Edit bid
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        withdrawProposal(myProposal.id);
                        refresh();
                      }}
                      className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine hover:bg-wine/5"
                    >
                      Withdraw
                    </button>
                  </>
                )}
                {myProposal.status === "expired" && (
                  <button
                    type="button"
                    onClick={() => {
                      renewProposal(myProposal.id, computeExpiresAt(new Date().toISOString(), 5));
                      refresh();
                    }}
                    className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim"
                  >
                    Renew bid
                  </button>
                )}
              </div>
            </div>
          ) : need.status === "published" && need.positionsFilled < need.positionsAvailable ? (
            <button type="button" onClick={() => setBidForm("new")} className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft sm:w-auto">
              Place a Bid
            </button>
          ) : (
            <p className="text-sm text-ink-soft">This opportunity is no longer accepting bids.</p>
          )}
        </div>
      </div>

      <Dialog open={bidForm !== "none"} onClose={() => setBidForm("none")} labelledBy="bid-form-title" panelClassName="w-full max-w-xl p-6 sm:p-8">
        <h2 id="bid-form-title" className="font-display text-xl font-semibold text-ink">
          {bidForm === "edit" ? "Edit your bid" : "Place a bid"}
        </h2>
        <div className="mt-4">
          {profile && (
            <BidForm
              need={need}
              vendorProfileId={profile.id}
              portfolioLinks={profile.portfolioLinks}
              existingProposal={bidForm === "edit" && myProposal ? myProposal : undefined}
              onSubmitted={() => {
                setBidForm("none");
                refresh();
              }}
              onCancel={() => setBidForm("none")}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
}
