import type { ReactNode } from "react";
import {
  AMENITY_LABELS,
  EVENT_TYPE_LABELS,
  RULE_LABELS,
  SPACE_TYPE_LABELS,
} from "@/lib/spaces/labels";
import { formatBookingWindow, formatBookingIncrement } from "@/lib/spaces/bookingConstraints";
import type { VenueFormValues } from "@/lib/spaces/venueFormSchema";

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-wine hover:underline">
          Edit
        </button>
      </div>
      <div className="mt-2 text-sm text-ink">{children}</div>
    </div>
  );
}

/**
 * Read-only pre-publish summary. Renders `values.address` (the exact street
 * address) deliberately — this is the owner reviewing their own submission
 * before it's geocoded down to a public neighborhood, not a public-facing
 * component, so it's exempt from the "exact address never rendered publicly"
 * rule (docs/SECURITY.md #5). Don't copy this pattern into a public component.
 */
export default function VenueListingReview({
  values,
  photos,
  videoNames,
  resolvedNeighborhood,
  onEditStep,
  billingNotice,
}: {
  values: VenueFormValues;
  photos: string[];
  videoNames: string[];
  resolvedNeighborhood: string;
  onEditStep: (step: 1 | 2) => void;
  billingNotice: ReactNode | null;
}) {
  const bookingWindow = formatBookingWindow(values.earliestStartTime, values.latestEndTime);
  const bookingIncrement = formatBookingIncrement(values.bookingIncrementMinutes);

  return (
    <div className="space-y-4">
      <ReviewSection title="Basics" onEdit={() => onEditStep(1)}>
        <p className="font-display text-base font-semibold text-ink">{values.name}</p>
        <p className="text-ink-soft">{values.tagline}</p>
        <p className="mt-1 text-ink-soft">{values.description}</p>
      </ReviewSection>

      <ReviewSection title="Location" onEdit={() => onEditStep(1)}>
        <p>{values.address}</p>
        <p className="text-xs text-ink-soft">Shown to organizers as: {resolvedNeighborhood}</p>
      </ReviewSection>

      <ReviewSection title="Capacity & pricing" onEdit={() => onEditStep(1)}>
        <p>{SPACE_TYPE_LABELS[values.spaceType]}</p>
        <p>
          Up to {values.maxCapacity} guests ({values.seatedCapacity} seated)
        </p>
        <p>
          ${values.minHourlyRate}–${values.maxHourlyRate}/hr · {values.minBookingHours}hr minimum
          {values.minBookingHoursNegotiable && " (negotiable)"}
          {values.capacityNegotiable && " · capacity negotiable"}
        </p>
        <p className="mt-1">{values.eventTypes.map((t) => EVENT_TYPE_LABELS[t]).join(", ")}</p>
      </ReviewSection>

      <ReviewSection title="Booking window & rules" onEdit={() => onEditStep(1)}>
        <p>{bookingWindow ?? "No stated hours — bookings accepted any time"}</p>
        {bookingIncrement && <p>{bookingIncrement}</p>}
      </ReviewSection>

      <ReviewSection title="Amenities" onEdit={() => onEditStep(2)}>
        {values.amenities.length === 0 ? (
          <p className="text-ink-soft">None selected</p>
        ) : (
          <ul className="space-y-0.5">
            {values.amenities.map((key) => (
              <li key={key}>
                {AMENITY_LABELS[key]}
                {values.amenityNotes[key] && <span className="text-ink-soft"> — {values.amenityNotes[key]}</span>}
              </li>
            ))}
          </ul>
        )}
      </ReviewSection>

      <ReviewSection title="Rules & requirements" onEdit={() => onEditStep(2)}>
        <ul className="space-y-0.5">
          {Object.entries(RULE_LABELS).map(([key, label]) =>
            values.rules[key as keyof typeof values.rules] ? <li key={key}>{label}</li> : null
          )}
        </ul>
      </ReviewSection>

      <ReviewSection title="Photos" onEdit={() => onEditStep(1)}>
        <p>{photos.length} photos</p>
        {photos.length > 0 && (
          <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {photos.slice(0, 16).map((photo, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- local data URLs, not a remote image domain
              <img key={index} src={photo} alt="" className="aspect-square rounded object-cover" />
            ))}
          </div>
        )}
        {videoNames.length > 0 && <p className="mt-2 text-xs text-ink-soft">🎥 {videoNames.length} video attached</p>}
      </ReviewSection>

      {billingNotice}
    </div>
  );
}
