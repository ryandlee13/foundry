"use client";

import { formatTimeDisplay } from "@/lib/spaces/bookingConstraints";
import {
  AMENITY_LABELS,
  EVENT_TYPE_LABELS,
  RULE_LABELS,
  SPACE_TYPE_LABELS,
} from "@/lib/spaces/labels";
import type { SearchFilters, VenueRules } from "@/lib/types/spaces";

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

function buildChips(filters: SearchFilters, onChange: (patch: Partial<SearchFilters>) => void): Chip[] {
  const chips: Chip[] = [];

  if (filters.eventDate) {
    chips.push({
      key: "date",
      label: new Date(`${filters.eventDate}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      onRemove: () => onChange({ eventDate: null }),
    });
  }
  if (filters.startTime || filters.endTime) {
    chips.push({
      key: "time",
      label: [filters.startTime, filters.endTime]
        .filter((time): time is string => Boolean(time))
        .map(formatTimeDisplay)
        .join(" – "),
      onRemove: () => onChange({ startTime: null, endTime: null }),
    });
  }
  if (filters.attendees) {
    chips.push({
      key: "attendees",
      label: `${filters.attendees} guests`,
      onRemove: () => onChange({ attendees: null }),
    });
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    chips.push({
      key: "price",
      label: `$${filters.minPrice ?? 0}–$${filters.maxPrice ?? "600+"}/hr`,
      onRemove: () => onChange({ minPrice: null, maxPrice: null }),
    });
  }
  if (filters.minBookingHours !== null) {
    chips.push({
      key: "min-hours",
      label: `${filters.minBookingHours}hr min or less`,
      onRemove: () => onChange({ minBookingHours: null }),
    });
  }

  for (const type of filters.eventTypes) {
    chips.push({
      key: `event-${type}`,
      label: EVENT_TYPE_LABELS[type],
      onRemove: () => onChange({ eventTypes: filters.eventTypes.filter((t) => t !== type) }),
    });
  }
  for (const type of filters.spaceTypes) {
    chips.push({
      key: `space-${type}`,
      label: SPACE_TYPE_LABELS[type],
      onRemove: () => onChange({ spaceTypes: filters.spaceTypes.filter((t) => t !== type) }),
    });
  }
  for (const amenity of filters.amenities) {
    chips.push({
      key: `amenity-${amenity}`,
      label: AMENITY_LABELS[amenity],
      onRemove: () => onChange({ amenities: filters.amenities.filter((a) => a !== amenity) }),
    });
  }
  for (const key of Object.keys(filters.rules) as (keyof VenueRules)[]) {
    if (!filters.rules[key]) continue;
    chips.push({
      key: `rule-${key}`,
      label: RULE_LABELS[key],
      onRemove: () => {
        const next = { ...filters.rules };
        delete next[key];
        onChange({ rules: next });
      },
    });
  }

  return chips;
}

export default function ActiveFilterChips({
  filters,
  onChange,
  onClearAll,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onClearAll: () => void;
}) {
  const chips = buildChips(filters, onChange);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-wine"
        >
          {chip.label}
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-ink-soft" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-semibold text-wine hover:text-wine-soft"
      >
        Clear all filters
      </button>
    </div>
  );
}
