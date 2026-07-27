import { SF_LOCATIONS } from "./locations";
import { hashString } from "./hash";
import type { Coordinates } from "@/lib/types/spaces";

export interface ResolvedAddress {
  neighborhood: string;
  coordinates: Coordinates;
}

const NEIGHBORHOODS = SF_LOCATIONS.filter((location) => location.kind === "neighborhood");
const ZIPS = SF_LOCATIONS.filter((location) => location.kind === "zip");

/**
 * Stand-in for a real geocoding API (Google/Mapbox) — this local prototype
 * has no token for one (see docs/ROUTES.md, Discover Spaces section). Tries,
 * in order: an exact match against our known SF ZIPs, a neighborhood name
 * mentioned in the address text, then a deterministic (never random) fallback
 * so the same address always resolves to the same place. Replace with a real
 * geocoder before a real launch.
 */
export function resolveAddress(address: string): ResolvedAddress {
  const normalized = address.toLowerCase();

  const zipMatch = address.match(/\b\d{5}\b/);
  if (zipMatch) {
    const zip = ZIPS.find((z) => z.label === zipMatch[0]);
    if (zip) return { neighborhood: zip.sublabel, coordinates: zip.coordinates };
  }

  const byName = NEIGHBORHOODS.find((n) => normalized.includes(n.label.toLowerCase()));
  if (byName) return { neighborhood: byName.label, coordinates: byName.coordinates };

  const fallback = NEIGHBORHOODS[hashString(normalized.trim()) % NEIGHBORHOODS.length];
  return { neighborhood: fallback.label, coordinates: fallback.coordinates };
}
