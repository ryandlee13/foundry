"use client";

import { useMemo, useState } from "react";
import { useSpacesFilters } from "@/hooks/useSpacesFilters";
import { applyFilters, countActiveFilters } from "@/lib/spaces/filters";
import { sortVenues } from "@/lib/spaces/sort";
import { RADIUS_OPTIONS_MILES } from "@/lib/types/spaces";
import { VENUES } from "@/lib/spaces/venues";
import LocationSearch from "@/components/spaces/LocationSearch";
import LocationMapModal from "@/components/spaces/LocationMapModal";
import ResultsToolbar from "@/components/spaces/ResultsToolbar";
import ActiveFilterChips from "@/components/spaces/ActiveFilterChips";
import FilterSidebar from "@/components/spaces/FilterSidebar";
import MobileFilterDrawer from "@/components/spaces/MobileFilterDrawer";
import VenueGrid from "@/components/spaces/VenueGrid";
import EmptyVenueResults from "@/components/spaces/EmptyVenueResults";

export default function SpacesPageClient() {
  const { filters, updateFilters, setLocation, clearAll } = useSpacesFilters();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const results = useMemo(() => {
    const filtered = applyFilters(VENUES, filters);
    return sortVenues(filtered, filters.sort);
  }, [filters]);

  const activeFilterCount = countActiveFilters(filters);
  const maxRadius = RADIUS_OPTIONS_MILES[RADIUS_OPTIONS_MILES.length - 1];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Discover spaces for your next event
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Browse San Francisco venues by location, capacity, price, and the amenities your
          event actually needs.
        </p>
      </div>

      <div className="mt-6">
        <LocationSearch
          locationLabel={filters.location.label}
          radiusMiles={filters.radiusMiles}
          onOpen={() => setLocationModalOpen(true)}
        />
      </div>

      <LocationMapModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        initialLocation={filters.location}
        initialRadius={filters.radiusMiles}
        onApply={setLocation}
      />

      {/* Toolbar */}
      <div className="mt-8 border-t border-line pt-6">
        <ResultsToolbar
          resultCount={results.length}
          locationLabel={filters.location.label}
          radiusMiles={filters.radiusMiles}
          sort={filters.sort}
          onSortChange={(sort) => updateFilters({ sort })}
          onOpenFilters={() => setFilterDrawerOpen(true)}
          hasActiveFilters={activeFilterCount > 0}
          onClearAll={clearAll}
          activeFilterCount={activeFilterCount}
        />

        {activeFilterCount > 0 && (
          <div className="mt-4">
            <ActiveFilterChips filters={filters} onChange={updateFilters} onClearAll={clearAll} />
          </div>
        )}
      </div>

      {/* Filters + results */}
      <div className="mt-6 flex gap-8">
        <FilterSidebar
          filters={filters}
          onChange={updateFilters}
          onClearAll={clearAll}
          hasActiveFilters={activeFilterCount > 0}
        />

        <div className="min-w-0 flex-1">
          {results.length > 0 ? (
            <VenueGrid venues={results} />
          ) : (
            <EmptyVenueResults
              canIncreaseRadius={filters.radiusMiles < maxRadius}
              onIncreaseRadius={() => {
                const nextRadius =
                  RADIUS_OPTIONS_MILES.find((radius) => radius > filters.radiusMiles) ?? maxRadius;
                updateFilters({ radiusMiles: nextRadius });
              }}
              onClearFilters={clearAll}
            />
          )}
        </div>
      </div>

      <MobileFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onChange={updateFilters}
        onClearAll={clearAll}
        hasActiveFilters={activeFilterCount > 0}
        resultCount={results.length}
      />
    </div>
  );
}
