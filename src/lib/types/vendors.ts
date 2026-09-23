import type { Coordinates, EventType } from "./spaces";

/**
 * The categories Foundry accepts, trimmed from an earlier 23 to the 13 worth
 * launching with. Ordered alphabetically by display name (see VENDOR_SKILLS)
 * so the source of truth reads the same way the pickers do.
 *
 * Narrowing this union is a breaking change for stored data: a profile or
 * event need written against a removed slug still holds that string in
 * localStorage. `getSkillName()` falls back to the raw slug rather than
 * throwing, so such a record degrades to showing its slug instead of
 * crashing — but re-run the dev seeders after changing this list.
 */
export type VendorSkillSlug =
  | "bartender"
  | "caterer"
  | "chef"
  | "content_creator"
  | "decorator"
  | "dj"
  | "florist"
  | "graphic_designer"
  | "lighting_technician"
  | "photo_booth"
  | "photographer"
  | "security"
  | "videographer";

export interface VendorSkillDefinition {
  slug: VendorSkillSlug;
  name: string;
  description: string;
  /** Whether this skill can reasonably be delivered without being on-site (design, editing, sponsorship, etc.). */
  remoteEligible: boolean;
  /** Placeholder shown in the service-title field. Must be specific to THIS skill — a shared example (e.g. a DJ set shown to a photographer) reads as a bug. */
  exampleServiceTitle: string;
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
  /**
   * The confirmed venue Booking this need belongs to — this prototype has no
   * separate Event entity, see CLAUDE.md.
   *
   * **Null means "not assigned to an event yet."** A planner who books a DJ
   * before they've booked a room has a real vendor engagement and no event to
   * hang it on; forcing a booking first meant that planner couldn't use Foundry
   * at all until they'd found a venue. Assigning it later (see
   * assignEngagementToBooking in spaces/eventRoom.ts) sets this on the need and
   * its engagements together, and opens the three-way room.
   */
  bookingId: string | null;
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
  /** Mirrors the parent need's bookingId — null until the organizer assigns this vendor to an event. */
  bookingId: string | null;
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
  | "terms_declined_by_vendor"
  | "event_room_opened"
  | "deal_terms_proposed"
  | "contract_sent"
  | "contract_signed";

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
  createdAt: string;
}

/**
 * The two-party thread shape. Deliberately NOT on MessageThreadBase: the event
 * room has N participants and no single "other side", and a `counterpartyId`
 * inherited by all three kinds would be read as "the other person" on a thread
 * where that question has no answer. Always resolve participants through
 * getThreadParticipantIds() in messages.ts.
 */
interface OneToOneThreadBase extends MessageThreadBase {
  /** The other participant: a vendor profile's ownerId on a proposal thread, or the venue operator's account id on a booking thread. */
  counterpartyId: string;
}

/** A conversation about a vendor proposal. Created only by the organizer, via startConversation() or finalizeDeal() (engagements.ts). */
export interface ProposalMessageThread extends OneToOneThreadBase {
  kind: "proposal";
  /** Anchors the thread — a thread exists once an organizer starts a conversation on a proposal, independent of whether it's ever finalized. */
  proposalId: string;
  eventNeedId: string;
  /** Null until finalizeDeal() finalizes this proposal and upgrades the thread in place — never a new thread is created at that point. */
  engagementId: string | null;
}

/** A conversation about a confirmed venue booking. Created only by the venue owner, via startBookingConversation() (bookingWorkflow.ts). */
export interface BookingMessageThread extends OneToOneThreadBase {
  kind: "booking";
  bookingId: string;
  venueId: string;
}

/**
 * The three-way (or more) event room: the planner, the venue operator, and
 * every vendor with a confirmed engagement on this booking, in one conversation.
 *
 * Created only by the organizer, via openEventRoom() in eventRoom.ts, and only
 * once the booking is confirmed AND at least one vendor engagement is confirmed
 * — the point at which the planner is otherwise forced into a group text off
 * Foundry. Unlike the 1:1 kinds this has no counterpartyId; `participantIds`
 * holds every non-organizer member and grows as more vendors confirm.
 */
export interface EventMessageThread extends MessageThreadBase {
  kind: "event";
  bookingId: string;
  venueId: string;
  /** Every non-organizer account in the room: the venue operator, plus each confirmed vendor's owner account. Never includes organizerId. */
  participantIds: string[];
}

export type MessageThread = ProposalMessageThread | BookingMessageThread | EventMessageThread;

export type BookingProposalKind = "revised_terms" | "deposit_request";

export type BookingProposalStatus = "sent" | "accepted" | "declined";

/**
 * A structured offer a venue owner attaches to a booking-thread message:
 * revised terms, or a deposit they're asking for.
 *
 * NOTHING HERE MOVES MONEY. Foundry has no payment integration (Phase 7,
 * docs/IMPLEMENTATION_PLAN.md) — a deposit_request is a written request that
 * the two parties settle off-platform, and every surface that renders one
 * says so. Do not rename these fields toward "paid"/"charged"/"processed",
 * and do not add a `paidAt` — that would assert a transaction that never
 * happened. Same rule as CLAUDE.md #7's "never describe something as
 * verified", applied to money.
 */
export interface BookingProposalAttachment {
  kind: BookingProposalKind;
  /** "HH:mm" — revised booking window. Both set or neither. */
  startTime: string | null;
  endTime: string | null;
  /** Revised hourly rate, in whole dollars. */
  hourlyRate: number | null;
  /** Owner's stated total for the revised window. An estimate, not an invoice. */
  estimatedTotal: number | null;
  /** Requested deposit, in whole dollars. Only meaningful for deposit_request. */
  depositAmount: number | null;
  /** "YYYY-MM-DD" — when the owner asks for the deposit by. */
  dueDate: string | null;
  note: string;
  status: BookingProposalStatus;
  /** ISO — when the organizer accepted or declined. Null while "sent". */
  respondedAt: string | null;
}

/**
 * "superseded" exists because either side can send a fresh counter while an
 * older one is still open. Without it, a stale round of terms stays acceptable
 * forever and two different sets of terms can both read as "agreed".
 */
export type DealProposalStatus = "sent" | "accepted" | "declined" | "superseded";

/**
 * A round of vendor deal terms, attached to a message on a proposal thread.
 * Either side may send one, so a planner is no longer limited to a single
 * take-it-or-leave-it edit at finalize time.
 *
 * Accepting one records agreement on the terms; it does NOT create the
 * engagement. finalizeDeal() (engagements.ts) is still the only thing that
 * does, and it reads the latest accepted round as its starting point — so the
 * back-and-forth stays a negotiation log and the commitment stays a single
 * deliberate action. No money moves here either (Phase 7).
 */
export interface DealProposalAttachment {
  amount: number;
  pricingModel: PricingModel;
  deliverables: string;
  note: string;
  /** Which side sent this round. The log renders "You proposed" vs "{name} countered" from it. */
  senderRole: "organizer" | "vendor";
  status: DealProposalStatus;
  /** ISO — when the other side accepted or declined. Null while "sent" or "superseded". */
  respondedAt: string | null;
}

export type BookingContractStatus = "sent" | "signed" | "declined" | "withdrawn";

/**
 * A formal written agreement a venue operator sends through Foundry and the
 * planner countersigns in-app, so the two of them never have to move to email
 * to paper a booking.
 *
 * NOT legal advice and NOT a claim of enforceability — same rule as AgreedTerms
 * (CLAUDE.md #7, docs/SECURITY.md). It records that both parties put their name
 * to this text on Foundry on a date. `formatContractFootnote()` carries that
 * qualification and must render with every contract. TODO(legal): real contract
 * templates and e-signature need counsel review before any real launch.
 *
 * Signatures are typed names, not cryptographic signatures, and nothing here
 * collects or moves money.
 */
export interface BookingContractAttachment {
  title: string;
  /** What the venue is providing — free text written by the operator. */
  scope: string;
  /** Whole dollars. Null when the contract states no figure. */
  totalAmount: number | null;
  depositAmount: number | null;
  /** "YYYY-MM-DD" — when the operator asks for the balance. Settled off-platform. */
  balanceDueDate: string | null;
  cancellationPolicy: string;
  additionalTerms: string;
  /** Typed full name the venue operator signed with. */
  hostSignature: string;
  hostSignedAt: string;
  /** Typed full name the planner countersigned with. Null until signed. */
  organizerSignature: string | null;
  organizerSignedAt: string | null;
  status: BookingContractStatus;
  declinedAt: string | null;
  declineReason: string | null;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readBy: string[];
  /** Present only on booking threads, and only on messages the venue owner sent. */
  proposal?: BookingProposalAttachment;
  /** Present only on proposal threads. Either side may send one — see DealProposalAttachment. */
  dealProposal?: DealProposalAttachment;
  /** Present only on booking threads, and only on messages the venue owner sent. */
  contract?: BookingContractAttachment;
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
