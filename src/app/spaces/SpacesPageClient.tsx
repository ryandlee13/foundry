"use client";

import { useEffect, useMemo, useState } from "react";
import { useSpacesFilters } from "@/hooks/useSpacesFilters";
import { applyFilters, countActiveFilters } from "@/lib/spaces/filters";
import { computeFacetCounts } from "@/lib/spaces/facets";
import { sortVenues } from "@/lib/spaces/sort";
import { RADIUS_OPTIONS_MILES, type Venue } from "@/lib/types/spaces";
import { VENUES } from "@/lib/spaces/venues";
import { getPubliclyVisibleVenues } from "@/lib/spaces/submittedVenues";
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
  // Starts as just the seed venues (matches server-rendered output) so
  // there's no hydration mismatch; picks up locally-submitted listings
  // right after mount, same pattern as AuthProvider's session load.
  const [allVenues, setAllVenues] = useState<Venue[]>(VENUES);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAllVenues(getPubliclyVisibleVenues());
  }, []);

  const results = useMemo(() => {
    const filtered = applyFilters(allVenues, filters);
    return sortVenues(filtered, filters.sort);
  }, [allVenues, filters]);

  // Faceted counts for the panel — each dimension counted with its own
  // selections lifted, so the numbers predict what ticking a box would give.
  const facetCounts = useMemo(() => computeFacetCounts(allVenues, filters), [allVenues, filters]);

  const activeFilterCount = countActiveFilters(filters);
  const maxRadius = RADIUS_OPTIONS_MILES[RADIUS_OPTIONS_MILES.length - 1];

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-10 xl:px-16">
      {/* Header: title left, location/radius control right, one row. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Discover spaces for your next event
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Browse San Francisco venues by location, capacity, price, and the amenities your
            event actually needs.
          </p>
        </div>

        <div className="shrink-0">
          <LocationSearch
            locationLabel={filters.location.label}
            radiusMiles={filters.radiusMiles}
            onOpen={() => setLocationModalOpen(true)}
          />
        </div>
      </div>

      <LocationMapModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        initialLocation={filters.location}
        initialRadius={filters.radiusMiles}
        onApply={setLocation}
      />

      {/* Toolbar */}
      <div className="mt-5 border-t border-line pt-5">
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

        {/*
          Below lg the sidebar is gone and the drawer is closed, so this is the
          only place the active filters are visible. At lg and up the sidebar
          shows the same chips at the top of the panel — rendering both would
          put the identical row on screen twice.
        */}
        {activeFilterCount > 0 && (
          <div className="mt-4 lg:hidden">
            <ActiveFilterChips filters={filters} onChange={updateFilters} onClearAll={clearAll} />
          </div>
        )}
      </div>

      {/* Filters + results */}
      <div className="mt-5 flex gap-8">
        <FilterSidebar
          filters={filters}
          onChange={updateFilters}
          onClearAll={clearAll}
          hasActiveFilters={activeFilterCount > 0}
          facetCounts={facetCounts}
          resultCount={results.length}
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
        facetCounts={facetCounts}
      />
    </div>
  );
}
