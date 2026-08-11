"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { getVenueById } from "@/lib/spaces/submittedVenues";
import VenueEditForm from "./VenueEditForm";
import LoadingState from "@/components/ui/LoadingState";
import ErrorState from "@/components/ui/ErrorState";
import type { Venue } from "@/lib/types/spaces";

export default function VenueListingManager({ venueId }: { venueId: string }) {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    // localStorage is client-only — see AuthProvider.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVenue(getVenueById(venueId) ?? null);
    setLoaded(true);
  }, [venueId]);

  if (authLoading || !loaded) {
    return <LoadingState label="Loading listing…" />;
  }

  if (!venue) {
    return <ErrorState title="Listing not found" description="This venue listing may have been removed." />;
  }

  // Non-adopted seed venues have ownerId: null and correctly fail this check — nobody can edit them.
  if (!user || venue.ownerId !== user.id) {
    return <ErrorState title="Not authorized" description="You can only edit your own venue listings." />;
  }

  return <VenueEditForm venue={venue} />;
}
