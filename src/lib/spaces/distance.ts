import type { Coordinates } from "@/lib/types/spaces";

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in miles. */
export function haversineDistanceMiles(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));

  return EARTH_RADIUS_MILES * c;
}

/** Rounds a distance to a display-friendly precision (1 decimal under 10mi, whole number after). */
export function formatDistanceMiles(distanceMiles: number): string {
  if (distanceMiles < 0.1) return "< 0.1 mi";
  const rounded = distanceMiles < 10 ? Math.round(distanceMiles * 10) / 10 : Math.round(distanceMiles);
  return `${rounded} mi`;
}
