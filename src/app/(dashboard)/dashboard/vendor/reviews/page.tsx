"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getVendorProfileByOwnerId } from "@/lib/vendors/profiles";
import { getAllReviewsForVendor, addVendorResponse, flagReview } from "@/lib/vendors/reviews";
import { getPortfolioItemsForVendor, setPortfolioItemVisibility } from "@/lib/vendors/eventPortfolio";
import { REVIEW_STATUS_LABELS } from "@/lib/vendors/labels";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { VendorEventPortfolioItem, VendorProfile, VendorReview } from "@/lib/types/vendors";

function ReviewCard({ review, onRespond, onFlag }: { review: VendorReview; onRespond: (text: string) => void; onFlag: (reason: string) => void }) {
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  return (
    <li className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{"★".repeat(review.overallRating)}</p>
        {review.status !== "published" && (
          <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-semibold text-ink-soft">{REVIEW_STATUS_LABELS[review.status]}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{review.reviewText}</p>
      <p className="mt-1 text-xs text-ink-soft">{new Date(review.createdAt).toLocaleDateString()}</p>

      {review.vendorResponse ? (
        <p className="mt-3 rounded-lg bg-paper-dim px-3 py-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Your response: </span>
          {review.vendorResponse}
        </p>
      ) : responding ? (
        <div className="mt-3">
          <textarea
            rows={2}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Write a public response…"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setResponding(false)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onRespond(responseText);
                setResponding(false);
              }}
              className="rounded-full bg-wine px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-wine-soft"
            >
              Post response
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setResponding(true)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
            Respond
          </button>
          {review.status === "published" && !flagging && (
            <button type="button" onClick={() => setFlagging(true)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-wine hover:bg-wine/5">
              Flag for review
            </button>
          )}
        </div>
      )}

      {flagging && (
        <div className="mt-3">
          <input
            type="text"
            value={flagReason}
            onChange={(e) => setFlagReason(e.target.value)}
            placeholder="Why should this be reviewed by an admin?"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setFlagging(false)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onFlag(flagReason);
                setFlagging(false);
              }}
              className="rounded-full bg-wine px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-wine-soft"
            >
              Submit flag
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function VendorReviewsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<VendorEventPortfolioItem[]>([]);

  const refresh = useCallback(() => {
    if (!user) return;
    const vendorProfile = getVendorProfileByOwnerId(user.id);
    setProfile(vendorProfile ?? null);
    if (vendorProfile) {
      setReviews(getAllReviewsForVendor(vendorProfile.id));
      setPortfolioItems(getPortfolioItemsForVendor(vendorProfile.id));
    }
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading reviews…" />;
  }

  if (!profile) {
    return <EmptyState title="No vendor profile yet" description="Create a vendor profile to start receiving reviews." />;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Reviews</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {profile.averageRating ? `★ ${profile.averageRating} average across ${profile.reviewCount} review${profile.reviewCount === 1 ? "" : "s"}` : "New to Foundry — no reviews yet."}
      </p>

      <div className="mt-8">
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" description="Reviews appear here once an organizer reviews a completed engagement." />
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onRespond={(text) => {
                  addVendorResponse(review.id, text);
                  refresh();
                }}
                onFlag={(reason) => {
                  flagReview(review.id, reason);
                  refresh();
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {portfolioItems.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-ink">Foundry event history</h2>
          <p className="text-sm text-ink-soft">Choose which completed events show on your public profile.</p>
          <ul className="mt-3 space-y-2">
            {portfolioItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{item.displayTitle}</p>
                  <p className="text-xs text-ink-soft">{new Date(item.eventDate).toLocaleDateString()}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={item.displayPublicly}
                    onChange={(e) => {
                      setPortfolioItemVisibility(item.id, e.target.checked);
                      refresh();
                    }}
                    className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                  />
                  Show publicly
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
