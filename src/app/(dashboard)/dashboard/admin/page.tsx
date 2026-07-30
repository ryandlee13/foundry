"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  getPendingVendorProfiles,
  getVendorProfiles,
  approveVendorProfile,
  rejectVendorProfile,
  suspendVendorProfile,
} from "@/lib/vendors/profiles";
import { getEventNeeds, cancelEventNeed } from "@/lib/vendors/eventNeeds";
import { getAuditLog, logAdminAction } from "@/lib/vendors/adminAudit";
import { getAllReviewsForVendor, hideReview, restoreReview, removeReview } from "@/lib/vendors/reviews";
import { EVENT_NEED_STATUS_LABELS } from "@/lib/vendors/labels";
import Dialog from "@/components/ui/Dialog";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import type { AdminAuditLogEntry } from "@/lib/vendors/adminAudit";
import type { EventNeed, VendorProfile, VendorReview } from "@/lib/types/vendors";

type Tab = "vendors" | "needs" | "reviews" | "audit";
type ReasonAction = { kind: "reject" | "suspend"; profile: VendorProfile } | null;

function getAllFlaggedReviews(vendorProfiles: VendorProfile[]): VendorReview[] {
  return vendorProfiles.flatMap((profile) => getAllReviewsForVendor(profile.id)).filter((review) => review.status === "flagged");
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("vendors");
  const [pendingVendors, setPendingVendors] = useState<VendorProfile[]>([]);
  const [allVendors, setAllVendors] = useState<VendorProfile[]>([]);
  const [needs, setNeeds] = useState<EventNeed[]>([]);
  const [flaggedReviews, setFlaggedReviews] = useState<VendorReview[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>([]);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [reasonText, setReasonText] = useState("");

  const refresh = useCallback(() => {
    const vendors = getVendorProfiles();
    setAllVendors(vendors);
    setPendingVendors(getPendingVendorProfiles());
    setNeeds(getEventNeeds());
    setFlaggedReviews(getAllFlaggedReviews(vendors));
    setAuditLog(getAuditLog());
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading admin dashboard…" />;
  }

  if (!user || !user.roles.includes("admin")) {
    return (
      <ErrorState
        title="Admin access required"
        description="This dashboard is restricted to accounts with the admin role."
      />
    );
  }

  function handleApproveVendor(profile: VendorProfile) {
    approveVendorProfile(profile.id);
    logAdminAction({ adminId: user!.id, action: "vendor_profile.approved", targetTable: "vendor_profiles", targetId: profile.id });
    refresh();
  }

  function openReasonDialog(kind: "reject" | "suspend", profile: VendorProfile) {
    setReasonText("");
    setReasonAction({ kind, profile });
  }

  function confirmReasonAction() {
    if (!reasonAction || !reasonText.trim()) return;
    const { kind, profile } = reasonAction;
    if (kind === "reject") {
      rejectVendorProfile(profile.id, reasonText);
      logAdminAction({ adminId: user!.id, action: "vendor_profile.rejected", targetTable: "vendor_profiles", targetId: profile.id, metadata: { reason: reasonText } });
    } else {
      suspendVendorProfile(profile.id, reasonText);
      logAdminAction({ adminId: user!.id, action: "vendor_profile.suspended", targetTable: "vendor_profiles", targetId: profile.id, metadata: { reason: reasonText } });
    }
    setReasonAction(null);
    refresh();
  }

  function handleCancelNeed(need: EventNeed) {
    cancelEventNeed(need.id);
    logAdminAction({ adminId: user!.id, action: "event_need.canceled", targetTable: "event_needs", targetId: need.id });
    refresh();
  }

  function handleHideReview(review: VendorReview) {
    hideReview(review.id);
    logAdminAction({ adminId: user!.id, action: "review.hidden", targetTable: "vendor_reviews", targetId: review.id });
    refresh();
  }

  function handleRestoreReview(review: VendorReview) {
    restoreReview(review.id);
    logAdminAction({ adminId: user!.id, action: "review.restored", targetTable: "vendor_reviews", targetId: review.id });
    refresh();
  }

  function handleRemoveReview(review: VendorReview) {
    removeReview(review.id);
    logAdminAction({ adminId: user!.id, action: "review.removed", targetTable: "vendor_reviews", targetId: review.id });
    refresh();
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "vendors", label: "Vendor profiles", count: pendingVendors.length },
    { key: "needs", label: "Event needs" },
    { key: "reviews", label: "Flagged reviews", count: flaggedReviews.length },
    { key: "audit", label: "Audit log" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Admin dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">Approval queue, moderation, and platform activity.</p>

      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? "border-wine text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            {!!t.count && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[10px] font-bold text-paper">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "vendors" && (
        <div className="mt-6">
          {pendingVendors.length === 0 ? (
            <EmptyState title="Nothing pending review" description="Submitted vendor profiles will show up here." />
          ) : (
            <ul className="space-y-3">
              {pendingVendors.map((profile) => (
                <li key={profile.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <p className="font-display text-base font-semibold text-ink">{profile.displayName}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {profile.skills.length} skill{profile.skills.length === 1 ? "" : "s"} · {profile.portfolioLinks.length} portfolio link
                    {profile.portfolioLinks.length === 1 ? "" : "s"} · {profile.location.homeCity}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{profile.professionalDescription}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => handleApproveVendor(profile)} className="rounded-full bg-wine px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-wine-soft">
                      Approve
                    </button>
                    <button type="button" onClick={() => openReasonDialog("reject", profile)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine hover:bg-wine/5">
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {allVendors.filter((v) => v.status === "published").length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-base font-semibold text-ink">Published profiles</h2>
              <ul className="mt-3 space-y-2">
                {allVendors
                  .filter((v) => v.status === "published")
                  .map((profile) => (
                    <li key={profile.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5">
                      <span className="text-sm text-ink">{profile.displayName}</span>
                      <button type="button" onClick={() => openReasonDialog("suspend", profile)} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-wine hover:bg-wine/5">
                        Suspend
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "needs" && (
        <div className="mt-6">
          {needs.length === 0 ? (
            <EmptyState title="No event needs yet" description="Vendor requests posted by organizers will show up here." />
          ) : (
            <ul className="space-y-2">
              {needs.map((need) => (
                <li key={need.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5">
                  <div>
                    <p className="text-sm text-ink">{need.title}</p>
                    <p className="text-xs text-ink-soft">{EVENT_NEED_STATUS_LABELS[need.status]}</p>
                  </div>
                  {need.status !== "canceled" && (
                    <button type="button" onClick={() => handleCancelNeed(need)} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-wine hover:bg-wine/5">
                      Cancel
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "reviews" && (
        <div className="mt-6">
          {flaggedReviews.length === 0 ? (
            <EmptyState title="No flagged reviews" description="Reviews flagged by vendors for admin attention will show up here." />
          ) : (
            <ul className="space-y-3">
              {flaggedReviews.map((review) => (
                <li key={review.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <p className="text-sm font-semibold text-ink">{"★".repeat(review.overallRating)}</p>
                  <p className="mt-1 text-sm text-ink-soft">{review.reviewText}</p>
                  {review.flaggedReason && <p className="mt-1 text-xs text-wine">Flagged: {review.flaggedReason}</p>}
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => handleRemoveReview(review)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine hover:bg-wine/5">
                      Remove
                    </button>
                    <button type="button" onClick={() => handleHideReview(review)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                      Hide
                    </button>
                    <button type="button" onClick={() => handleRestoreReview(review)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                      Keep published
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="mt-6">
          {auditLog.length === 0 ? (
            <EmptyState title="No admin actions yet" description="Actions taken from this dashboard are logged here." />
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
              {auditLog.map((entry) => (
                <li key={entry.id} className="px-5 py-3 text-sm text-ink-soft">
                  <span className="font-medium text-ink">{entry.action}</span> on {entry.targetTable} ·{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog open={reasonAction !== null} onClose={() => setReasonAction(null)} labelledBy="reason-dialog-title" panelClassName="w-full max-w-md p-6">
        <h2 id="reason-dialog-title" className="font-display text-xl font-semibold text-ink">
          {reasonAction?.kind === "reject" ? "Reject this profile" : "Suspend this profile"}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{reasonAction?.profile.displayName}</p>
        <label className="mt-3 block text-sm font-medium text-ink">Reason (shown to the vendor)</label>
        <textarea
          rows={3}
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => setReasonAction(null)} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
            Cancel
          </button>
          <button
            type="button"
            disabled={!reasonText.trim()}
            onClick={confirmReasonAction}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </Dialog>
    </div>
  );
}
