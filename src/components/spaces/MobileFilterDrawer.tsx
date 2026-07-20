"use client";

import { useId } from "react";
import Dialog from "@/components/ui/Dialog";
import FilterFields from "./FilterFields";
import type { SearchFilters } from "@/lib/types/spaces";

export default function MobileFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  onClearAll,
  hasActiveFilters,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
}) {
  const titleId = useId();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      align="right"
      panelClassName="flex h-full w-full max-w-sm flex-col rounded-none sm:rounded-l-2xl"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
          Filters
        </h2>
        <button
          type="button"
          aria-label="Close filters"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        <FilterFields filters={filters} onChange={onChange} />
      </div>

      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Clear all
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full bg-wine px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Show {resultCount} {resultCount === 1 ? "space" : "spaces"}
        </button>
      </div>
    </Dialog>
  );
}
