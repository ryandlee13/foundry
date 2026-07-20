"use client";

import { SORT_LABELS } from "@/lib/spaces/labels";
import type { SortOption } from "@/lib/types/spaces";

const SORT_OPTIONS = Object.entries(SORT_LABELS) as [SortOption, string][];

export default function ResultsToolbar({
  resultCount,
  locationLabel,
  radiusMiles,
  sort,
  onSortChange,
  onOpenFilters,
  hasActiveFilters,
  onClearAll,
  activeFilterCount,
}: {
  resultCount: number;
  locationLabel: string;
  radiusMiles: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
  activeFilterCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-ink">
          {resultCount} {resultCount === 1 ? "space" : "spaces"}
        </p>
        <p className="text-xs text-ink-soft">
          Near {locationLabel} · within {radiusMiles} {radiusMiles === 1 ? "mile" : "miles"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="sr-only">
          Sort spaces
        </label>
        <select
          id="sort-select"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortOption)}
          className="rounded-full border border-line bg-paper px-3.5 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        >
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onOpenFilters}
          className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brass lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[10px] font-bold text-paper">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="hidden text-sm font-semibold text-wine hover:text-wine-soft lg:block"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
