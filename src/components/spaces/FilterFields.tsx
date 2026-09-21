"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ACCESS_AMENITY_ENTRIES,
  ACCESS_PRIORITY,
  AMENITY_PRIORITY,
  PHYSICAL_AMENITY_ENTRIES,
  RULE_LABELS,
  SPACE_TYPE_LABELS,
  SPACE_TYPE_PRIORITY,
  orderByPriority,
} from "@/lib/spaces/labels";
import InfoTooltip from "@/components/ui/InfoTooltip";
import PriceRangeSlider from "./PriceRangeSlider";
import DescribeEventField from "./DescribeEventField";
import type { FacetCounts } from "@/lib/spaces/facets";
import type { AmenityKey, SearchFilters, SpaceType, VenueRules } from "@/lib/types/spaces";

/** How many options show before "Show more". */
const COLLAPSED_LIMIT = 5;

const SPACE_TYPE_OPTIONS = orderByPriority(
  Object.entries(SPACE_TYPE_LABELS) as [SpaceType, string][],
  SPACE_TYPE_PRIORITY
);

const AMENITY_OPTIONS = orderByPriority(PHYSICAL_AMENITY_ENTRIES, AMENITY_PRIORITY);

const RULE_ENTRIES = Object.entries(RULE_LABELS) as [keyof VenueRules, string][];

/**
 * Access & policies draws from two different filter dimensions — a few
 * access-oriented amenities plus the venue rules — so its options carry
 * which one they belong to rather than being keyed by string alone.
 */
type AccessOption =
  | { kind: "amenity"; key: AmenityKey; label: string }
  | { kind: "rule"; key: keyof VenueRules; label: string };

const ACCESS_OPTIONS: AccessOption[] = orderByPriority(
  [
    ...ACCESS_AMENITY_ENTRIES.map(([key, label]) => [key, label] as [string, string]),
    ...RULE_ENTRIES.map(([key, label]) => [key, label] as [string, string]),
  ],
  ACCESS_PRIORITY
).map(([key, label]) =>
  ACCESS_AMENITY_ENTRIES.some(([amenityKey]) => amenityKey === key)
    ? { kind: "amenity", key: key as AmenityKey, label }
    : { kind: "rule", key: key as keyof VenueRules, label }
);

const MIN_BOOKING_HOUR_OPTIONS = [1, 2, 3, 4, 6, 8];

/**
 * Collapsible section. Defaults open for the sections a planner almost always
 * touches and closed for the long option lists, so the panel is scannable
 * without scrolling past 30 checkboxes to reach pricing.
 */
function FilterSection({
  title,
  selectedCount = 0,
  defaultOpen = true,
  titleAccessory,
  children,
}: {
  title: string;
  selectedCount?: number;
  defaultOpen?: boolean;
  titleAccessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex flex-1 items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2">
            <span className="font-display text-base font-semibold text-ink">{title}</span>
            {selectedCount > 0 && (
              <span className="rounded-full bg-wine px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                {selectedCount}
              </span>
            )}
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {titleAccessory}
      </div>

      {open && <div className="mt-3">{children}</div>}
    </section>
  );
}

/** One checkbox row: label left, facet count right. */
function CheckboxRow({
  label,
  checked,
  count,
  onToggle,
}: {
  label: string;
  checked: boolean;
  count?: number;
  onToggle: () => void;
}) {
  // A zero-result option stays clickable but is dimmed — hiding it entirely
  // makes the list jump around as other filters change.
  const empty = count === 0 && !checked;

  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
      />
      <span className={`flex-1 ${empty ? "text-ink-soft/55" : ""}`}>{label}</span>
      {count !== undefined && (
        <span className={`shrink-0 text-xs tabular-nums ${empty ? "text-ink-soft/45" : "text-ink-soft"}`}>
          {count}
        </span>
      )}
    </label>
  );
}

/**
 * A single column of checkbox rows, truncated to COLLAPSED_LIMIT until
 * expanded. Anything already selected is pulled into the visible set — a
 * ticked filter hidden behind "Show more" reads as the panel having lost it.
 */
function CheckboxRows<T extends string>({
  options,
  isChecked,
  onToggle,
  counts,
}: {
  options: { key: T; label: string }[];
  isChecked: (key: T) => boolean;
  onToggle: (key: T) => void;
  counts?: (key: T) => number | undefined;
}) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded
    ? options
    : options.filter((option, index) => index < COLLAPSED_LIMIT || isChecked(option.key));
  const hiddenCount = options.length - visible.length;

  return (
    <div>
      <div className="flex flex-col">
        {visible.map((option) => (
          <CheckboxRow
            key={option.key}
            label={option.label}
            checked={isChecked(option.key)}
            count={counts?.(option.key)}
            onToggle={() => onToggle(option.key)}
          />
        ))}
      </div>

      {(hiddenCount > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1.5 text-xs font-semibold text-wine hover:text-wine-soft"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

export default function FilterFields({
  filters,
  onChange,
  facetCounts,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  /** Omitted when counts aren't available; rows then render without a number. */
  facetCounts?: FacetCounts;
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

  const activeRuleCount = Object.values(filters.rules).filter(Boolean).length;
  const accessAmenityCount = filters.amenities.filter((key) =>
    ACCESS_AMENITY_ENTRIES.some(([accessKey]) => accessKey === key)
  ).length;
  const physicalAmenityCount = filters.amenities.length - accessAmenityCount;

  const eventDetailCount =
    (filters.eventDate ? 1 : 0) +
    (filters.startTime || filters.endTime ? 1 : 0) +
    (filters.attendees !== null ? 1 : 0);
  const pricingCount =
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.minBookingHours !== null ? 1 : 0);

  return (
    <div>
      <FilterSection title="Describe the event" selectedCount={filters.eventTypes.length}>
        <DescribeEventField
          selected={filters.eventTypes}
          onChange={(next) => onChange({ eventTypes: next })}
        />
      </FilterSection>

      <FilterSection title="Event details" selectedCount={eventDetailCount}>
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

      <FilterSection title="Pricing" selectedCount={pricingCount}>
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

      <FilterSection title="Space type" selectedCount={filters.spaceTypes.length}>
        <CheckboxRows
          options={SPACE_TYPE_OPTIONS.map(([key, label]) => ({ key, label }))}
          isChecked={(key) => filters.spaceTypes.includes(key)}
          onToggle={(key) => toggleInArray("spaceTypes", filters.spaceTypes, key)}
          counts={(key) => facetCounts?.spaceTypes[key]}
        />
      </FilterSection>

      <FilterSection
        title="Amenities"
        selectedCount={physicalAmenityCount}
        titleAccessory={
          <InfoTooltip label="About amenities">
            Amenity not included? No worries —{" "}
            <Link href="/vendors" className="font-semibold text-wine underline hover:text-wine-soft">
              book a vendor for it directly
            </Link>
            .
          </InfoTooltip>
        }
      >
        <CheckboxRows
          options={AMENITY_OPTIONS.map(([key, label]) => ({ key, label }))}
          isChecked={(key) => filters.amenities.includes(key)}
          onToggle={(key) => toggleInArray("amenities", filters.amenities, key)}
          counts={(key) => facetCounts?.amenities[key]}
        />
      </FilterSection>

      <FilterSection
        title="Access & policies"
        selectedCount={accessAmenityCount + activeRuleCount}
        defaultOpen={false}
      >
        <CheckboxRows
          options={ACCESS_OPTIONS.map((option) => ({ key: option.key as string, label: option.label }))}
          isChecked={(key) => {
            const option = ACCESS_OPTIONS.find((item) => item.key === key);
            if (!option) return false;
            return option.kind === "amenity"
              ? filters.amenities.includes(option.key)
              : Boolean(filters.rules[option.key]);
          }}
          onToggle={(key) => {
            const option = ACCESS_OPTIONS.find((item) => item.key === key);
            if (!option) return;
            if (option.kind === "amenity") {
              toggleInArray("amenities", filters.amenities, option.key);
            } else {
              toggleRule(option.key);
            }
          }}
          counts={(key) => {
            const option = ACCESS_OPTIONS.find((item) => item.key === key);
            if (!option || !facetCounts) return undefined;
            return option.kind === "amenity"
              ? facetCounts.amenities[option.key]
              : facetCounts.rules[option.key];
          }}
        />
      </FilterSection>
    </div>
  );
}
