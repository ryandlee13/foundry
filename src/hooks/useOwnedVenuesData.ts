"use client";

import { useCallback, useEffect, useState } from "react";
import { getVenuesOwnedBy } from "@/lib/spaces/submittedVenues";
import { getBookingsForVenue } from "@/lib/spaces/bookings";
import type { Booking, Venue } from "@/lib/types/spaces";

/** Venues owned by the given account, plus their bookings, loaded from localStorage after mount. */
export function useOwnedVenuesData(userId: string | undefined) {
  const [loaded, setLoaded] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookingsByVenue, setBookingsByVenue] = useState<Record<string, Booking[]>>({});

  const refresh = useCallback(() => {
    if (!userId) return;
    const owned = getVenuesOwnedBy(userId);
    const bookings: Record<string, Booking[]> = {};
    for (const venue of owned) {
      bookings[venue.id] = getBookingsForVenue(venue.id);
    }
    setVenues(owned);
    setBookingsByVenue(bookings);
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    // localStorage reads are client-only — see AuthProvider.tsx for the
    // same hydration-safety reasoning.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const pendingCount = Object.values(bookingsByVenue)
    .flat()
    .filter((booking) => booking.status === "pending").length;

  return { loaded, venues, bookingsByVenue, pendingCount, refresh };
}
