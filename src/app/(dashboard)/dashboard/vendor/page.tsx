"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useVendorDashboardData } from "@/hooks/useVendorDashboardData";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { VENDOR_PROFILE_STATUS_LABELS } from "@/lib/vendors/labels";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-paper-dim text-ink-soft",
  pending_review: "bg-brass/15 text-brass-dark",
  published: "bg-green-100 text-green-800",
  rejected: "bg-wine/10 text-wine",
  suspended: "bg-wine/10 text-wine",
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-soft">{label}</p>
    </div>
  );
}

export default function VendorDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const data = useVendorDashboardData(user?.id);

  if (authLoading || !data.loaded) {
    return <LoadingState label="Loading your vendor dashboard…" />;
  }

  if (!data.profile) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Event details</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your profile status, open gigs matching your skills, and active bids will appear here.
        </p>
        <div className="mt-8">
          <EmptyState
            title="No vendor profile yet"
            description="Create a vendor profile to start browsing open event needs. Profiles are reviewed before they go public."
            action={
              <Link
                href="/dashboard/vendor/onboarding"
                className="inline-block rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Create vendor profile
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const { profile, readiness } = data;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Event details</h1>
          <p className="mt-1 text-sm text-ink-soft">Welcome back, {profile.displayName}.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[profile.status]}`}>
          {VENDOR_PROFILE_STATUS_LABELS[profile.status]}
        </span>
      </div>

      {profile.status === "rejected" && profile.rejectionReason && (
        <div className="mt-4 rounded-lg border border-wine/30 bg-wine/5 px-3.5 py-2.5 text-sm text-wine">
          Your profile was rejected: {profile.rejectionReason}.{" "}
          <Link href="/dashboard/vendor/profile/edit" className="font-semibold underline">
            Edit and resubmit
          </Link>
        </div>
      )}

      {readiness && !readiness.ready && profile.status === "draft" && (
        <div className="mt-4 rounded-lg border border-brass/30 bg-brass/5 px-3.5 py-2.5 text-sm text-ink">
          Finish your profile to publish: {readiness.missing.join(", ")}.{" "}
          <Link href="/dashboard/vendor/onboarding" className="font-semibold text-brass-dark underline">
            Continue setup
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active bids" value={data.activeProposalsCount} />
        <StatCard label="Expiring soon" value={data.expiringSoonCount} />
        <StatCard label="Confirmed gigs" value={data.confirmedUpcomingCount} />
        <StatCard label="Unread messages" value={data.unreadMessageCount} />
        <StatCard label="Average rating" value={profile.averageRating ? `${profile.averageRating} ★` : "New to Foundry"} />
        <StatCard label="Completed events" value={profile.completedEventCount} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/vendor/gigs" className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
          Browse matching gigs
        </Link>
        <Link href="/dashboard/vendor/bids" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
          View my bids
        </Link>
        <Link href="/dashboard/vendor/settings" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
          Notification preferences
        </Link>
      </div>
    </div>
  );
}
