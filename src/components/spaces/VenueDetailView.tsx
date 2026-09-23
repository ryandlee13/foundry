"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActiveRole } from "@/hooks/useActiveRole";
import { SPACE_TYPE_LABELS, EVENT_TYPE_LABELS, RULE_LABELS } from "@/lib/spaces/labels";
import { formatBookingWindow, formatBookingIncrement } from "@/lib/spaces/bookingConstraints";
import { getBookingsForOrganizer } from "@/lib/spaces/bookings";
import {
  VENUE_PRIVACY_NOTICE,
  VENUE_PRIVACY_NOTICE_OWNER,
  resolveVenueDisclosure,
  type VenueDisclosure,
} from "@/lib/spaces/venueIdentity";
import InfoTooltip from "@/components/ui/InfoTooltip";
import VenueAmenityList from "@/components/spaces/VenueAmenityList";
import VenueImagePlaceholder from "@/components/spaces/VenueImagePlaceholder";
import VenueHostLine from "@/components/spaces/VenueHostLine";
import VenueReviews from "@/components/spaces/VenueReviews";
import BookingPanel from "@/components/spaces/BookingPanel";
import type { Venue } from "@/lib/types/spaces";

export default function VenueDetailView({ venue }: { venue: Venue }) {
  const { user } = useAuth();
  const { activeRole } = useActiveRole();
  const [disclosure, setDisclosure] = useState<VenueDisclosure | null>(null);

  /*
   * Bookings live in localStorage, so this has to run in an effect or the
   * server render and the first client render disagree. Until it resolves the
   * page shows the withheld state, which is the safe direction to be wrong in.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisclosure(
      resolveVenueDisclosure({
        venue,
        viewerId: user?.id ?? null,
        viewerBookings: user ? getBookingsForOrganizer(user.id) : [],
      })
    );
  }, [venue, user]);

  /*
   * Only a planner on a confirmed booking gets the details rendered. The owner
   * is deliberately excluded: resolveVenueDisclosure() still returns their own
   * address to them (they're entitled to it), but showing a venue operator
   * their own street address on their own listing told them nothing.
   */
  const addressDisclosed = disclosure?.reason === "confirmed_booking";

  const allowedRules = (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[]).filter(
    (key) => venue.rules[key]
  );

  /**
   * Booking is a planner action. A venue owner or vendor arriving here from
   * their own dashboard — to look at a space they host at or are working —
   * has no use for a request form, and offering one reads as a bug.
   * Signed-out visitors still see it: they're prospective planners.
   * This is UX only; the real gate is server-side at Phase 2 (CLAUDE.md #3).
   */
  const isOwnVenue = user !== null && venue.ownerId === user.id;
  const isNonPlannerRole = activeRole === "venue_operator" || activeRole === "vendor" || activeRole === "admin";
  const canBook = !isOwnVenue && !isNonPlannerRole;

  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-4 sm:grid-rows-2">
        <VenueImagePlaceholder
          accent={venue.visualAccent}
          icon={venue.icon}
          imageCount={venue.images.length}
          photoUrl={venue.photos?.[0]}
          className="aspect-[16/10] rounded-2xl sm:col-span-3 sm:row-span-2 sm:aspect-auto"
        />
        {venue.images.slice(1, 3).map((image, index) => (
          <VenueImagePlaceholder
            key={image + index}
            accent={venue.visualAccent}
            icon={venue.icon}
            imageCount={venue.images.length}
            currentIndex={index + 2}
            photoUrl={venue.photos?.[index + 1]}
            className="hidden aspect-square rounded-2xl sm:flex"
          />
        ))}
      </div>

      {venue.videoNames && venue.videoNames.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
          🎥 Video walkthrough included
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {venue.badge && (
            <span className="inline-block rounded-full bg-paper-dim px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
              {venue.badge === "new" ? "New" : venue.badge === "popular" ? "Popular" : "Great for nightlife"}
            </span>
          )}
          {/*
            The listing is deliberately anonymous: a descriptive title and a
            district, so a planner can't search the name, find the venue's own
            site, and book around Foundry (docs/SECURITY.md #5).

            Until the address is actually disclosed, that's explained by the "i"
            beside the title rather than a banner — the rule is worth stating
            once, quietly, not given a block of page weight on every listing.
            The owner sees the same affordance: they already know their own
            address, so printing it back to them was pure noise.

            Everything below comes from resolveVenueDisclosure() — never read
            realName/exactAddress off the Venue in a component.
          */}
          <h1 className="mt-2 flex flex-wrap items-center gap-2.5 font-display text-3xl font-semibold text-ink sm:text-4xl">
            {venue.name}
            {!addressDisclosed && (
              <InfoTooltip label="Why the venue's name and address aren't shown">
                {disclosure?.reason === "owner" ? VENUE_PRIVACY_NOTICE_OWNER : VENUE_PRIVACY_NOTICE}
              </InfoTooltip>
            )}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {venue.neighborhood}, {venue.city} · {SPACE_TYPE_LABELS[venue.spaceType]}
          </p>
          <VenueHostLine ownerId={venue.ownerId} />

          {/*
            Kept for the planner who has earned it — this is the payoff of the
            whole mechanism, and the one case where the details are genuinely
            new information to the person reading.
          */}
          {addressDisclosed && disclosure && (
            <div className="mt-4 rounded-xl border border-brass/40 bg-brass/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brass-dark">
                Unlocked for your confirmed booking
              </p>
              {disclosure.realName && (
                <p className="mt-1 font-display text-base font-semibold text-ink">{disclosure.realName}</p>
              )}
              {disclosure.exactAddress && <p className="mt-0.5 text-sm text-ink">{disclosure.exactAddress}</p>}
            </div>
          )}

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
            <h2 className="font-display text-lg font-semibold text-ink">Amenities Included</h2>
            <div className="mt-3">
              <VenueAmenityList amenities={venue.amenities} amenityNotes={venue.amenityNotes} />
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

          {(formatBookingWindow(venue.earliestStartTime, venue.latestEndTime) ||
            formatBookingIncrement(venue.bookingIncrementMinutes)) && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Booking hours</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {formatBookingWindow(venue.earliestStartTime, venue.latestEndTime) && (
                  <li>Events accepted {formatBookingWindow(venue.earliestStartTime, venue.latestEndTime)}</li>
                )}
                {formatBookingIncrement(venue.bookingIncrementMinutes) && (
                  <li>Bookings in {formatBookingIncrement(venue.bookingIncrementMinutes)}</li>
                )}
              </ul>
            </div>
          )}

          {venue.ownerId === null && <VenueReviews venueId={venue.id} />}
        </div>

        {canBook && (
          <aside className="lg:col-span-1">
            <BookingPanel venue={venue} />
          </aside>
        )}
      </div>
    </>
  );
}
