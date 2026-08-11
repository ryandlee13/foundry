"use client";

import { useCallback, useEffect, useState } from "react";
import { getVenuesOwnedBy } from "@/lib/spaces/submittedVenues";
import { getBookingsForVenue } from "@/lib/spaces/bookings";
import { getThreadForBooking, getUnreadMessageCount } from "@/lib/vendors/messages";
import type { Booking, Venue } from "@/lib/types/spaces";

/** Venues owned by the given account, plus their bookings, loaded from localStorage after mount. */
export function useOwnedVenuesData(userId: string | undefined) {
  const [loaded, setLoaded] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookingsByVenue, setBookingsByVenue] = useState<Record<string, Booking[]>>({});
  const [threadIdByBooking, setThreadIdByBooking] = useState<Record<string, string>>({});
  const [unreadByBooking, setUnreadByBooking] = useState<Record<string, number>>({});

  const refresh = useCallback(() => {
    if (!userId) return;
    const owned = getVenuesOwnedBy(userId);
    const bookings: Record<string, Booking[]> = {};
    const threadIds: Record<string, string> = {};
    const unread: Record<string, number> = {};
    for (const venue of owned) {
      const venueBookings = getBookingsForVenue(venue.id);
      bookings[venue.id] = venueBookings;
      for (const booking of venueBookings) {
        const thread = getThreadForBooking(booking.id);
        if (thread) {
          threadIds[booking.id] = thread.id;
          unread[booking.id] = getUnreadMessageCount(thread.id, userId);
        }
      }
    }
    setVenues(owned);
    setBookingsByVenue(bookings);
    setThreadIdByBooking(threadIds);
    setUnreadByBooking(unread);
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

  return { loaded, venues, bookingsByVenue, threadIdByBooking, unreadByBooking, pendingCount, refresh };
}
