"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { getEngagementById } from "@/lib/vendors/engagements";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { createReview, getReviewForEngagement } from "@/lib/vendors/reviews";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import SuccessState from "@/components/ui/SuccessState";
import type { ReviewRating } from "@/lib/types/vendors";

const CATEGORIES: { key: "qualityRating" | "communicationRating" | "reliabilityRating" | "professionalismRating" | "valueRating"; label: string }[] = [
  { key: "qualityRating", label: "Quality" },
  { key: "communicationRating", label: "Communication" },
  { key: "reliabilityRating", label: "Reliability" },
  { key: "professionalismRating", label: "Professionalism" },
  { key: "valueRating", label: "Value" },
];

function StarPicker({ value, onChange }: { value: number; onChange: (value: ReviewRating) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n as ReviewRating)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className={`text-2xl ${n <= value ? "text-brass-dark" : "text-line"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function OrganizerReviewForm({ engagementId }: { engagementId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [overallRating, setOverallRating] = useState<ReviewRating>(5);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, ReviewRating>>({});
  const [reviewText, setReviewText] = useState("");
  const [wouldWorkWithAgain, setWouldWorkWithAgain] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) return <LoadingState label="Loading…" />;
  if (!user) return null;

  const engagement = getEngagementById(engagementId);
  const vendorProfile = engagement ? getVendorProfileById(engagement.vendorProfileId) : null;
  const existingReview = getReviewForEngagement(engagementId);

  if (!engagement || !vendorProfile) {
    return <ErrorState title="Engagement not found" />;
  }

  if (engagement.organizerId !== user.id) {
    return <ErrorState title="Not authorized" description="You can only review your own engagements." />;
  }

  if (existingReview || submitted) {
    return (
      <SuccessState
        title="Review submitted"
        description={`Thanks for reviewing ${vendorProfile.displayName}.`}
        action={
          <Link href="/dashboard/organizer" className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
            Back to dashboard
          </Link>
        }
      />
    );
  }

  if (engagement.status !== "completed") {
    return <ErrorState title="Not yet reviewable" description="A review can only be left after the engagement is marked complete." />;
  }

  function handleSubmit() {
    try {
      createReview({
        engagementId,
        organizerId: user!.id,
        vendorProfileId: engagement!.vendorProfileId,
        overallRating,
        qualityRating: categoryRatings.qualityRating,
        communicationRating: categoryRatings.communicationRating,
        reliabilityRating: categoryRatings.reliabilityRating,
        professionalismRating: categoryRatings.professionalismRating,
        valueRating: categoryRatings.valueRating,
        reviewText,
        wouldWorkWithAgain,
      });
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit review.");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-ink">Review {vendorProfile.displayName}</h1>
      <p className="mt-1 text-sm text-ink-soft">${engagement.agreedAmount} engagement, completed.</p>

      <div className="mt-6 rounded-2xl border border-line bg-paper p-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-ink">Overall rating</p>
          <div className="mt-1.5">
            <StarPicker value={overallRating} onChange={setOverallRating} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map(({ key, label }) => (
            <div key={key}>
              <p className="text-xs font-medium text-ink">{label}</p>
              <div className="mt-1">
                <StarPicker
                  value={categoryRatings[key] ?? 0}
                  onChange={(v) => setCategoryRatings((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Written review</label>
          <textarea
            rows={4}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-ink">Would you work with them again?</p>
          <div className="mt-1.5 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" checked={wouldWorkWithAgain} onChange={() => setWouldWorkWithAgain(true)} className="h-4 w-4 border-line text-wine focus:ring-1 focus:ring-brass" />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="radio" checked={!wouldWorkWithAgain} onChange={() => setWouldWorkWithAgain(false)} className="h-4 w-4 border-line text-wine focus:ring-1 focus:ring-brass" />
              No
            </label>
          </div>
        </div>

        {error && <p className="text-xs text-wine">{error}</p>}

        <button type="button" onClick={handleSubmit} className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
          Submit review
        </button>
      </div>
    </div>
  );
}
