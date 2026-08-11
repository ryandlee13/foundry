export interface Coordinates {
  lat: number;
  lng: number;
}

export type SpaceType =
  | "restaurant"
  | "warehouse"
  | "loft"
  | "rooftop"
  | "gallery"
  | "lounge"
  | "studio"
  | "private_dining"
  | "outdoor"
  | "retail";

export type EventType =
  | "party"
  | "dinner"
  | "brand_activation"
  | "corporate"
  | "workshop"
  | "photo_video_shoot"
  | "wedding"
  | "popup"
  | "performance"
  | "community_gathering";

export type AmenityKey =
  | "dj_speakers"
  | "dj_controller"
  | "sound_system"
  | "microphones"
  | "television"
  | "projector"
  | "colored_lighting"
  | "wifi"
  | "kitchen"
  | "bar"
  | "bartenders_available"
  | "security_available"
  | "tables_chairs"
  | "bathrooms"
  | "ada_accessible"
  | "outdoor_area"
  | "animal_friendly"
  | "parking"
  | "coat_check"
  | "photo_booth_area";

export interface VenueRules {
  alcoholAllowed: boolean;
  amplifiedMusicAllowed: boolean;
  outsideCateringAllowed: boolean;
  ticketedEventsAllowed: boolean;
  lateNightEventsAllowed: boolean;
  coiRequired: boolean;
  securityDepositRequired: boolean;
}

export type VenueBadge = "new" | "popular" | "nightlife";

export interface Venue {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  neighborhood: string;
  city: string;
  coordinates: Coordinates;
  spaceType: SpaceType;
  eventTypes: EventType[];
  maxCapacity: number;
  seatedCapacity: number;
  minBookingHours: number;
  minHourlyRate: number;
  maxHourlyRate: number;
  /** Symbolic image identifiers used only for the "1 / N" photo-count indicator. */
  images: string[];
  /** Two-color gradient used by VenueImagePlaceholder in place of real photography. */
  visualAccent: [string, string];
  /** Single emoji used as the placeholder art's focal icon. */
  icon: string;
  amenities: AmenityKey[];
  /** Optional per-amenity notes from the venue owner (e.g. "2 bathrooms", "fridge only, no freezer"), shown to organizers on hover. */
  amenityNotes?: Partial<Record<AmenityKey, string>>;
  rules: VenueRules;
  availabilityExamples: string[];
  badge?: VenueBadge;
  /** Account id of the venue operator who submitted this listing, or null for the seed venues ("nobody owned"). */
  ownerId: string | null;
  createdAt: string;
  /**
   * Collected at submission but never rendered on any public page or card —
   * see docs/SECURITY.md #5. Only the derived `neighborhood` above is shown
   * publicly.
   */
  exactAddress: string;
  /** Real uploaded photo data URLs (compressed client-side). Undefined for seed venues, which use the gradient placeholder instead. Minimum 7 enforced at submission. */
  photos?: string[];
  /** File names only — video bytes aren't persisted in this prototype (see VenueSubmissionForm.tsx). */
  videoNames?: string[];
  /** ISO — when this listing first went live. Undefined for listings that predate this field; readers fall back to createdAt. Never changed by an edit. */
  publishedAt?: string;
  /** ISO — last time the owner saved an edit. Undefined means never edited. */
  updatedAt?: string;
  /** "HH:mm" (24h) earliest a booking may start. Undefined = the venue hasn't stated a window. */
  earliestStartTime?: string;
  /** "HH:mm" latest a booking may end. May be numerically <= earliestStartTime, meaning the window crosses midnight (e.g. 18:00-02:00) — see computeBookingWindow() in bookingConstraints.ts. */
  latestEndTime?: string;
  /** Booking start/end times must land on this minute grid. Undefined = no increment rule. */
  bookingIncrementMinutes?: 15 | 30 | 60;
  /** When true, the owner will consider bookings shorter than minBookingHours (soft confirm, not a hard block). Undefined/false = hard block — today's behavior. */
  minBookingHoursNegotiable?: boolean;
  /** When true, the owner will consider guest counts above maxCapacity (soft confirm). Undefined/false = hard block, matching BookingPanel's existing behavior. */
  capacityNegotiable?: boolean;
}

export type BookingStatus = "pending" | "confirmed" | "declined";

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  venueSlug: string;
  organizerId: string;
  organizerName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  attendees: number;
  status: BookingStatus;
  /** Whether the organizer agreed to provide a COI, if the venue requires one. */
  coiAgreed: boolean;
  /** Whether the organizer agreed to the security deposit, if the venue requires one. */
  depositAgreed: boolean;
  /** Organizer-chosen name for this event, e.g. "Foundry Summer Social". Null falls back to a venue+date label — see formatEventLabel() in bookings.ts. */
  eventName: string | null;
  eventType: EventType | null;
  createdAt: string;
  /** Denormalized venue.ownerId at request time, so a booking can route to its host without a venue lookup; null when the venue had no owner (seed venues). Optional because bookings written before this field exists in a browser predate it — always read via getBookingVenueOwnerId(). */
  venueOwnerId?: string | null;
}

/** A venue enriched with its computed distance from the active search center. */
export interface VenueWithDistance extends Venue {
  distanceMiles: number;
}

export type SortOption = "recommended" | "price_asc" | "price_desc" | "capacity";

export const RADIUS_OPTIONS_MILES = [1, 2, 5, 10, 25] as const;
export type RadiusMiles = (typeof RADIUS_OPTIONS_MILES)[number];

export interface LocationSelection {
  label: string;
  coordinates: Coordinates;
}

export interface LocationSuggestion {
  id: string;
  label: string;
  sublabel: string;
  coordinates: Coordinates;
  kind: "neighborhood" | "zip" | "city";
}

export interface SearchFilters {
  location: LocationSelection;
  radiusMiles: number;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  attendees: number | null;
  eventTypes: EventType[];
  minPrice: number | null;
  maxPrice: number | null;
  minBookingHours: number | null;
  spaceTypes: SpaceType[];
  amenities: AmenityKey[];
  rules: Partial<Record<keyof VenueRules, boolean>>;
  sort: SortOption;
}
