"use client";

import Link from "next/link";
import { getSkillName } from "@/lib/vendors/skills";
import { PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import type { VendorProfile } from "@/lib/types/vendors";

const PUBLIC_STATUSES = ["published"];

/**
 * The vendor's own profile at a glance: who organizers see, whether they can
 * see it at all, and the services being offered. Visibility is a real toggle
 * (published <-> draft), but only for profiles the vendor actually controls —
 * a rejected or suspended profile shows its moderation state instead, since
 * flipping out of one isn't the vendor's call.
 */
export default function VendorProfileSummary({
  profile,
  canToggleVisibility,
  onToggleVisibility,
}: {
  profile: VendorProfile;
  canToggleVisibility: boolean;
  onToggleVisibility: () => void;
}) {
  const isPublic = PUBLIC_STATUSES.includes(profile.status);

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {profile.profilePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
            <img src={profile.profilePhoto} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-paper-dim font-display text-xl text-ink-soft">
              {profile.displayName.charAt(0) || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink">{profile.displayName}</p>
            <p className="text-xs text-ink-soft">
              {profile.location.remoteOnly ? "Remote only" : profile.location.homeCity || "San Francisco"}
            </p>
            <span
              className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isPublic ? "bg-brass/15 text-brass-dark" : "bg-paper-dim text-ink-soft"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? "bg-brass-dark" : "bg-ink-soft"}`} />
              {isPublic ? "Public" : profile.status === "draft" ? "Private" : "Under review"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/dashboard/vendor/onboarding"
            className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Edit profile
          </Link>
          {canToggleVisibility && (
            <button
              type="button"
              onClick={onToggleVisibility}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
            >
              {isPublic ? "Make private" : "Make public"}
            </button>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        {isPublic
          ? "Your profile is listed on Discover Vendors — organizers and venue owners can find and contact you."
          : "Your profile is hidden from Discover Vendors. Make it public to start getting requests."}
      </p>

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Services you provide</p>
        {profile.services.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No services listed yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {profile.services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-paper-dim px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {service.title || getSkillName(service.skillSlug)}
                  </p>
                  <p className="truncate text-xs text-ink-soft">{getSkillName(service.skillSlug)}</p>
                </div>
                <p className="shrink-0 text-xs text-ink-soft">
                  {service.pricingModel === "contact_for_quote" || service.startingPrice === null
                    ? PRICING_MODEL_LABELS[service.pricingModel]
                    : `From $${service.startingPrice} · ${PRICING_MODEL_LABELS[service.pricingModel]}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
