import { hashString } from "./hash";

export interface VenueReview {
  reviewerName: string;
  rating: 4 | 5;
  quote: string;
  context: string;
}

/**
 * Dummy filler reviews, explicitly approved as a temporary exception to the
 * "no fake reviews" rule in CLAUDE.md — same pattern as
 * src/components/marketing/RecapCarousel.tsx. Only ever shown on the
 * original seed venues (never on a real user's freshly-submitted listing —
 * see VenueReviews.tsx), and selection/count below is deterministic per
 * venue id, not random, so it doesn't reshuffle on every page load.
 */
const REVIEW_POOL: VenueReview[] = [
  { reviewerName: "Priya S.", rating: 5, quote: "Exactly the vibe we wanted for our launch party. Load-in was easy and the space photographed beautifully.", context: "Brand launch" },
  { reviewerName: "Marcus T.", rating: 4, quote: "Great room for a corporate offsite. A little tight on parking, but the staff made up for it.", context: "Corporate offsite" },
  { reviewerName: "Elena R.", rating: 5, quote: "We got married here and it still feels like the best decision we made in the whole process.", context: "Wedding" },
  { reviewerName: "Dave K.", rating: 5, quote: "Booked it for a DJ set and the sound in the room is genuinely great. Would rent again in a heartbeat.", context: "DJ set" },
  { reviewerName: "Whitney L.", rating: 4, quote: "Solid space for a workshop — good natural light and enough outlets for everyone's laptops.", context: "Workshop" },
  { reviewerName: "Omar F.", rating: 5, quote: "Ran a pop-up here for a weekend and foot traffic was better than expected. Host was responsive the whole time.", context: "Pop-up" },
  { reviewerName: "Grace N.", rating: 5, quote: "Our photo shoot needed a clean backdrop and this delivered. Easy in, easy out.", context: "Photo shoot" },
  { reviewerName: "Ben A.", rating: 4, quote: "Good for a mid-size birthday party. We went a little over on guests and it still felt comfortable.", context: "Birthday party" },
  { reviewerName: "Sasha M.", rating: 5, quote: "Hosted a community meetup here twice now. Consistent, no surprises, exactly what we needed.", context: "Community gathering" },
  { reviewerName: "Tomás V.", rating: 4, quote: "Nice room for a small dinner. Kitchen access was a big plus for our caterer.", context: "Private dinner" },
  { reviewerName: "Anya P.", rating: 5, quote: "The lighting rig alone made this worth booking for our event. Guests were asking where we found it.", context: "Party" },
  { reviewerName: "Jordan H.", rating: 5, quote: "Everything was as described, check-in was smooth, and the space held up well past midnight.", context: "Late-night event" },
  { reviewerName: "Michelle O.", rating: 4, quote: "Booked for a small performance and the acoustics were better than we expected for the price.", context: "Performance" },
  { reviewerName: "Ravi D.", rating: 5, quote: "Second time booking this space for a company event — it's become our default spot.", context: "Corporate event" },
];

export function getReviewsForVenue(venueId: string, count = 3): VenueReview[] {
  const start = hashString(venueId) % REVIEW_POOL.length;
  return Array.from({ length: count }, (_, i) => REVIEW_POOL[(start + i) % REVIEW_POOL.length]);
}

/** Deterministic (not random) placeholder stat — same venue always shows the same number. */
export function getEventsDoneForVenue(venueId: string): number {
  return 8 + (hashString(`${venueId}-events`) % 55);
}
