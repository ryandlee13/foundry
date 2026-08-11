import type { Coordinates, EventType } from "./spaces";

export type VendorSkillSlug =
  | "dj"
  | "photographer"
  | "videographer"
  | "graphic_designer"
  | "event_producer"
  | "chef"
  | "caterer"
  | "bartender"
  | "security"
  | "sound_engineer"
  | "lighting_technician"
  | "decorator"
  | "florist"
  | "furniture_rental"
  | "equipment_rental"
  | "influencer"
  | "content_creator"
  | "sponsor"
  | "brand_activation_agency"
  | "photo_booth"
  | "performer"
  | "instructor"
  | "other";

export interface VendorSkillDefinition {
  slug: VendorSkillSlug;
  name: string;
  description: string;
  /** Whether this skill can reasonably be delivered without being on-site (design, editing, sponsorship, etc.). */
  remoteEligible: boolean;
}

export type PricingModel = "hourly" | "flat_fee" | "day_rate" | "package" | "contact_for_quote";

export type ExperienceLevel = "new" | "intermediate" | "experienced" | "veteran";

export interface VendorService {
  id: string;
  skillSlug: VendorSkillSlug;
  title: string;
  description: string;
  pricingModel: PricingModel;
  /** Null when pricingModel is "contact_for_quote" or the vendor chose not to set one yet. */
  startingPrice: number | null;
  /** When false, the price is for internal/organizer-request context only, never rendered publicly. */
  pricingVisible: boolean;
  equipmentIncluded: string;
  experienceLevel: ExperienceLevel;
  eventTypesServed: EventType[];
}

export type PortfolioProvider =
  | "website"
  | "soundcloud"
  | "mixcloud"
  | "spotify"
  | "youtube"
  | "vimeo"
  | "instagram"
  | "tiktok"
  | "behance"
  | "dribbble"
  | "google_drive"
  | "other";

export interface PortfolioLink {
  id: string;
  url: string;
  title: string;
  provider: PortfolioProvider;
  description: string;
  displayOrder: number;
}

/** Numeric mile options, or the two special modes the onboarding flow offers. */
export const SERVICE_RADIUS_OPTIONS_MILES = [5, 10, 25, 50, 100] as const;
export type ServiceRadiusMode = "anywhere" | "custom" | (typeof SERVICE_RADIUS_OPTIONS_MILES)[number];

export interface VendorLocation {
  homeCity: string;
  homeRegion: string;
  homePostalCode: string;
  coordinates: Coordinates;
  radiusMode: ServiceRadiusMode;
  /** Effective numeric radius used by matching logic; ignored (treated as infinite) when radiusMode is "anywhere". */
  radiusMiles: number;
  willingToTravel: boolean;
  remoteAvailable: boolean;
  /** True when this vendor works SOLELY remotely — only offerable when every selected skill is remote-eligible (see canOfferRemoteOnly in remoteEligibility.ts). When true, matching ignores physical radius entirely. */
  remoteOnly: boolean;
  /**
   * Physical street address the service radius is measured from. Same
   * never-public rule as venues.exactAddress (docs/SECURITY.md #5) — only
   * the derived homeCity/coordinates are ever shown publicly.
   */
  serviceAddress: string;
  citiesServed: string[];
  typicalAvailability: string;
  leadTimeDays: number;
}

export type NotificationCategory =
  | "matching_gigs"
  | "selected_locations"
  | "remote_gigs"
  | "bid_accepted"
  | "bid_declined"
  | "bid_expiring"
  | "new_message"
  | "event_updated"
  | "event_canceled"
  | "review_received";

export type MatchScope = "home_area" | "selected_cities" | "remote" | "all";

export interface VendorNotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  skillSlugs: VendorSkillSlug[];
  matchScope: MatchScope;
}

export type VendorProfileStatus = "draft" | "pending_review" | "published" | "rejected" | "suspended";

export interface VendorProfile {
  id: string;
  ownerId: string;
  slug: string;
  firstName: string;
  lastName: string;
  displayName: string;
  profilePhoto: string | null;
  coverImage: string | null;
  professionalDescription: string;
  yearsExperience: number;
  websiteUrl: string;
  instagramUrl: string;
  skills: VendorSkillSlug[];
  services: VendorService[];
  portfolioLinks: PortfolioLink[];
  location: VendorLocation;
  notificationPreferences: VendorNotificationPreferences;
  status: VendorProfileStatus;
  rejectionReason: string | null;
  averageRating: number | null;
  reviewCount: number;
  completedEventCount: number;
  createdAt: string;
  updatedAt: string;
}

export type LocationType = "in_person" | "remote";

export type EventNeedStatus = "draft" | "published" | "paused" | "filled" | "closed" | "canceled";

/**
 * Derived, presentation-only phase for a need — computed from its stored
 * EventNeedStatus plus its proposals' statuses (see computeEventNeedPhase in
 * eventNeeds.ts). Never stored; the underlying EventNeedStatus stays the
 * source of truth.
 */
export type EventNeedPhase =
  | "not_started"
  | "accepting_proposals"
  | "reviewing_bids"
  | "in_discussion"
  | "finalized"
  | "closed"
  | "canceled";

export interface EventNeed {
  id: string;
  /** Anchors this need to a confirmed venue Booking — this prototype has no separate Event entity, see CLAUDE.md. */
  bookingId: string;
  organizerId: string;
  skillSlug: VendorSkillSlug;
  title: string;
  description: string;
  deliverables: string;
  locationType: LocationType;
  publicLocation: string;
  coordinates: Coordinates;
  eventDate: string;
  startTime: string;
  endTime: string;
  setupTime: string | null;
  estimatedAttendance: number | null;
  positionsAvailable: number;
  positionsFilled: number;
  budgetMin: number | null;
  budgetMax: number | null;
  preferredPricingModel: PricingModel | null;
  equipmentRequirements: string;
  experiencePreference: ExperienceLevel | null;
  portfolioRequired: boolean;
  proposalDeadline: string;
  allowQuestions: boolean;
  additionalNotes: string;
  status: EventNeedStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const BID_EXPIRATION_DAYS = [1, 3, 5, 7] as const;
export type BidExpirationDays = (typeof BID_EXPIRATION_DAYS)[number];

export type ProposalStatus =
  | "draft"
  | "submitted"
  | "shortlisted"
  | "in_discussion"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired"
  | "canceled"
  | "closed_opportunity_filled";

export interface VendorProposal {
  id: string;
  eventNeedId: string;
  vendorProfileId: string;
  proposedAmount: number;
  pricingModel: PricingModel;
  message: string;
  deliverables: string;
  equipmentIncluded: string;
  availabilityConfirmed: boolean;
  setupRequirements: string;
  portfolioLinkIds: string[];
  questionsForOrganizer: string;
  expiresAt: string;
  status: ProposalStatus;
  declineReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedEventNeed {
  id: string;
  vendorProfileId: string;
  eventNeedId: string;
  createdAt: string;
}

export type EngagementStatus =
  | "pending_vendor_confirmation"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "declined_by_vendor"
  | "canceled_by_organizer"
  | "canceled_by_vendor"
  | "disputed";

/**
 * The locked terms record both parties confirm. Wording is deliberately a
 * firm mutual commitment, NOT a claim of legal enforceability — see CLAUDE.md
 * rule #7 and docs/SECURITY.md. TODO(legal): real contract language needs
 * counsel review before any real launch.
 */
export interface AgreedTerms {
  amount: number;
  pricingModel: PricingModel;
  deliverables: string;
  /** True when the organizer changed anything from the vendor's original proposal ("Edit deal terms" vs "Finalize as proposed"). */
  editedFromProposal: boolean;
  /** ISO — when the organizer locked these terms and sent them for confirmation. */
  proposedByOrganizerAt: string;
  /** ISO — when the vendor accepted. Null until then. Never modified afterwards. */
  confirmedByVendorAt: string | null;
  declinedByVendorAt: string | null;
  declineReason: string | null;
}

export interface VendorEngagement {
  id: string;
  eventNeedId: string;
  bookingId: string;
  organizerId: string;
  vendorProfileId: string;
  acceptedProposalId: string;
  agreedAmount: number;
  pricingModel: PricingModel;
  agreedDeliverables: string;
  status: EngagementStatus;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Optional so engagements already in a tester's localStorage keep working — finalizeDeal() always sets it going forward. agreedAmount/pricingModel/agreedDeliverables stay mirrored so existing readers need no change. */
  terms?: AgreedTerms;
}

export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReviewStatus = "published" | "hidden" | "flagged" | "removed";

export interface VendorReview {
  id: string;
  engagementId: string;
  organizerId: string;
  vendorProfileId: string;
  overallRating: ReviewRating;
  qualityRating: ReviewRating | null;
  communicationRating: ReviewRating | null;
  reliabilityRating: ReviewRating | null;
  professionalismRating: ReviewRating | null;
  valueRating: ReviewRating | null;
  reviewText: string;
  wouldWorkWithAgain: boolean;
  vendorResponse: string | null;
  status: ReviewStatus;
  flaggedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorEventPortfolioItem {
  id: string;
  vendorProfileId: string;
  engagementId: string;
  displayPublicly: boolean;
  displayTitle: string;
  displayDescription: string;
  eventDate: string;
  skillSlug: VendorSkillSlug;
  createdAt: string;
}

export type NotificationType =
  | "new_matching_gig"
  | "bid_shortlisted"
  | "bid_accepted"
  | "bid_declined"
  | "bid_expiring"
  | "new_message"
  | "event_updated"
  | "event_canceled"
  | "review_received"
  | "new_proposal"
  | "vendor_withdrew"
  | "vendor_marked_complete"
  | "vendor_canceled"
  | "vendor_responded_review"
  | "conversation_started"
  | "opportunity_filled"
  | "proposal_updated"
  | "venue_booking_requested"
  | "venue_booking_accepted"
  | "venue_booking_declined"
  | "terms_confirmed_by_vendor"
  | "terms_declined_by_vendor";

export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

interface MessageThreadBase {
  id: string;
  organizerId: string;
  /** The other participant: a vendor profile's ownerId on a proposal thread, or the venue operator's account id on a booking thread. */
  counterpartyId: string;
  createdAt: string;
}

/** A conversation about a vendor proposal. Created only by the organizer, via startConversation() or finalizeDeal() (engagements.ts). */
export interface ProposalMessageThread extends MessageThreadBase {
  kind: "proposal";
  /** Anchors the thread — a thread exists once an organizer starts a conversation on a proposal, independent of whether it's ever finalized. */
  proposalId: string;
  eventNeedId: string;
  /** Null until finalizeDeal() finalizes this proposal and upgrades the thread in place — never a new thread is created at that point. */
  engagementId: string | null;
}

/** A conversation about a confirmed venue booking. Created only by the venue owner, via startBookingConversation() (bookingWorkflow.ts). */
export interface BookingMessageThread extends MessageThreadBase {
  kind: "booking";
  bookingId: string;
  venueId: string;
}

export type MessageThread = ProposalMessageThread | BookingMessageThread;

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readBy: string[];
}

export interface VendorGigFilters {
  skills: VendorSkillSlug[];
  remoteOnly: boolean;
  radiusMiles: number | null;
  eventDate: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  savedOnly: boolean;
  fewBidsOnly: boolean;
  sort: GigSortOption;
}

export type GigSortOption = "best_match" | "newest" | "event_date" | "highest_budget" | "fewest_bids" | "deadline";

export interface EventNeedWithMatch extends EventNeed {
  matchReason: string | null;
  bidCount: number;
  /** Resolved once from the parent Booking — see formatNeedEventLabel() in eventNeeds.ts. */
  eventLabel: string;
  eventType: EventType | null;
}
