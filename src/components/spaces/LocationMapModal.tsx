"use client";

import { useId, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import MapPreview from "./MapPreview";
import RadiusSelector from "./RadiusSelector";
import { searchLocations } from "@/lib/spaces/locations";
import type { LocationSelection, LocationSuggestion } from "@/lib/types/spaces";

export default function LocationMapModal({
  open,
  onClose,
  initialLocation,
  initialRadius,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  initialLocation: LocationSelection;
  initialRadius: number;
  onApply: (location: LocationSelection, radiusMiles: number) => void;
}) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [pendingLocation, setPendingLocation] = useState(initialLocation);
  const [pendingRadius, setPendingRadius] = useState(initialRadius);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");

  // Re-sync pending state from the applied filters each time the modal
  // transitions to open, without a separate settling effect (React's
  // recommended "adjust state during render" pattern for prop-driven resets).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPendingLocation(initialLocation);
      setPendingRadius(initialRadius);
      setQuery("");
      setGeoStatus("idle");
    }
  }

  const suggestions: LocationSuggestion[] = searchLocations(query);

  function handleSelectSuggestion(suggestion: LocationSuggestion) {
    setPendingLocation({ label: suggestion.label, coordinates: suggestion.coordinates });
    setQuery("");
    setGeoStatus("idle");
  }

  function handleUseCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPendingLocation({
          label: "Current location",
          coordinates: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
        setGeoStatus("idle");
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { timeout: 8000 }
    );
  }

  function handleApply() {
    onApply(pendingLocation, pendingRadius);
    onClose();
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) return;
    // Reset any in-progress typing/geolocation state on close without applying.
    setQuery("");
    setGeoStatus("idle");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={() => handleOpenChange(false)}
      labelledBy={titleId}
      panelClassName="w-full max-w-lg p-6"
    >
      <div className="flex items-center justify-between">
        <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
          Set your search location
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => handleOpenChange(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-5">
        <label htmlFor="location-search-input" className="sr-only">
          Search by neighborhood or ZIP code
        </label>
        <div className="relative">
          <input
            id="location-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search neighborhood or ZIP code"
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 pr-24 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <button
            type="button"
            onClick={() => suggestions[0] && handleSelectSuggestion(suggestions[0])}
            disabled={suggestions.length === 0}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-wine px-3 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Search
          </button>
        </div>

        {query && (
          <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-line bg-paper">
            {suggestions.length === 0 ? (
              <li className="px-3.5 py-2.5 text-sm text-ink-soft">No matches in San Francisco.</li>
            ) : (
              suggestions.map((suggestion) => (
                <li key={suggestion.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="flex w-full flex-col items-start px-3.5 py-2.5 text-left text-sm hover:bg-paper-dim"
                  >
                    <span className="font-medium text-ink">{suggestion.label}</span>
                    <span className="text-xs text-ink-soft">{suggestion.sublabel}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-wine hover:text-wine-soft"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3" strokeLinecap="round" />
          </svg>
          {geoStatus === "loading" ? "Locating…" : "Use my current location"}
        </button>
        {geoStatus === "denied" && (
          <p className="mt-2 text-xs text-wine">
            Location access was denied. Search by neighborhood or ZIP code instead.
          </p>
        )}
        {geoStatus === "error" && (
          <p className="mt-2 text-xs text-wine">
            We couldn&apos;t get your location. Search by neighborhood or ZIP code instead.
          </p>
        )}
      </div>

      <div className="mt-5">
        <MapPreview radiusMiles={pendingRadius} />
        <p className="mt-1.5 text-xs text-ink-soft">
          Centered on <span className="font-medium text-ink">{pendingLocation.label}</span>. A
          live interactive map connects once a map provider is configured.
        </p>
      </div>

      <div className="mt-5">
        <RadiusSelector value={pendingRadius} onChange={setPendingRadius} />
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => handleOpenChange(false)}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Apply
        </button>
      </div>
    </Dialog>
  );
}
