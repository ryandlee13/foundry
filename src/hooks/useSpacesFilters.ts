"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersToSearchParams, getDefaultFilters, searchParamsToFilters } from "@/lib/spaces/urlState";
import { EVENT_DESCRIPTION_PARAM } from "@/lib/spaces/bookingPrefill";
import type { LocationSelection, SearchFilters } from "@/lib/types/spaces";

/**
 * Owns Discover Spaces filter state and keeps it synchronized with the URL
 * (shareable/bookmarkable searches) without any global state library.
 */
export function useSpacesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<SearchFilters>(() =>
    searchParams.toString() ? searchParamsToFilters(searchParams) : getDefaultFilters()
  );

  /*
   * The planner's event description (homepage hero) isn't a filter, so
   * `filtersToSearchParams()` knows nothing about it and every URL sync below
   * would drop it. Captured once from the landing URL and re-applied, so it
   * survives to the venue link that seeds the booking form.
   */
  const [eventDescription] = useState(() => searchParams.get(EVENT_DESCRIPTION_PARAM));

  /**
   * The planner's whole search as a query string. This is both what the URL
   * syncs to and what every venue link carries, deliberately the same value:
   * the grid's address and the link out of it can't drift if they're built
   * once. Venue pages read the booking fields off it (bookingPrefill.ts) and
   * "Back to Discover Spaces" replays all of it, so opening a listing and
   * coming back no longer resets the search.
   */
  const searchQuery = useMemo(() => {
    const params = filtersToSearchParams(filters);
    if (eventDescription) params.set(EVENT_DESCRIPTION_PARAM, eventDescription);
    return params.toString();
  }, [filters, eventDescription]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    router.replace(`${pathname}?${searchQuery}`, { scroll: false });
    // Only a change in the search itself should trigger a URL sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const updateFilters = useCallback((patch: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const setLocation = useCallback((location: LocationSelection, radiusMiles: number) => {
    setFilters((prev) => ({ ...prev, location, radiusMiles }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters((prev) => ({
      ...getDefaultFilters(),
      location: prev.location,
      radiusMiles: prev.radiusMiles,
      sort: prev.sort,
    }));
  }, []);

  return { filters, updateFilters, setLocation, clearAll, searchQuery };
}
