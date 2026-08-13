import { EVENT_TYPE_LABELS } from "./labels";
import type { EventType } from "@/lib/types/spaces";

export interface EventTypeOption {
  value: EventType;
  label: string;
}

/**
 * Alphabetical by the label a user actually reads, not by slug — sorting on
 * the slug would put "brand_activation" before "corporate" but
 * "photo_video_shoot" before "popup", which looks arbitrary on screen.
 */
export function getEventTypesAlphabetical(): EventTypeOption[] {
  return (Object.entries(EVENT_TYPE_LABELS) as [EventType, string][])
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Pure: type-ahead filter over the alphabetical list. Empty query returns everything. */
export function searchEventTypes(query: string): EventTypeOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getEventTypesAlphabetical();
  return getEventTypesAlphabetical().filter((option) => option.label.toLowerCase().includes(normalized));
}

/** The label for a selected value, or "" when nothing is selected. */
export function getEventTypeLabel(value: EventType | null): string {
  return value ? EVENT_TYPE_LABELS[value] : "";
}
