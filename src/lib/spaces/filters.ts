import { haversineDistanceMiles } from "./distance";
import type {
  AmenityKey,
  Coordinates,
  EventType,
  SearchFilters,
  SpaceType,
  Venue,
  VenueRules,
  VenueWithDistance,
} from "@/lib/types/spaces";

export function withDistance(venues: Venue[], center: Coordinates): VenueWithDistance[] {
  return venues.map((venue) => ({
    ...venue,
    distanceMiles: haversineDistanceMiles(center, venue.coordinates),
  }));
}

export function filterByRadius<T extends VenueWithDistance>(
  venues: T[],
  radiusMiles: number
): T[] {
  return venues.filter((venue) => venue.distanceMiles <= radiusMiles);
}

export function filterByCapacity<T extends Venue>(venues: T[], attendees: number | null): T[] {
  if (attendees === null || attendees <= 0) return venues;
  return venues.filter((venue) => venue.maxCapacity >= attendees);
}

export function filterByPrice<T extends Venue>(
  venues: T[],
  minPrice: number | null,
  maxPrice: number | null
): T[] {
  return venues.filter((venue) => {
    if (minPrice !== null && venue.maxHourlyRate < minPrice) return false;
    if (maxPrice !== null && venue.minHourlyRate > maxPrice) return false;
    return true;
  });
}

export function filterByMinBookingHours<T extends Venue>(
  venues: T[],
  maxAcceptableMinHours: number | null
): T[] {
  if (maxAcceptableMinHours === null) return venues;
  return venues.filter((venue) => venue.minBookingHours <= maxAcceptableMinHours);
}

export function filterBySpaceTypes<T extends Venue>(venues: T[], types: SpaceType[]): T[] {
  if (types.length === 0) return venues;
  return venues.filter((venue) => types.includes(venue.spaceType));
}

export function filterByEventTypes<T extends Venue>(venues: T[], types: EventType[]): T[] {
  if (types.length === 0) return venues;
  return venues.filter((venue) => venue.eventTypes.some((type) => types.includes(type)));
}

export function filterByAmenities<T extends Venue>(venues: T[], amenities: AmenityKey[]): T[] {
  if (amenities.length === 0) return venues;
  return venues.filter((venue) => amenities.every((amenity) => venue.amenities.includes(amenity)));
}

export function filterByRules<T extends Venue>(
  venues: T[],
  requiredRules: Partial<Record<keyof VenueRules, boolean>>
): T[] {
  const entries = Object.entries(requiredRules).filter(([, value]) => value === true) as [
    keyof VenueRules,
    boolean,
  ][];
  if (entries.length === 0) return venues;
  return venues.filter((venue) => entries.every(([key]) => venue.rules[key] === true));
}

/**
 * Counts active filters, excluding location/radius/sort — those have their
 * own dedicated controls and aren't considered part of "Clear all filters".
 */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (filters.eventDate) count += 1;
  if (filters.startTime) count += 1;
  if (filters.endTime) count += 1;
  if (filters.attendees !== null) count += 1;
  if (filters.minPrice !== null || filters.maxPrice !== null) count += 1;
  if (filters.minBookingHours !== null) count += 1;
  count += filters.eventTypes.length;
  count += filters.spaceTypes.length;
  count += filters.amenities.length;
  count += Object.values(filters.rules).filter(Boolean).length;
  return count;
}

/** Runs the full venue-discovery filter pipeline against local dummy data. */
export function applyFilters(venues: Venue[], filters: SearchFilters): VenueWithDistance[] {
  let results: VenueWithDistance[] = withDistance(venues, filters.location.coordinates);

  results = filterByRadius(results, filters.radiusMiles);
  results = filterByCapacity(results, filters.attendees);
  results = filterByPrice(results, filters.minPrice, filters.maxPrice);
  results = filterByMinBookingHours(results, filters.minBookingHours);
  results = filterBySpaceTypes(results, filters.spaceTypes);
  results = filterByEventTypes(results, filters.eventTypes);
  results = filterByAmenities(results, filters.amenities);
  results = filterByRules(results, filters.rules);

  return results;
}
