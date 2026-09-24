import VenueCard from "./VenueCard";
import type { VenueWithDistance } from "@/lib/types/spaces";

export default function VenueGrid({
  venues,
  prefillQuery = "",
}: {
  venues: VenueWithDistance[];
  /** Search brief carried onto each venue link — see bookingPrefill.ts. */
  prefillQuery?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 2xl:grid-cols-3">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} prefillQuery={prefillQuery} />
      ))}
    </div>
  );
}
