"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getVendorProfileByOwnerId, updateVendorProfile } from "@/lib/vendors/profiles";
import { getPublishedEventNeeds } from "@/lib/vendors/eventNeeds";
import { getProposalsForNeed } from "@/lib/vendors/proposals";
import { isMatch, getMatchReason } from "@/lib/vendors/matching";
import { getSavedNeeds, toggleSavedNeed } from "@/lib/vendors/savedNeeds";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import { GIG_SORT_LABELS } from "@/lib/vendors/labels";
import { SERVICE_RADIUS_OPTIONS_MILES } from "@/lib/types/vendors";
import GigCard, { computeGigBadges } from "@/components/vendor/GigCard";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { EventNeedWithMatch, GigSortOption, VendorProfile, VendorSkillSlug } from "@/lib/types/vendors";

export default function VendorGigsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [allMatches, setAllMatches] = useState<EventNeedWithMatch[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<string>("");

  const [skillFilter, setSkillFilter] = useState<VendorSkillSlug | "all">("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [fewBidsOnly, setFewBidsOnly] = useState(false);
  const [budgetMin, setBudgetMin] = useState("");
  const [sort, setSort] = useState<GigSortOption>("best_match");

  const refresh = useCallback(() => {
    if (!user) return;
    const vendorProfile = getVendorProfileByOwnerId(user.id);
    setProfile(vendorProfile ?? null);

    if (vendorProfile) {
      const published = getPublishedEventNeeds();
      const nowIso = new Date().toISOString();
      setNow(nowIso);
      const withMatch: EventNeedWithMatch[] = published
        .filter((need) => isMatch(vendorProfile, need))
        .map((need) => ({
          ...need,
          matchReason: getMatchReason(vendorProfile, need),
          bidCount: getProposalsForNeed(need.id).filter((p) => p.status === "submitted" || p.status === "shortlisted" || p.status === "accepted").length,
        }));
      setAllMatches(withMatch);
      setSavedIds(new Set(getSavedNeeds(vendorProfile.id).map((s) => s.eventNeedId)));
    }
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const results = useMemo(() => {
    let list = allMatches;
    if (skillFilter !== "all") list = list.filter((n) => n.skillSlug === skillFilter);
    if (remoteOnly) list = list.filter((n) => n.locationType === "remote");
    if (savedOnly) list = list.filter((n) => savedIds.has(n.id));
    if (fewBidsOnly) list = list.filter((n) => n.bidCount < 3);
    if (budgetMin) list = list.filter((n) => (n.budgetMax ?? n.budgetMin ?? 0) >= Number(budgetMin));

    const sorted = [...list];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime());
        break;
      case "event_date":
        sorted.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        break;
      case "highest_budget":
        sorted.sort((a, b) => (b.budgetMax ?? b.budgetMin ?? 0) - (a.budgetMax ?? a.budgetMin ?? 0));
        break;
      case "fewest_bids":
        sorted.sort((a, b) => a.bidCount - b.bidCount);
        break;
      case "deadline":
        sorted.sort((a, b) => new Date(a.proposalDeadline).getTime() - new Date(b.proposalDeadline).getTime());
        break;
      case "best_match":
      default:
        sorted.sort((a, b) => a.bidCount - b.bidCount);
        break;
    }
    return sorted;
  }, [allMatches, skillFilter, remoteOnly, savedOnly, savedIds, fewBidsOnly, budgetMin, sort]);

  function handleExpandRadius() {
    if (!profile || typeof profile.location.radiusMiles !== "number") return;
    const next = SERVICE_RADIUS_OPTIONS_MILES.find((mi) => mi > profile.location.radiusMiles);
    updateVendorProfile(profile.id, {
      location: { ...profile.location, radiusMode: next ?? "anywhere", radiusMiles: next ?? profile.location.radiusMiles },
    });
    refresh();
  }

  function handleEnableRemote() {
    if (!profile) return;
    updateVendorProfile(profile.id, { location: { ...profile.location, remoteAvailable: true } });
    refresh();
  }

  if (authLoading || !loaded) {
    return <LoadingState label="Loading gigs…" />;
  }

  if (!profile) {
    return (
      <EmptyState
        title="Create a vendor profile to browse gigs"
        description="Gig matching is based on your skills and service area — set those up first."
        action={
          <Link href="/dashboard/vendor/onboarding" className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
            Create vendor profile
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Discover gigs</h1>
      <p className="mt-1 text-sm text-ink-soft">Event opportunities matching your skills and service area.</p>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value as VendorSkillSlug | "all")} className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass">
          <option value="all">All my skills</option>
          {profile.skills.map((slug) => (
            <option key={slug} value={slug}>
              {VENDOR_SKILLS.find((s) => s.slug === slug)?.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass" />
          Remote only
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass" />
          Saved
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={fewBidsOnly} onChange={(e) => setFewBidsOnly(e.target.checked)} className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass" />
          Few bids
        </label>
        <input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="Min budget" className="w-28 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass" />
        <select value={sort} onChange={(e) => setSort(e.target.value as GigSortOption)} className="ml-auto rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass">
          {Object.entries(GIG_SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((need) => (
              <GigCard
                key={need.id}
                need={need}
                saved={savedIds.has(need.id)}
                now={now}
                badges={computeGigBadges(need, new Date(now).getTime())}
                onToggleSave={() => {
                  toggleSavedNeed(profile.id, need.id);
                  refresh();
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matching gigs right now"
            description="Try expanding your search radius, enabling remote opportunities, or adding another skill."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={handleExpandRadius} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper-dim">
                  Expand search radius
                </button>
                <button type="button" onClick={handleEnableRemote} className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper-dim">
                  Enable remote opportunities
                </button>
                <Link href="/dashboard/vendor/profile/edit" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper-dim">
                  Add another skill
                </Link>
                <Link href="/dashboard/vendor/settings" className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-paper-dim">
                  Notification settings
                </Link>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
