"use client";

import FilterFields from "./FilterFields";
import type { SearchFilters } from "@/lib/types/spaces";

export default function FilterSidebar({
  filters,
  onChange,
  onClearAll,
  hasActiveFilters,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-line bg-paper p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Filters</h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-semibold text-wine hover:text-wine-soft"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="mt-2">
          <FilterFields filters={filters} onChange={onChange} />
        </div>
      </div>
    </aside>
  );
}
