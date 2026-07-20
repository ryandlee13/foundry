import type { SortOption, VenueWithDistance } from "@/lib/types/spaces";

export function sortVenues<T extends VenueWithDistance>(venues: T[], sort: SortOption): T[] {
  const sorted = [...venues];

  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.minHourlyRate - b.minHourlyRate);
    case "price_desc":
      return sorted.sort((a, b) => b.maxHourlyRate - a.maxHourlyRate);
    case "capacity":
      return sorted.sort((a, b) => b.maxCapacity - a.maxCapacity);
    case "recommended":
    default:
      // Badged venues surface first, then nearest-first as a stable tiebreaker.
      return sorted.sort((a, b) => {
        const badgeScore = (v: T) => (v.badge ? 1 : 0);
        const diff = badgeScore(b) - badgeScore(a);
        if (diff !== 0) return diff;
        return a.distanceMiles - b.distanceMiles;
      });
  }
}
