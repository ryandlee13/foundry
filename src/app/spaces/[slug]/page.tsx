import Link from "next/link";
import type { Metadata } from "next";
import { getVenueBySlug, VENUES } from "@/lib/spaces/venues";
import VenueDetailView from "@/components/spaces/VenueDetailView";
import SubmittedVenueLookup from "@/components/spaces/SubmittedVenueLookup";

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
  const venue = getVenueBySlug(slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/spaces" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to Discover Spaces
      </Link>

      {venue ? <VenueDetailView venue={venue} /> : <SubmittedVenueLookup slug={slug} />}
    </div>
  );
}
