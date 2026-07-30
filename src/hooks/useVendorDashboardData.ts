"use client";

import { useCallback, useEffect, useState } from "react";
import { getVendorProfileByOwnerId, getPublishReadiness } from "@/lib/vendors/profiles";
import { getProposalsForVendor, ensureExpiringBidNotifications } from "@/lib/vendors/proposals";
import { getEngagementsForVendor } from "@/lib/vendors/engagements";
import { getThreadsForParticipant, getUnreadMessageCount } from "@/lib/vendors/messages";
import { getUnreadCount } from "@/lib/vendors/notifications";
import type { VendorEngagement, VendorProfile, VendorProposal } from "@/lib/types/vendors";

/** A vendor's profile plus derived dashboard counts, loaded from localStorage after mount. */
export function useVendorDashboardData(ownerId: string | undefined) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [proposals, setProposals] = useState<VendorProposal[]>([]);
  const [engagements, setEngagements] = useState<VendorEngagement[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);

  const refresh = useCallback(() => {
    if (!ownerId) return;
    const found = getVendorProfileByOwnerId(ownerId);
    setProfile(found ?? null);

    if (found) {
      ensureExpiringBidNotifications(found.id);
      const vendorProposals = getProposalsForVendor(found.id);
      setProposals(vendorProposals);
      setEngagements(getEngagementsForVendor(found.id));

      // Date.now() is only read here, inside an effect-triggered callback, not during render.
      const now = Date.now();
      setExpiringSoonCount(
        vendorProposals.filter((p) => {
          if (p.status !== "submitted" && p.status !== "shortlisted") return false;
          const hoursUntil = (new Date(p.expiresAt).getTime() - now) / (60 * 60 * 1000);
          return hoursUntil > 0 && hoursUntil <= 24;
        }).length
      );
    } else {
      setProposals([]);
      setEngagements([]);
      setExpiringSoonCount(0);
    }

    const threads = getThreadsForParticipant(ownerId);
    setUnreadMessageCount(threads.reduce((sum, thread) => sum + getUnreadMessageCount(thread.id, ownerId), 0));
    setUnreadNotificationCount(getUnreadCount(ownerId));
    setLoaded(true);
  }, [ownerId]);

  useEffect(() => {
    // localStorage reads are client-only — see AuthProvider.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const activeProposals = proposals.filter((p) => p.status === "submitted" || p.status === "shortlisted");
  const confirmedUpcoming = engagements.filter((e) => e.status === "confirmed" || e.status === "in_progress");
  const readiness = profile ? getPublishReadiness(profile) : null;

  return {
    loaded,
    profile,
    proposals,
    engagements,
    activeProposalsCount: activeProposals.length,
    expiringSoonCount,
    confirmedUpcomingCount: confirmedUpcoming.length,
    unreadMessageCount,
    unreadNotificationCount,
    readiness,
    refresh,
  };
}
