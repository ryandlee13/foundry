import type {
  EngagementStatus,
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
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
  expired: "Expired",
  canceled: "Canceled",
};

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
