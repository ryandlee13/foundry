"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Sends people back where they came from. A vendor or venue owner opening
 * one of their own upcoming events from the dashboard was previously dumped
 * into Discover Spaces, which is a browsing surface they weren't browsing.
 * Dashboard links pass ?from=dashboard.
 *
 * Coming from Discover Spaces, "back" means back to the search, not to a reset
 * grid. Venue links carry the planner's whole set of filters (see
 * useSpacesFilters' `searchQuery`), so replaying them here returns the same
 * results they just left — price, amenities, neighborhood and all. Restoring
 * only some of them would be worse than restoring none: a grid that looks like
 * your search but silently dropped two filters is a wrong answer, not a
 * partial one.
 */
export default function VenueBackLink() {
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";

  // `from` is our own routing hint, not part of anyone's search, so it doesn't
  // travel back to the grid.
  const params = new URLSearchParams(searchParams.toString());
  params.delete("from");
  const query = params.toString();

  const href = fromDashboard ? "/dashboard" : query ? `/spaces?${query}` : "/spaces";

  return (
    <Link href={href} className="text-sm font-medium text-ink-soft hover:text-ink">
      ← {fromDashboard ? "Back to dashboard" : "Back to Discover Spaces"}
    </Link>
  );
}
