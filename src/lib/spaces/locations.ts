import type { LocationSuggestion } from "@/lib/types/spaces";

/**
 * Curated San Francisco locations used for search-without-a-map-provider.
 * Coordinates are neighborhood-level approximations, not street addresses —
 * consistent with the project rule that exact addresses are never exposed
 * publicly (docs/SECURITY.md #5).
 */
export const SF_LOCATIONS: LocationSuggestion[] = [
  {
    id: "city-sf",
    label: "San Francisco, CA",
    sublabel: "City center",
    coordinates: { lat: 37.788, lng: -122.4075 },
    kind: "city",
  },
  { id: "n-union-square", label: "Union Square", sublabel: "San Francisco, CA", coordinates: { lat: 37.788, lng: -122.4075 }, kind: "neighborhood" },
  { id: "n-chinatown", label: "Chinatown", sublabel: "San Francisco, CA", coordinates: { lat: 37.7941, lng: -122.4078 }, kind: "neighborhood" },
  { id: "n-financial-district", label: "Financial District", sublabel: "San Francisco, CA", coordinates: { lat: 37.7946, lng: -122.3999 }, kind: "neighborhood" },
  { id: "n-soma", label: "SoMa", sublabel: "San Francisco, CA", coordinates: { lat: 37.7785, lng: -122.4056 }, kind: "neighborhood" },
  { id: "n-nob-hill", label: "Nob Hill", sublabel: "San Francisco, CA", coordinates: { lat: 37.793, lng: -122.4161 }, kind: "neighborhood" },
  { id: "n-tenderloin", label: "Tenderloin", sublabel: "San Francisco, CA", coordinates: { lat: 37.7838, lng: -122.4142 }, kind: "neighborhood" },
  { id: "n-hayes-valley", label: "Hayes Valley", sublabel: "San Francisco, CA", coordinates: { lat: 37.7759, lng: -122.4245 }, kind: "neighborhood" },
  { id: "n-mission", label: "Mission District", sublabel: "San Francisco, CA", coordinates: { lat: 37.7599, lng: -122.4148 }, kind: "neighborhood" },
  { id: "n-dogpatch", label: "Dogpatch", sublabel: "San Francisco, CA", coordinates: { lat: 37.7583, lng: -122.3888 }, kind: "neighborhood" },
  { id: "n-bernal-heights", label: "Bernal Heights", sublabel: "San Francisco, CA", coordinates: { lat: 37.744, lng: -122.4159 }, kind: "neighborhood" },
  { id: "n-castro", label: "Castro", sublabel: "San Francisco, CA", coordinates: { lat: 37.7609, lng: -122.435 }, kind: "neighborhood" },
  { id: "n-marina", label: "Marina", sublabel: "San Francisco, CA", coordinates: { lat: 37.803, lng: -122.438 }, kind: "neighborhood" },
  { id: "n-pacific-heights", label: "Pacific Heights", sublabel: "San Francisco, CA", coordinates: { lat: 37.7925, lng: -122.4382 }, kind: "neighborhood" },
  { id: "n-north-beach", label: "North Beach", sublabel: "San Francisco, CA", coordinates: { lat: 37.806, lng: -122.4103 }, kind: "neighborhood" },
  { id: "n-potrero-hill", label: "Potrero Hill", sublabel: "San Francisco, CA", coordinates: { lat: 37.7677, lng: -122.4001 }, kind: "neighborhood" },
  { id: "n-japantown", label: "Japantown", sublabel: "San Francisco, CA", coordinates: { lat: 37.7854, lng: -122.4297 }, kind: "neighborhood" },
  { id: "z-94102", label: "94102", sublabel: "Hayes Valley / Tenderloin", coordinates: { lat: 37.7786, lng: -122.4192 }, kind: "zip" },
  { id: "z-94103", label: "94103", sublabel: "SoMa", coordinates: { lat: 37.7725, lng: -122.4103 }, kind: "zip" },
  { id: "z-94107", label: "94107", sublabel: "Potrero Hill / Dogpatch", coordinates: { lat: 37.7625, lng: -122.3971 }, kind: "zip" },
  { id: "z-94108", label: "94108", sublabel: "Chinatown / Nob Hill", coordinates: { lat: 37.7919, lng: -122.4085 }, kind: "zip" },
  { id: "z-94109", label: "94109", sublabel: "Nob Hill / Polk Gulch", coordinates: { lat: 37.7925, lng: -122.4193 }, kind: "zip" },
  { id: "z-94110", label: "94110", sublabel: "Mission District", coordinates: { lat: 37.7509, lng: -122.4153 }, kind: "zip" },
  { id: "z-94111", label: "94111", sublabel: "Financial District (Embarcadero)", coordinates: { lat: 37.7955, lng: -122.3986 }, kind: "zip" },
  { id: "z-94114", label: "94114", sublabel: "Castro / Noe Valley", coordinates: { lat: 37.7599, lng: -122.4348 }, kind: "zip" },
  { id: "z-94123", label: "94123", sublabel: "Marina", coordinates: { lat: 37.8005, lng: -122.4363 }, kind: "zip" },
  { id: "z-94133", label: "94133", sublabel: "North Beach", coordinates: { lat: 37.8058, lng: -122.4104 }, kind: "zip" },
];

export const DEFAULT_LOCATION = SF_LOCATIONS[0];
export const DEFAULT_RADIUS_MILES = 1;

/** Local, no-network "geocoder" used when no live map provider is configured. */
export function searchLocations(query: string): LocationSuggestion[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return SF_LOCATIONS.slice(0, 8);

  return SF_LOCATIONS.filter(
    (location) =>
      location.label.toLowerCase().includes(trimmed) ||
      location.sublabel.toLowerCase().includes(trimmed)
  ).slice(0, 8);
}

export function findLocationById(id: string): LocationSuggestion | undefined {
  return SF_LOCATIONS.find((location) => location.id === id);
}
