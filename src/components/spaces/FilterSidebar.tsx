"use client";

import FilterFields from "./FilterFields";
import ActiveFilterChips from "./ActiveFilterChips";
import type { FacetCounts } from "@/lib/spaces/facets";
import type { SearchFilters } from "@/lib/types/spaces";

export default function FilterSidebar({
  filters,
  onChange,
  onClearAll,
  hasActiveFilters,
  facetCounts,
  resultCount,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  facetCounts: FacetCounts;
  resultCount: number;
}) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-line bg-paper p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
          {/*
            The live count stands in for a submit button. Desktop applies every
            change immediately, so there is deliberately no "Show N spaces"
            action here — that belongs to the mobile drawer, where the results
            are hidden behind the sheet and need an explicit way back.
          */}
          <span className="text-xs text-ink-soft">
            {resultCount} {resultCount === 1 ? "space" : "spaces"}
          </span>
        </div>

        {/* Selected filters sit above the sections they came from, so removing
            one doesn't mean hunting for which section it lives in. */}
        {hasActiveFilters && (
          <div className="mt-3 border-b border-line pb-4">
            <ActiveFilterChips filters={filters} onChange={onChange} onClearAll={onClearAll} />
          </div>
        )}

        <div className="mt-2">
          <FilterFields filters={filters} onChange={onChange} facetCounts={facetCounts} />
        </div>
      </div>
    </aside>
  );
}
