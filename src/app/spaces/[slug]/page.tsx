import { Suspense } from "react";
import type { Metadata } from "next";
import { getVenueBySlug, VENUES } from "@/lib/spaces/venues";
import SubmittedVenueLookup from "@/components/spaces/SubmittedVenueLookup";
import VenueBackLink from "@/components/spaces/VenueBackLink";

export function generateStaticParams() {
  return VENUES.map((venue) => ({ slug: venue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  // User-submitted venues only exist client-side (see SubmittedVenueLookup),
  // so there's no real title to render server-side for those yet.
  if (!venue) return { title: "Discover Spaces — Foundry" };
  return {
    title: `${venue.name} — Foundry`,
    description: venue.tagline,
  };
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Seed data only — the source of truth once a venue is adopted or edited
  // lives in localStorage, so SubmittedVenueLookup always re-checks
  // client-side and overrides this fallback when a newer copy exists.
  const seedVenue = getVenueBySlug(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<span className="text-sm font-medium text-ink-soft">← Back</span>}>
        <VenueBackLink />
      </Suspense>

      <SubmittedVenueLookup slug={slug} fallbackVenue={seedVenue ?? null} />
    </div>
  );
}
