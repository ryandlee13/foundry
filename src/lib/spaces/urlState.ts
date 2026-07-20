import { DEFAULT_LOCATION, DEFAULT_RADIUS_MILES } from "./locations";
import { AMENITY_LABELS, EVENT_TYPE_LABELS, RULE_LABELS, SPACE_TYPE_LABELS } from "./labels";
import type {
  AmenityKey,
  EventType,
  SearchFilters,
  SortOption,
  SpaceType,
  VenueRules,
} from "@/lib/types/spaces";

const SORT_OPTIONS: SortOption[] = ["recommended", "price_asc", "price_desc", "capacity"];
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];
const SPACE_TYPES = Object.keys(SPACE_TYPE_LABELS) as SpaceType[];
const AMENITIES = Object.keys(AMENITY_LABELS) as AmenityKey[];
const RULE_KEYS = Object.keys(RULE_LABELS) as (keyof VenueRules)[];

export function getDefaultFilters(): SearchFilters {
  return {
    location: { label: DEFAULT_LOCATION.label, coordinates: DEFAULT_LOCATION.coordinates },
    radiusMiles: DEFAULT_RADIUS_MILES,
    eventDate: null,
    startTime: null,
    endTime: null,
    attendees: null,
    eventTypes: [],
    minPrice: null,
    maxPrice: null,
    minBookingHours: null,
    spaceTypes: [],
    amenities: [],
    rules: {},
    sort: "recommended",
  };
}

function parseCsv<T extends string>(value: string | null, allowed: T[]): T[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is T => (allowed as string[]).includes(item));
}

function parseNumber(value: string | null): number | null {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  params.set("location", filters.location.label);
  params.set("lat", filters.location.coordinates.lat.toString());
  params.set("lng", filters.location.coordinates.lng.toString());
  params.set("radius", filters.radiusMiles.toString());
  if (filters.sort !== "recommended") params.set("sort", filters.sort);
  if (filters.eventDate) params.set("date", filters.eventDate);
  if (filters.startTime) params.set("start", filters.startTime);
  if (filters.endTime) params.set("end", filters.endTime);
  if (filters.attendees !== null) params.set("attendees", filters.attendees.toString());
  if (filters.eventTypes.length) params.set("eventType", filters.eventTypes.join(","));
  if (filters.minPrice !== null) params.set("minPrice", filters.minPrice.toString());
  if (filters.maxPrice !== null) params.set("maxPrice", filters.maxPrice.toString());
  if (filters.minBookingHours !== null)
    params.set("minHours", filters.minBookingHours.toString());
  if (filters.spaceTypes.length) params.set("spaceType", filters.spaceTypes.join(","));
  if (filters.amenities.length) params.set("amenities", filters.amenities.join(","));

  const activeRules = Object.entries(filters.rules)
    .filter(([, value]) => value)
    .map(([key]) => key);
  if (activeRules.length) params.set("rules", activeRules.join(","));

  return params;
}

export function searchParamsToFilters(params: URLSearchParams): SearchFilters {
  const defaults = getDefaultFilters();

  const lat = parseNumber(params.get("lat"));
  const lng = parseNumber(params.get("lng"));
  const location =
    lat !== null && lng !== null
      ? { label: params.get("location") ?? defaults.location.label, coordinates: { lat, lng } }
      : defaults.location;

  const radius = parseNumber(params.get("radius"));
  const sort = params.get("sort");

  const rules: Partial<Record<keyof VenueRules, boolean>> = {};
  for (const key of parseCsv(params.get("rules"), RULE_KEYS)) {
    rules[key] = true;
  }

  return {
    location,
    radiusMiles: radius !== null && radius > 0 ? radius : defaults.radiusMiles,
    eventDate: params.get("date"),
    startTime: params.get("start"),
    endTime: params.get("end"),
    attendees: parseNumber(params.get("attendees")),
    eventTypes: parseCsv(params.get("eventType"), EVENT_TYPES),
    minPrice: parseNumber(params.get("minPrice")),
    maxPrice: parseNumber(params.get("maxPrice")),
    minBookingHours: parseNumber(params.get("minHours")),
    spaceTypes: parseCsv(params.get("spaceType"), SPACE_TYPES),
    amenities: parseCsv(params.get("amenities"), AMENITIES),
    rules,
    sort: SORT_OPTIONS.includes(sort as SortOption) ? (sort as SortOption) : defaults.sort,
  };
}
