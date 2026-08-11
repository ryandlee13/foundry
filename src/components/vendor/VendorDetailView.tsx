"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import { PRICING_MODEL_LABELS, EXPERIENCE_LEVEL_LABELS } from "@/lib/vendors/labels";
import { PORTFOLIO_PROVIDER_LABELS } from "@/lib/vendors/labels";
import { getPublishedReviewsForVendor } from "@/lib/vendors/reviews";
import { getPublicPortfolioItemsForVendor } from "@/lib/vendors/eventPortfolio";
import { toSafeExternalUrl, formatExternalUrlLabel } from "@/lib/vendors/portfolioLinks";
import { EVENT_TYPE_LABELS } from "@/lib/spaces/labels";
import type { VendorProfile } from "@/lib/types/vendors";

function formatServicePrice(service: VendorProfile["services"][number]): string | null {
  if (service.pricingModel === "contact_for_quote" || !service.pricingVisible || service.startingPrice === null) {
    return null;
  }
  const suffix = service.pricingModel === "hourly" ? "/hr" : service.pricingModel === "day_rate" ? "/day" : "";
  return `From $${service.startingPrice}${suffix}`;
}

export default function VendorDetailView({ vendor }: { vendor: VendorProfile }) {
  const { user } = useAuth();
  const reviews = getPublishedReviewsForVendor(vendor.id);
  const portfolioEvents = getPublicPortfolioItemsForVendor(vendor.id);
  const requestHref = user?.roles.includes("organizer") ? "/dashboard/organizer" : "/sign-up?role=organizer";

  return (
    <>
      <div className="relative h-56 w-full overflow-hidden rounded-2xl sm:h-72">
        {vendor.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
          <img src={vendor.coverImage} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brass/25 to-wine/15" />
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4">
            {vendor.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
              <img src={vendor.profilePhoto} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-dim font-display text-2xl text-ink-soft">
                {vendor.displayName.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{vendor.displayName}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                {vendor.location.homeCity || "San Francisco"}
                {vendor.location.remoteAvailable && " · Remote available"}
              </p>
            </div>
          </div>

          <p className="mt-6 text-base leading-relaxed text-ink-soft">{vendor.professionalDescription}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {vendor.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft">
                {VENDOR_SKILLS.find((s) => s.slug === skill)?.name}
              </span>
            ))}
          </div>

          {(toSafeExternalUrl(vendor.websiteUrl) || toSafeExternalUrl(vendor.instagramUrl)) && (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {toSafeExternalUrl(vendor.websiteUrl) && (
                <a
                  href={vendor.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-brass-dark hover:underline"
                >
                  {formatExternalUrlLabel(vendor.websiteUrl)}
                </a>
              )}
              {toSafeExternalUrl(vendor.instagramUrl) && (
                <a
                  href={vendor.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-brass-dark hover:underline"
                >
                  {formatExternalUrlLabel(vendor.instagramUrl)}
                </a>
              )}
            </div>
          )}

          {vendor.services.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Services</h2>
              <div className="mt-3 space-y-4">
                {vendor.services.map((service) => {
                  const price = formatServicePrice(service);
                  return (
                    <div key={service.id} className="rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-ink">
                          {service.title || VENDOR_SKILLS.find((s) => s.slug === service.skillSlug)?.name}
                        </p>
                        <span className="shrink-0 text-sm font-semibold text-ink">
                          {price ?? PRICING_MODEL_LABELS[service.pricingModel]}
                        </span>
                      </div>
                      {service.description && <p className="mt-1.5 text-sm text-ink-soft">{service.description}</p>}
                      <p className="mt-2 text-xs text-ink-soft">
                        {EXPERIENCE_LEVEL_LABELS[service.experienceLevel]}
                        {service.eventTypesServed.length > 0 &&
                          ` · ${service.eventTypesServed.map((t) => EVENT_TYPE_LABELS[t]).join(", ")}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {vendor.portfolioLinks.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Portfolio</h2>
              <ul className="mt-3 space-y-2">
                {vendor.portfolioLinks
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5 text-sm hover:border-brass"
                      >
                        <span className="min-w-0 truncate text-ink">{link.title || link.url}</span>
                        <span className="shrink-0 text-xs text-ink-soft">{PORTFOLIO_PROVIDER_LABELS[link.provider]}</span>
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {portfolioEvents.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Foundry events</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {portfolioEvents.map((item) => (
                  <li key={item.id}>
                    {item.displayTitle} — {new Date(item.eventDate).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">Reviews</h2>
            {vendor.averageRating ? (
              <p className="mt-1 text-sm text-ink-soft">
                ★ {vendor.averageRating} · {vendor.reviewCount} review{vendor.reviewCount === 1 ? "" : "s"}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">New to Foundry — no reviews yet.</p>
            )}
            {reviews.length > 0 && (
              <ul className="mt-4 space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <li key={review.id} className="rounded-xl border border-line p-4">
                    <p className="text-sm font-semibold text-ink">{"★".repeat(review.overallRating)}</p>
                    <p className="mt-1.5 text-sm text-ink-soft">{review.reviewText}</p>
                    {review.vendorResponse && (
                      <p className="mt-2 rounded-lg bg-paper-dim px-3 py-2 text-xs text-ink-soft">
                        <span className="font-semibold text-ink">Vendor response: </span>
                        {review.vendorResponse}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-8 rounded-2xl border border-line bg-paper p-5">
            <p className="font-display text-lg font-semibold text-ink">Work with {vendor.displayName}</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Post an event need on your dashboard and invite this vendor to submit a proposal.
            </p>
            <Link
              href={requestHref}
              className="mt-4 block w-full rounded-full bg-wine px-5 py-2.5 text-center text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Request this vendor
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
