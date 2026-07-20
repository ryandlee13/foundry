import { AMENITY_ICONS, AMENITY_LABELS } from "@/lib/spaces/labels";
import type { AmenityKey } from "@/lib/types/spaces";

export default function VenueAmenityList({
  amenities,
  limit,
}: {
  amenities: AmenityKey[];
  limit?: number;
}) {
  const shown = limit ? amenities.slice(0, limit) : amenities;
  const remaining = limit ? amenities.length - shown.length : 0;

  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
      {shown.map((amenity) => (
        <li key={amenity} className="flex items-center gap-1 text-xs text-ink-soft">
          <span aria-hidden>{AMENITY_ICONS[amenity]}</span>
          {AMENITY_LABELS[amenity]}
        </li>
      ))}
      {remaining > 0 && <li className="text-xs text-ink-soft">+{remaining} more</li>}
    </ul>
  );
}
