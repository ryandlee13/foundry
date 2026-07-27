import { getEventsDoneForVenue, getReviewsForVenue } from "@/lib/spaces/reviews";

/**
 * Dummy filler content, explicitly approved as a temporary exception to the
 * "no fake reviews" rule in CLAUDE.md (see CLAUDE.md → "Local-prototype
 * layer" and the RecapCarousel precedent). Only ever rendered for seed
 * venues (ownerId === null) — see VenueDetailView.tsx — never on a real
 * user's freshly-submitted listing, which would be actively misleading.
 */
export default function VenueReviews({ venueId }: { venueId: string }) {
  const eventsDone = getEventsDoneForVenue(venueId);
  const reviews = getReviewsForVenue(venueId);

  return (
    <div className="mt-10 border-t border-line pt-8">
      <p className="text-sm text-ink-soft">
        <span className="font-display text-xl font-semibold text-ink">{eventsDone}</span>{" "}
        events hosted through Foundry
      </p>

      <div className="mt-5 space-y-4">
        {reviews.map((review, index) => (
          <div key={index} className="rounded-xl border border-line bg-paper p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{review.reviewerName}</p>
              <span className="text-xs text-brass-dark" aria-label={`${review.rating} out of 5 stars`}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">{review.context}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">&ldquo;{review.quote}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}
