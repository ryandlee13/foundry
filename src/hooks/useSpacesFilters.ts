"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { filtersToSearchParams, getDefaultFilters, searchParamsToFilters } from "@/lib/spaces/urlState";
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

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = filtersToSearchParams(filters);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // Only the current filters value should trigger a URL sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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

  return { filters, updateFilters, setLocation, clearAll };
}
