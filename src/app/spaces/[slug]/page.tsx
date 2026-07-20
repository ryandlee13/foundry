import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVenueBySlug, VENUES } from "@/lib/spaces/venues";
import { SPACE_TYPE_LABELS, EVENT_TYPE_LABELS, RULE_LABELS } from "@/lib/spaces/labels";
import VenueAmenityList from "@/components/spaces/VenueAmenityList";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";

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
  if (!venue) return { title: "Space not found — Foundry" };
  return {
    title: `${venue.name} — Foundry`,
    description: venue.tagline,
  };
}

function formatPriceRange(min: number, max: number): string {
  return min === max ? `$${min}/hr` : `$${min}–$${max}/hr`;
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const venue = getVenueBySlug(slug);
  if (!venue) notFound();

  const allowedRules = (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[]).filter(
    (key) => venue.rules[key]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/spaces" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to Discover Spaces
      </Link>

      <div className="mt-4 grid gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <VenueImagePlaceholder
          accent={venue.visualAccent}
          icon={venue.icon}
          imageCount={venue.images.length}
          className="aspect-[16/10] rounded-2xl sm:col-span-3 sm:row-span-2 sm:aspect-auto"
        />
        {venue.images.slice(1, 3).map((image, index) => (
          <VenueImagePlaceholder
            key={image + index}
            accent={venue.visualAccent}
            icon={venue.icon}
            imageCount={venue.images.length}
            currentIndex={index + 2}
            className="hidden aspect-square rounded-2xl sm:flex"
          />
        ))}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {venue.badge && (
            <span className="inline-block rounded-full bg-paper-dim px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
              {venue.badge === "new" ? "New" : venue.badge === "popular" ? "Popular" : "Great for nightlife"}
            </span>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {venue.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {venue.neighborhood}, {venue.city} · {SPACE_TYPE_LABELS[venue.spaceType]}
          </p>
          <p className="mt-4 text-base leading-relaxed text-ink-soft">{venue.description}</p>

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">Good for</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {venue.eventTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft"
                >
                  {EVENT_TYPE_LABELS[type]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg font-semibold text-ink">Amenities</h2>
            <div className="mt-3">
              <VenueAmenityList amenities={venue.amenities} />
            </div>
          </div>

          {allowedRules.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Venue rules</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {allowedRules.map((key) => (
                  <li key={key}>{RULE_LABELS[key]}</li>
                ))}
              </ul>
            </div>
          )}

          {venue.availabilityExamples.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">
                Typical availability
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {venue.availabilityExamples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-line bg-paper p-6">
            <p className="font-display text-2xl font-semibold text-ink">
              {formatPriceRange(venue.minHourlyRate, venue.maxHourlyRate)}
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Max capacity</dt>
                <dd className="font-medium text-ink">{venue.maxCapacity} guests</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Seated capacity</dt>
                <dd className="font-medium text-ink">{venue.seatedCapacity} guests</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Minimum booking</dt>
                <dd className="font-medium text-ink">{venue.minBookingHours} hours</dd>
              </div>
              {venue.rules.coiRequired && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Insurance</dt>
                  <dd className="font-medium text-ink">COI required</dd>
                </div>
              )}
              {venue.rules.securityDepositRequired && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Deposit</dt>
                  <dd className="font-medium text-ink">Required</dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              disabled
              className="mt-5 w-full cursor-not-allowed rounded-full bg-wine/50 px-5 py-2.5 text-sm font-semibold text-paper"
            >
              Request to book
            </button>
            <p className="mt-2 text-center text-xs text-ink-soft">
              Booking requests aren&apos;t connected yet.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
