"use client";

import { AMENITY_LABELS, RULE_LABELS, SPACE_TYPE_LABELS } from "@/lib/spaces/labels";
import PriceRangeSlider from "./PriceRangeSlider";
import DescribeEventField from "./DescribeEventField";
import type {
  AmenityKey,
  SearchFilters,
  SpaceType,
  VenueRules,
} from "@/lib/types/spaces";

const SPACE_TYPE_OPTIONS = Object.entries(SPACE_TYPE_LABELS) as [SpaceType, string][];
const AMENITY_OPTIONS = Object.entries(AMENITY_LABELS) as [AmenityKey, string][];
const RULE_OPTIONS = Object.entries(RULE_LABELS) as [keyof VenueRules, string][];
const MIN_BOOKING_HOUR_OPTIONS = [1, 2, 3, 4, 6, 8];

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-6 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CheckboxGrid<T extends string>({
  options,
  selected,
  onToggle,
  columns = 2,
}: {
  options: [T, string][];
  selected: T[];
  onToggle: (value: T) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {options.map(([value, label]) => (
        <label key={value} className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => onToggle(value)}
            className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export default function FilterFields({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
}) {
  function toggleInArray<T extends string>(key: keyof SearchFilters, current: T[], value: T) {
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ [key]: next } as Partial<SearchFilters>);
  }

  function toggleRule(key: keyof VenueRules) {
    const next = { ...filters.rules };
    if (next[key]) {
      delete next[key];
    } else {
      next[key] = true;
    }
    onChange({ rules: next });
  }

  return (
    <div>
      <FilterSection title="Describe the event">
        <DescribeEventField
          selected={filters.eventTypes}
          onChange={(next) => onChange({ eventTypes: next })}
        />
      </FilterSection>

      <FilterSection title="Event details">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="filter-date" className="block text-xs font-medium text-ink-soft">
              Event date
            </label>
            <input
              id="filter-date"
              type="date"
              value={filters.eventDate ?? ""}
              onChange={(event) => onChange({ eventDate: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
          <div>
            <label htmlFor="filter-start" className="block text-xs font-medium text-ink-soft">
              Start time
            </label>
            <input
              id="filter-start"
              type="time"
              value={filters.startTime ?? ""}
              onChange={(event) => onChange({ startTime: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
          <div>
            <label htmlFor="filter-end" className="block text-xs font-medium text-ink-soft">
              End time
            </label>
            <input
              id="filter-end"
              type="time"
              value={filters.endTime ?? ""}
              onChange={(event) => onChange({ endTime: event.target.value || null })}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="filter-attendees" className="block text-xs font-medium text-ink-soft">
              Number of attendees
            </label>
            <input
              id="filter-attendees"
              type="number"
              min={0}
              inputMode="numeric"
              value={filters.attendees ?? ""}
              onChange={(event) =>
                onChange({ attendees: event.target.value ? Number(event.target.value) : null })
              }
              placeholder="Any"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Pricing">
        <PriceRangeSlider
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onChange={(min, max) => onChange({ minPrice: min, maxPrice: max })}
        />

        <div className="mt-5">
          <label htmlFor="filter-min-hours" className="block text-xs font-medium text-ink-soft">
            Minimum booking duration
          </label>
          <select
            id="filter-min-hours"
            value={filters.minBookingHours ?? ""}
            onChange={(event) =>
              onChange({
                minBookingHours: event.target.value ? Number(event.target.value) : null,
              })
            }
            className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          >
            <option value="">Any</option>
            {MIN_BOOKING_HOUR_OPTIONS.map((hours) => (
              <option key={hours} value={hours}>
                {hours} {hours === 1 ? "hour" : "hours"} or less
              </option>
            ))}
          </select>
        </div>
      </FilterSection>

      <FilterSection title="Space type">
        <CheckboxGrid
          options={SPACE_TYPE_OPTIONS}
          selected={filters.spaceTypes}
          onToggle={(value) => toggleInArray("spaceTypes", filters.spaceTypes, value)}
        />
      </FilterSection>

      <FilterSection title="Amenities Included">
        <CheckboxGrid
          options={AMENITY_OPTIONS}
          selected={filters.amenities}
          onToggle={(value) => toggleInArray("amenities", filters.amenities, value)}
        />
      </FilterSection>

      <FilterSection title="Venue rules">
        <div className="grid gap-2.5">
          {RULE_OPTIONS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(filters.rules[key])}
                onChange={() => toggleRule(key)}
                className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
              />
              {label}
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
