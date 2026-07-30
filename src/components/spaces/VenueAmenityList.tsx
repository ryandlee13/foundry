import { AMENITY_ICONS, AMENITY_LABELS } from "@/lib/spaces/labels";
import type { AmenityKey } from "@/lib/types/spaces";

export default function VenueAmenityList({
  amenities,
  amenityNotes,
  limit,
}: {
  amenities: AmenityKey[];
  amenityNotes?: Partial<Record<AmenityKey, string>>;
  limit?: number;
}) {
  const alphabetical = [...amenities].sort((a, b) =>
    AMENITY_LABELS[a].localeCompare(AMENITY_LABELS[b])
  );
  const shown = limit ? alphabetical.slice(0, limit) : alphabetical;
  const remaining = limit ? alphabetical.length - shown.length : 0;

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {shown.map((amenity) => {
        const note = amenityNotes?.[amenity];
        return (
          <li
            key={amenity}
            className={`flex items-center gap-1 text-xs text-ink-soft ${note ? "cursor-help underline decoration-dotted decoration-ink-soft/50" : ""}`}
            title={note}
          >
            <span aria-hidden>{AMENITY_ICONS[amenity]}</span>
            {AMENITY_LABELS[amenity]}
          </li>
        );
      })}
      {remaining > 0 && <li className="text-xs text-ink-soft">+{remaining} more</li>}
    </ul>
  );
}
