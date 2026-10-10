import VenueCard from "./VenueCard";
import type { VenueWithDistance } from "@/lib/types/spaces";

export default function VenueGrid({
  venues,
  searchQuery = "",
}: {
  venues: VenueWithDistance[];
  /** The planner's whole search, carried onto each venue link — see useSpacesFilters. */
  searchQuery?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 2xl:grid-cols-3">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} searchQuery={searchQuery} />
      ))}
    </div>
  );
}
