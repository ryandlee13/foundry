import type {
  EngagementStatus,
  EventNeedPhase,
  EventNeedStatus,
  ExperienceLevel,
  GigSortOption,
  MatchScope,
  NotificationCategory,
  PortfolioProvider,
  PricingModel,
  ProposalStatus,
  ReviewStatus,
  VendorProfileStatus,
  VendorSkillSlug,
} from "@/lib/types/vendors";

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  hourly: "Hourly",
  flat_fee: "Flat fee",
  day_rate: "Day rate",
  package: "Package",
  contact_for_quote: "Contact for quote",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  new: "New to Foundry",
  intermediate: "A few events under their belt",
  experienced: "Experienced",
  veteran: "Veteran",
};

export const PORTFOLIO_PROVIDER_LABELS: Record<PortfolioProvider, string> = {
  website: "Website",
  soundcloud: "SoundCloud",
  mixcloud: "Mixcloud",
  spotify: "Spotify",
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  tiktok: "TikTok",
  behance: "Behance",
  dribbble: "Dribbble",
  google_drive: "Google Drive",
  other: "Link",
};

export const VENDOR_PROFILE_STATUS_LABELS: Record<VendorProfileStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const EVENT_NEED_STATUS_LABELS: Record<EventNeedStatus, string> = {
  draft: "Draft",
  published: "Published",
  paused: "Paused",
  filled: "Filled",
  closed: "Closed",
  canceled: "Canceled",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  shortlisted: "Shortlisted",
  in_discussion: "In discussion",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  canceled: "Canceled",
  closed_opportunity_filled: "Opportunity filled",
};

export const EVENT_NEED_PHASE_LABELS: Record<EventNeedPhase, string> = {
  not_started: "Not started",
  accepting_proposals: "Accepting proposals",
  reviewing_bids: "Reviewing bids",
  in_discussion: "In discussion",
  finalized: "Finalized",
  closed: "Closed",
  canceled: "Canceled",
};

/** Category-specific placeholder text for the "What are you looking for?" field. Generic fallback for anything not listed. */
export const EVENT_NEED_DESCRIPTION_PLACEHOLDERS: Partial<Record<VendorSkillSlug, string>> = {
  dj: "A DJ who specializes in house music and can bring their own controller.",
  florist: "A florist who can create arrangements primarily using red and white roses.",
  photographer: "Looking for someone comfortable shooting nightlife and flash photography.",
  videographer: "Looking for a videographer to capture highlights and a short recap reel.",
  graphic_designer: "Looking for a designer to create a flyer and Instagram assets.",
  chef: "A private chef who can design a plated menu for a seated dinner.",
  caterer: "A caterer who can serve passed appetizers for a standing reception.",
  bartender: "A bartender who can build a signature cocktail menu for the night.",
  influencer: "A local influencer who can help promote the event to their following.",
  content_creator: "A content creator to shoot short-form video throughout the night.",
  photo_booth: "A photo booth with a fun prop selection and instant prints.",
  performer: "An entertainer who can work the room and keep guests engaged.",
  sponsor: "A brand looking to sponsor food, drinks, or swag for the night.",
  lighting_technician: "Someone who can design ambient and dance-floor lighting.",
  sound_engineer: "A sound engineer to run live audio for performers and speeches.",
  security: "Licensed security staff for a late-night event with 100+ guests.",
  event_producer: "An event producer to help run the show from load-in to breakdown.",
  decorator: "A decorator who can bring a cohesive look to the space.",
};

export const GENERIC_EVENT_NEED_DESCRIPTION_PLACEHOLDER = "Describe what you're looking for — style, vibe, must-haves.";

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  canceled_by_organizer: "Canceled by organizer",
  canceled_by_vendor: "Canceled by vendor",
  disputed: "Disputed",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  published: "Published",
  hidden: "Hidden",
  flagged: "Flagged",
  removed: "Removed",
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  matching_gigs: "New matching event opportunities",
  selected_locations: "New opportunities in selected locations",
  remote_gigs: "New remote opportunities",
  bid_accepted: "Bid accepted",
  bid_declined: "Bid declined",
  bid_expiring: "Bid expiring soon",
  new_message: "New message",
  event_updated: "Event details updated",
  event_canceled: "Event canceled",
  review_received: "Review received",
};

export const MATCH_SCOPE_LABELS: Record<MatchScope, string> = {
  home_area: "Home service area only",
  selected_cities: "Selected cities",
  remote: "Remote opportunities",
  all: "All matching opportunities",
};

export const GIG_SORT_LABELS: Record<GigSortOption, string> = {
  best_match: "Best match",
  newest: "Newest",
  event_date: "Event date",
  highest_budget: "Highest budget",
  fewest_bids: "Fewest bids",
  deadline: "Deadline approaching",
};
