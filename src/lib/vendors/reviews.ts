import type { ReviewRating, VendorEngagement, VendorReview } from "@/lib/types/vendors";
import { getEngagementById } from "./engagements";
import { getVendorProfileById, updateVendorProfile } from "./profiles";
import { createNotification } from "./notifications";

export interface ReviewEligibility {
  allowed: boolean;
  reason: string | null;
}

/**
 * Pure predicate (no storage access) for whether an organizer may review a
 * given engagement — requires a completed engagement, the requesting
 * organizer to be the one on the engagement, and no existing review for it.
 */
export function checkReviewEligibility(
  engagement: Pick<VendorEngagement, "status" | "organizerId"> | undefined,
  requestingOrganizerId: string,
  existingReview: VendorReview | undefined
): ReviewEligibility {
  if (!engagement) return { allowed: false, reason: "Engagement not found." };
  if (engagement.status !== "completed") return { allowed: false, reason: "A review requires a completed engagement." };
  if (engagement.organizerId !== requestingOrganizerId) {
    return { allowed: false, reason: "Only the organizer on this engagement may review it." };
  }
  if (existingReview) return { allowed: false, reason: "This engagement already has a review." };
  return { allowed: true, reason: null };
}

/** Pure: average of published reviews' overallRating, rounded to 1 decimal, or null when there are none. */
export function computeAverageRating(
  reviews: Pick<VendorReview, "overallRating" | "status">[]
): { average: number | null; count: number } {
  const published = reviews.filter((review) => review.status === "published");
  if (published.length === 0) return { average: null, count: 0 };
  const sum = published.reduce((total, review) => total + review.overallRating, 0);
  return { average: Math.round((sum / published.length) * 10) / 10, count: published.length };
}

/**
 * Browser-local vendor reviews. Unlike src/lib/spaces/reviews.ts (which
 * generates deterministic fake filler for seed venues), these are real
 * organizer-submitted reviews tied to a completed engagement — no fake
 * vendor reviews are generated here, per CLAUDE.md's rule that the
 * VenueReviews fake-content exception isn't a blanket license to extend.
 */
const REVIEWS_KEY = "foundry.vendors.reviews";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getAll(): VendorReview[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(REVIEWS_KEY);
    return raw ? (JSON.parse(raw) as VendorReview[]) : [];
  } catch {
    return [];
  }
}

function saveAll(reviews: VendorReview[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
}

export function getReviewById(id: string): VendorReview | undefined {
  return getAll().find((review) => review.id === id);
}

export function getReviewForEngagement(engagementId: string): VendorReview | undefined {
  return getAll().find((review) => review.engagementId === engagementId);
}

export function getPublishedReviewsForVendor(vendorProfileId: string): VendorReview[] {
  return getAll()
    .filter((review) => review.vendorProfileId === vendorProfileId && review.status === "published")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAllReviewsForVendor(vendorProfileId: string): VendorReview[] {
  return getAll().filter((review) => review.vendorProfileId === vendorProfileId);
}

function recomputeVendorRating(vendorProfileId: string): void {
  const profile = getVendorProfileById(vendorProfileId);
  if (!profile) return;
  const { average, count } = computeAverageRating(getAllReviewsForVendor(vendorProfileId));
  updateVendorProfile(vendorProfileId, { averageRating: average, reviewCount: count });
}

export function createReview(input: {
  engagementId: string;
  organizerId: string;
  vendorProfileId: string;
  overallRating: ReviewRating;
  qualityRating?: ReviewRating;
  communicationRating?: ReviewRating;
  reliabilityRating?: ReviewRating;
  professionalismRating?: ReviewRating;
  valueRating?: ReviewRating;
  reviewText: string;
  wouldWorkWithAgain: boolean;
}): VendorReview {
  const engagement = getEngagementById(input.engagementId);
  const eligibility = checkReviewEligibility(engagement, input.organizerId, getReviewForEngagement(input.engagementId));
  if (!eligibility.allowed) throw new Error(eligibility.reason ?? "Not eligible to review.");

  const now = new Date().toISOString();
  const review: VendorReview = {
    id: crypto.randomUUID(),
    engagementId: input.engagementId,
    organizerId: input.organizerId,
    vendorProfileId: input.vendorProfileId,
    overallRating: input.overallRating,
    qualityRating: input.qualityRating ?? null,
    communicationRating: input.communicationRating ?? null,
    reliabilityRating: input.reliabilityRating ?? null,
    professionalismRating: input.professionalismRating ?? null,
    valueRating: input.valueRating ?? null,
    reviewText: input.reviewText.trim(),
    wouldWorkWithAgain: input.wouldWorkWithAgain,
    vendorResponse: null,
    status: "published",
    flaggedReason: null,
    createdAt: now,
    updatedAt: now,
  };
  saveAll([...getAll(), review]);
  recomputeVendorRating(input.vendorProfileId);

  const vendorProfile = getVendorProfileById(input.vendorProfileId);
  if (vendorProfile) {
    createNotification({
      recipientId: vendorProfile.ownerId,
      type: "review_received",
      title: "You received a review",
      body: `An organizer left you a ${input.overallRating}-star review.`,
      link: "/dashboard/vendor/reviews",
    });
  }

  return review;
}

function updateReviewRaw(id: string, patch: Partial<VendorReview>): VendorReview | undefined {
  const reviews = getAll();
  const index = reviews.findIndex((review) => review.id === id);
  if (index === -1) return undefined;
  const updated: VendorReview = { ...reviews[index], ...patch, id: reviews[index].id, updatedAt: new Date().toISOString() };
  const next = [...reviews];
  next[index] = updated;
  saveAll(next);
  return updated;
}

/** Vendors may leave exactly one public professional response; may not edit the organizer's review itself. */
export function addVendorResponse(reviewId: string, response: string): VendorReview | undefined {
  const updated = updateReviewRaw(reviewId, { vendorResponse: response.trim() });
  if (updated) {
    createNotification({
      recipientId: updated.organizerId,
      type: "vendor_responded_review",
      title: "Vendor responded to your review",
      body: "A vendor posted a public response to your review.",
      link: "/dashboard/organizer",
    });
  }
  return updated;
}

export function flagReview(reviewId: string, reason: string): VendorReview | undefined {
  return updateReviewRaw(reviewId, { status: "flagged", flaggedReason: reason.trim() });
}

export function hideReview(reviewId: string): VendorReview | undefined {
  const review = updateReviewRaw(reviewId, { status: "hidden" });
  if (review) recomputeVendorRating(review.vendorProfileId);
  return review;
}

export function removeReview(reviewId: string): VendorReview | undefined {
  const review = updateReviewRaw(reviewId, { status: "removed" });
  if (review) recomputeVendorRating(review.vendorProfileId);
  return review;
}

export function restoreReview(reviewId: string): VendorReview | undefined {
  const review = updateReviewRaw(reviewId, { status: "published" });
  if (review) recomputeVendorRating(review.vendorProfileId);
  return review;
}
