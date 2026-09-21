import type {
  AmenityKey,
  BookingStatus,
  EventType,
  SpaceType,
  SortOption,
  VenueRules,
} from "@/lib/types/spaces";

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  restaurant: "Restaurant",
  warehouse: "Warehouse",
  loft: "Loft",
  rooftop: "Rooftop",
  gallery: "Gallery",
  lounge: "Lounge",
  studio: "Studio",
  private_dining: "Private dining room",
  outdoor: "Outdoor space",
  retail: "Retail space",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  party: "Party",
  dinner: "Dinner",
  brand_activation: "Brand activation",
  corporate: "Corporate event",
  workshop: "Workshop",
  photo_video_shoot: "Photo or video shoot",
  wedding: "Wedding-related event",
  popup: "Pop-up",
  performance: "Performance",
  community_gathering: "Community gathering",
};

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  dj_speakers: "DJ speakers",
  dj_controller: "DJ controller",
  sound_system: "Sound system",
  microphones: "Microphones",
  television: "Television",
  projector: "Projector",
  colored_lighting: "Colored lighting",
  wifi: "Wi-Fi",
  kitchen: "Kitchen",
  bar: "Bar",
  bartenders_available: "Bartenders available",
  security_available: "Security available",
  tables_chairs: "Tables and chairs",
  bathrooms: "Bathrooms",
  ada_accessible: "ADA accessible",
  outdoor_area: "Outdoor area",
  animal_friendly: "Animal friendly",
  parking: "Parking",
  coat_check: "Coat check",
  photo_booth_area: "Photo booth area",
};

export const AMENITY_ICONS: Record<AmenityKey, string> = {
  dj_speakers: "🔊",
  dj_controller: "🎛️",
  sound_system: "🎚️",
  microphones: "🎤",
  television: "📺",
  projector: "📽️",
  colored_lighting: "💡",
  wifi: "📶",
  kitchen: "🍳",
  bar: "🍸",
  bartenders_available: "🧑‍🍳",
  security_available: "🛡️",
  tables_chairs: "🪑",
  bathrooms: "🚻",
  ada_accessible: "♿",
  outdoor_area: "🌤️",
  animal_friendly: "🐾",
  parking: "🅿️",
  coat_check: "🧥",
  photo_booth_area: "🖼️",
};

/** Amenity [key, label] pairs sorted alphabetically by label, for any UI that lists them. */
export const AMENITY_ENTRIES_ALPHABETICAL = (
  Object.entries(AMENITY_LABELS) as [AmenityKey, string][]
).sort(([, a], [, b]) => a.localeCompare(b));

/**
 * Amenities that describe how people get into and move around a space, rather
 * than equipment the space provides. They're filtered alongside the venue
 * rules under "Access & policies" — a planner checking ADA access is asking
 * the same kind of question as one checking whether alcohol is allowed, and
 * burying that among DJ gear made it easy to miss.
 */
export const ACCESS_AMENITY_KEYS: AmenityKey[] = ["ada_accessible", "parking", "animal_friendly"];

/** The physical/equipment amenities — everything not in ACCESS_AMENITY_KEYS. */
export const PHYSICAL_AMENITY_ENTRIES = AMENITY_ENTRIES_ALPHABETICAL.filter(
  ([key]) => !ACCESS_AMENITY_KEYS.includes(key)
);

export const ACCESS_AMENITY_ENTRIES = AMENITY_ENTRIES_ALPHABETICAL.filter(([key]) =>
  ACCESS_AMENITY_KEYS.includes(key)
);

/**
 * Which options surface before "Show more" in each filter section.
 *
 * Deliberately a fixed curated order rather than "whatever currently has the
 * most results": counts shift every time a filter changes, and a list that
 * reorders under the cursor is much harder to scan than a slightly
 * suboptimal stable one.
 */
export const SPACE_TYPE_PRIORITY: SpaceType[] = [
  "loft",
  "rooftop",
  "restaurant",
  "gallery",
  "warehouse",
];

export const AMENITY_PRIORITY: AmenityKey[] = [
  "wifi",
  "sound_system",
  "bar",
  "kitchen",
  "tables_chairs",
];

/** Mixed keys — the Access & policies section draws from both amenities and rules. */
export const ACCESS_PRIORITY: string[] = [
  "ada_accessible",
  "parking",
  "alcoholAllowed",
  "amplifiedMusicAllowed",
  "lateNightEventsAllowed",
];

/** Sorts `entries` so anything named in `priority` comes first, in that order. */
export function orderByPriority<T extends string>(
  entries: [T, string][],
  priority: readonly string[]
): [T, string][] {
  const rank = (key: T) => {
    const index = priority.indexOf(key);
    return index === -1 ? priority.length : index;
  };
  return [...entries].sort((a, b) => rank(a[0]) - rank(b[0]));
}

export const RULE_LABELS: Record<keyof VenueRules, string> = {
  alcoholAllowed: "Alcohol allowed (+21 only)",
  amplifiedMusicAllowed: "Amplified music allowed",
  outsideCateringAllowed: "Outside catering allowed",
  ticketedEventsAllowed: "Ticketed events allowed",
  lateNightEventsAllowed: "Late-night events allowed",
  coiRequired: "Certificate of Insurance required",
  securityDepositRequired: "Security deposit required",
};

export const SORT_LABELS: Record<SortOption, string> = {
  recommended: "Recommended",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  capacity: "Capacity",
};

export const BADGE_LABELS: Record<string, string> = {
  new: "New",
  popular: "Popular",
  nightlife: "Great for nightlife",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
};
