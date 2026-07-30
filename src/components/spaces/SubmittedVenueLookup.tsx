"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import VenueDetailView from "./VenueDetailView";
import { getVenueBySlugAnywhere } from "@/lib/spaces/submittedVenues";
import type { Venue } from "@/lib/types/spaces";

/**
 * Locally-submitted venues only exist in the browser that submitted them
 * (see src/lib/spaces/submittedVenues.ts), so they can't be resolved at
 * build time or on the server. This looks them up client-side after mount.
 */
export default function SubmittedVenueLookup({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => {
    // localStorage is only readable client-side, hence the effect rather
    // than a lazy useState initializer (see AuthProvider.tsx for the same
    // hydration-safety reasoning).
    const match = getVenueBySlugAnywhere(slug);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVenue(match);
      setStatus("found");
    } else {
      setStatus("not-found");
    }
  }, [slug]);

  if (status === "loading") {
    return <LoadingState label="Loading space…" />;
  }

  if (status === "not-found" || !venue) {
    return (
      <EmptyState
        title="This space isn't here"
        description="It may have been submitted in a different browser, or the link is out of date."
        action={
          <Link
            href="/spaces"
            className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Back to Discover Spaces
          </Link>
        }
      />
    );
  }

  return <VenueDetailView venue={venue} />;
}
