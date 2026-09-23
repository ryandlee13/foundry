"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { getBookingsForOrganizer, formatEventDate, formatEventLabel } from "@/lib/spaces/bookings";
import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { assignEngagementToBooking, selectAssignableBookings } from "@/lib/spaces/eventRoom";
import { getEventNeedsForOrganizer, computeEventNeedPhase } from "@/lib/vendors/eventNeeds";
import { getProposalsForNeed } from "@/lib/vendors/proposals";
import { getUnassignedEngagementsForOrganizer } from "@/lib/vendors/engagements";
import { getVendorProfileById } from "@/lib/vendors/profiles";
import { organizerProposalsPath } from "@/lib/vendors/organizerRoutes";
import { getSkillName } from "@/lib/vendors/skills";
import {
  contextFromStandaloneDetails,
  getEmptyStandaloneDetails,
  validateStandaloneDetails,
  type StandaloneRequestDetails,
  type VendorRequestContext,
} from "@/lib/vendors/requestContext";
import { DEFAULT_LOCATION } from "@/lib/spaces/locations";
import { EVENT_NEED_PHASE_LABELS, PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import Dialog from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import VendorNeedsBuilder from "./VendorNeedsBuilder";
import type { Booking } from "@/lib/types/spaces";
import type { EventNeed, EventNeedPhase, VendorEngagement, VendorProfile } from "@/lib/types/vendors";

const FIELD =
  "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";
const LABEL = "block text-xs font-medium text-ink-soft";

/**
 * Where a planner hires vendors before they have a venue, and attaches them to
 * an event afterwards.
 *
 * The prototype used to require a confirmed booking before any vendor request
 * could exist, which meant a planner who'd locked in a DJ first had nowhere to
 * put them. Requests here carry `bookingId: null` until assigned.
 */
export default function UnassignedVendorsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [needs, setNeeds] = useState<EventNeed[]>([]);
  const [phaseByNeed, setPhaseByNeed] = useState<Record<string, EventNeedPhase>>({});
  const [bidCounts, setBidCounts] = useState<Record<string, number>>({});
  const [engagements, setEngagements] = useState<VendorEngagement[]>([]);
  const [vendorsById, setVendorsById] = useState<Record<string, VendorProfile>>({});
  const [assignableBookings, setAssignableBookings] = useState<Booking[]>([]);
  const [pickedBooking, setPickedBooking] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [details, setDetails] = useState<StandaloneRequestDetails>(getEmptyStandaloneDetails);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [context, setContext] = useState<VendorRequestContext | null>(null);

  const refresh = useCallback(() => {
    if (!user) return;
    const loose = getEventNeedsForOrganizer(user.id).filter((need) => need.bookingId === null);
    setNeeds(loose);

    const phases: Record<string, EventNeedPhase> = {};
    const counts: Record<string, number> = {};
    for (const need of loose) {
      const proposals = getProposalsForNeed(need.id);
      phases[need.id] = computeEventNeedPhase(need, proposals);
      counts[need.id] = proposals.length;
    }
    setPhaseByNeed(phases);
    setBidCounts(counts);

    const loose_engagements = getUnassignedEngagementsForOrganizer(user.id);
    setEngagements(loose_engagements);
    const vendors: Record<string, VendorProfile> = {};
    for (const engagement of loose_engagements) {
      const vendor = getVendorProfileById(engagement.vendorProfileId);
      if (vendor) vendors[engagement.id] = vendor;
    }
    setVendorsById(vendors);
    setAssignableBookings(selectAssignableBookings(getBookingsForOrganizer(user.id), user.id));
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  if (authLoading || !loaded) return <LoadingState label="Loading your vendors…" />;
  if (!user) return null;

  function handleStartRequest() {
    const found = validateStandaloneDetails(details);
    setDetailErrors(found);
    if (Object.keys(found).length > 0) return;
    // No venue means no address to geocode, so matching falls back to the city
    // centre — see contextFromStandaloneDetails.
    setContext(contextFromStandaloneDetails(details, DEFAULT_LOCATION.coordinates));
  }

  function handleAssign(engagementId: string) {
    if (!user) return;
    const bookingId = pickedBooking[engagementId];
    if (!bookingId) {
      setError("Pick an event to assign this vendor to.");
      return;
    }
    setError(null);
    try {
      const { thread } = assignEngagementToBooking(engagementId, bookingId, user.id);
      if (thread) {
        router.push(`/dashboard/messages/${thread.id}`);
        return;
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't assign this vendor.");
    }
  }

  function closeDialog() {
    setDetailsOpen(false);
    setContext(null);
    setDetails(getEmptyStandaloneDetails());
    setDetailErrors({});
  }

  return (
    <div>
      <Link href="/dashboard/organizer" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← Back to organizer dashboard
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-semibold text-ink">Vendors without an event</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Line up vendors before you&apos;ve booked a space. Once you have a venue, assign them to it here and
          everyone moves into one shared conversation.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-gradient-to-br from-paper to-paper-dim p-8 text-center">
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="rounded-full bg-wine px-7 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Hire a vendor
        </button>
        <p className="mt-3 text-sm text-ink-soft">No venue needed — tell us the date and roughly where.</p>
      </div>

      {error && <p className="mt-4 rounded-lg bg-wine/10 px-3.5 py-2.5 text-sm text-wine">{error}</p>}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Confirmed vendors</h2>
        {engagements.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-ink-soft">
            No unassigned vendors. Anyone you hire without an event shows up here until you attach them to one.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {engagements.map((engagement) => {
              const vendor = vendorsById[engagement.id];
              return (
                <li key={engagement.id} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold text-ink">
                        {vendor?.displayName ?? "Vendor"}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        ${engagement.agreedAmount.toLocaleString()}{" "}
                        {PRICING_MODEL_LABELS[engagement.pricingModel].toLowerCase()}
                      </p>
                    </div>
                    <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-semibold text-ink-soft">
                      Not assigned to an event
                    </span>
                  </div>

                  {assignableBookings.length === 0 ? (
                    <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
                      Book a venue and confirm it, then you can attach this vendor to that event.{" "}
                      <Link href="/spaces" className="font-semibold text-brass-dark hover:underline">
                        Discover spaces
                      </Link>
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
                      <div className="min-w-[220px] flex-1">
                        <label htmlFor={`assign-${engagement.id}`} className={LABEL}>
                          Assign to event
                        </label>
                        <select
                          id={`assign-${engagement.id}`}
                          value={pickedBooking[engagement.id] ?? ""}
                          onChange={(event) =>
                            setPickedBooking((current) => ({ ...current, [engagement.id]: event.target.value }))
                          }
                          className={FIELD}
                        >
                          <option value="">Choose an event…</option>
                          {assignableBookings.map((booking) => (
                            <option key={booking.id} value={booking.id}>
                              {formatEventLabel(booking)} · {formatEventDate(booking.eventDate)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAssign(engagement.id)}
                        className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
                      >
                        Assign &amp; open event room
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Open requests</h2>
        {needs.length === 0 ? (
          <EmptyState
            title="No open requests"
            description="Post a vendor request above and bids will show up here."
          />
        ) : (
          <ul className="mt-3 space-y-3">
            {needs.map((need) => (
              <li
                key={need.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-ink">
                    {need.title || getSkillName(need.skillSlug)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {formatEventDate(need.eventDate)} · {formatTimeRange(need.startTime, need.endTime)} ·{" "}
                    {need.publicLocation}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-soft">{bidCounts[need.id] ?? 0} bids</span>
                  <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-semibold text-ink-soft">
                    {EVENT_NEED_PHASE_LABELS[phaseByNeed[need.id] ?? "not_started"]}
                  </span>
                  <Link
                    href={organizerProposalsPath(null, need.id)}
                    className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                  >
                    Review bids
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={detailsOpen}
        onClose={closeDialog}
        labelledBy="standalone-vendor-title"
        panelClassName="w-full max-w-xl p-6 sm:p-8"
      >
        <h2 id="standalone-vendor-title" className="font-display text-xl font-semibold text-ink">
          Hire a vendor
        </h2>

        {context ? (
          <div className="mt-4">
            <VendorNeedsBuilder
              context={context}
              organizerId={user.id}
              onDone={() => {
                closeDialog();
                refresh();
              }}
              onCancel={closeDialog}
            />
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-soft">
              You don&apos;t need a venue yet — just the date and roughly where the event will be, so vendors can
              tell you if they&apos;re free.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="standalone-date" className={LABEL}>
                  Event date
                </label>
                <input
                  id="standalone-date"
                  type="date"
                  value={details.eventDate}
                  onChange={(event) => setDetails((d) => ({ ...d, eventDate: event.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="standalone-start" className={LABEL}>
                  Start
                </label>
                <input
                  id="standalone-start"
                  type="time"
                  value={details.startTime}
                  onChange={(event) => setDetails((d) => ({ ...d, startTime: event.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="standalone-end" className={LABEL}>
                  End
                </label>
                <input
                  id="standalone-end"
                  type="time"
                  value={details.endTime}
                  onChange={(event) => setDetails((d) => ({ ...d, endTime: event.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="standalone-location" className={LABEL}>
                  Roughly where
                </label>
                <input
                  id="standalone-location"
                  type="text"
                  value={details.publicLocation}
                  onChange={(event) => setDetails((d) => ({ ...d, publicLocation: event.target.value }))}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="standalone-attendees" className={LABEL}>
                  Guests (optional)
                </label>
                <input
                  id="standalone-attendees"
                  type="number"
                  min={1}
                  value={details.attendees}
                  onChange={(event) => setDetails((d) => ({ ...d, attendees: event.target.value }))}
                  className={FIELD}
                />
              </div>
            </div>

            {Object.values(detailErrors).length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {Object.entries(detailErrors).map(([key, message]) => (
                  <li key={key} className="text-xs text-wine">
                    {message}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRequest}
                className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Continue
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
