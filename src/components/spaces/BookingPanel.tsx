"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { addBooking, formatEventDate, getBookingsForOrganizer } from "@/lib/spaces/bookings";
import { EVENT_TYPE_LABELS } from "@/lib/spaces/labels";
import {
  evaluateBookingRequest,
  toVenueBookingPolicy,
  getBlockingViolations,
  getConfirmableViolations,
  formatBookingWindow,
  formatBookingIncrement,
  formatTimeRange,
  type BookingConstraintViolation,
} from "@/lib/spaces/bookingConstraints";
import { hasBookingPrefill, readBookingPrefill } from "@/lib/spaces/bookingPrefill";
import Dialog from "@/components/ui/Dialog";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { EventType, Venue } from "@/lib/types/spaces";

function formatPriceRange(min: number, max: number): string {
  return min === max ? `$${min}/hr` : `$${min}–$${max}/hr`;
}

export default function BookingPanel({ venue }: { venue: Venue }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventType | "">("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendees, setAttendees] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [organizerNote, setOrganizerNote] = useState("");
  const [coiAgreed, setCoiAgreed] = useState(false);
  const [depositAgreed, setDepositAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [pendingViolations, setPendingViolations] = useState<BookingConstraintViolation[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  /** Whether this was the planner's very first request, read before it was saved. */
  const [wasFirstRequest, setWasFirstRequest] = useState(false);

  /*
   * Everything the planner already answered on the homepage or in the Discover
   * Spaces filters, carried here on the venue link (bookingPrefill.ts). Runs
   * once on mount, before the form can be typed into, so it seeds the fields
   * without ever overwriting an edit.
   *
   * Reads window.location rather than useSearchParams() on purpose: calling
   * that hook here would force /spaces/[slug] to bail out of static rendering
   * into a Suspense fallback, replacing the prerendered listing with a loading
   * state on every venue page for the sake of a form field.
   */
  useEffect(() => {
    const prefill = readBookingPrefill(new URLSearchParams(window.location.search));
    if (!hasBookingPrefill(prefill)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (prefill.eventType) setEventType(prefill.eventType);
    if (prefill.eventDate) setEventDate(prefill.eventDate);
    if (prefill.startTime) setStartTime(prefill.startTime);
    if (prefill.endTime) setEndTime(prefill.endTime);
    if (prefill.attendees !== null) setAttendees(String(prefill.attendees));
    setPrefilled(true);
  }, []);

  function handleBookClick() {
    if (!isLoading && !user) {
      router.push(`/sign-in?next=${encodeURIComponent(`/spaces/${venue.slug}`)}`);
    }
  }

  /** The venue's own requirements, checked before the review step so the summary is never shown with an error waiting behind it. */
  function findMissingAgreement(): string | null {
    if (venue.rules.coiRequired && !coiAgreed) {
      return "This venue requires a Certificate of Insurance — check the box to agree.";
    }
    if (venue.rules.securityDepositRequired && !depositAgreed) {
      return "This venue requires a security deposit — check the box to agree.";
    }
    return null;
  }

  function submitBooking() {
    if (!user) return;

    // Read before the write: after addBooking() this planner always has at
    // least one, so "your first request" could never be true if asked later.
    setWasFirstRequest(getBookingsForOrganizer(user.id).length === 0);

    const booking = addBooking({
      venueId: venue.id,
      venueName: venue.name,
      venueSlug: venue.slug,
      organizerId: user.id,
      organizerName: user.name,
      eventDate,
      startTime,
      endTime,
      attendees: Number(attendees),
      coiAgreed: venue.rules.coiRequired ? coiAgreed : true,
      depositAgreed: venue.rules.securityDepositRequired ? depositAgreed : true,
      eventName: eventName.trim() || null,
      eventType: eventType || null,
      // Omitted entirely when blank, so an empty note never renders as an
      // empty "Notes from the planner" block in the host's review modal.
      ...(organizerNote.trim() ? { organizerNote: organizerNote.trim() } : {}),
    });
    setRequestedId(booking.id);
    setReviewOpen(false);
    setSuccessOpen(true);
  }

  /**
   * "Send booking request" doesn't send anything — it opens the review step.
   * Everything that could stop the request is checked here first (missing
   * agreements, then the venue's booking policy), so the summary a planner is
   * asked to confirm is one they can actually confirm.
   */
  function handleConfirm() {
    if (!user) return;
    setError(null);

    const missingAgreement = findMissingAgreement();
    if (missingAgreement) {
      setError(missingAgreement);
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const violations = evaluateBookingRequest(
      { eventDate, startTime, endTime, attendees: Number(attendees) },
      toVenueBookingPolicy(venue),
      todayIso
    );

    const blocking = getBlockingViolations(violations);
    if (blocking.length > 0) {
      setError(blocking[0].message);
      return;
    }

    const confirmable = getConfirmableViolations(violations);
    if (confirmable.length > 0) {
      setPendingViolations(confirmable);
      setConfirmDialogOpen(true);
      return;
    }

    setReviewOpen(true);
  }

  return (
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
          <dd className="font-medium text-ink">
            {venue.minBookingHours} hours{venue.minBookingHoursNegotiable && " (negotiable)"}
          </dd>
        </div>
        {formatBookingWindow(venue.earliestStartTime, venue.latestEndTime) && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">Booking hours</dt>
            <dd className="font-medium text-ink">{formatBookingWindow(venue.earliestStartTime, venue.latestEndTime)}</dd>
          </div>
        )}
        {formatBookingIncrement(venue.bookingIncrementMinutes) && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">Booking increments</dt>
            <dd className="font-medium text-ink">{formatBookingIncrement(venue.bookingIncrementMinutes)}</dd>
          </div>
        )}
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

      <div className="mt-5 border-t border-line pt-5">
        {requestedId ? (
          <div className="text-center">
            <p className="font-display text-base font-semibold text-ink">Request sent</p>
            {eventName.trim() && <p className="mt-1 text-sm font-medium text-ink">{eventName.trim()}</p>}
            <p className="mt-1 text-xs text-ink-soft">
              {formatEventDate(eventDate)} · {formatTimeRange(startTime, endTime)} · {attendees} guests
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Waiting on the host to accept. As soon as they do, your conversation with them opens in
              Messages and the venue&apos;s name and address unlock.
            </p>
            <Link
              href="/dashboard/organizer"
              className="mt-4 inline-block rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              View your bookings
            </Link>
          </div>
        ) : !isLoading && !user ? (
          <button
            type="button"
            onClick={handleBookClick}
            className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Sign in to request booking
          </button>
        ) : (
          <div className="space-y-3">
            {prefilled && (
              <p className="rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs text-ink-soft">
                Filled in from your search — change anything before you send it.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label htmlFor="booking-event-name" className="block text-xs font-medium text-ink-soft">
                  Event name (optional)
                </label>
                <input
                  id="booking-event-name"
                  type="text"
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder={`${venue.name} · ${eventDate || "your date"}`}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="booking-event-type" className="block text-xs font-medium text-ink-soft">
                  Event type (optional)
                </label>
                <select
                  id="booking-event-type"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as EventType | "")}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  <option value="">Not specified</option>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="booking-date" className="block text-xs font-medium text-ink-soft">
                  Event date
                </label>
                <input
                  id="booking-date"
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              <div>
                <label htmlFor="booking-start" className="block text-xs font-medium text-ink-soft">
                  Start
                </label>
                <input
                  id="booking-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              <div>
                <label htmlFor="booking-end" className="block text-xs font-medium text-ink-soft">
                  End
                </label>
                <input
                  id="booking-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="booking-attendees" className="block text-xs font-medium text-ink-soft">
                  Attendees
                </label>
                <input
                  id="booking-attendees"
                  type="number"
                  min={1}
                  value={attendees}
                  onChange={(event) => setAttendees(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              {/*
                The one place a planner can say something the form doesn't ask
                about. Optional on purpose — making it required would turn a
                useful aside into a box people fill with "n/a".
              */}
              <div className="col-span-2">
                <label htmlFor="booking-note" className="block text-xs font-medium text-ink-soft">
                  Notes for the host (optional)
                </label>
                <textarea
                  id="booking-note"
                  rows={3}
                  value={organizerNote}
                  onChange={(event) => setOrganizerNote(event.target.value)}
                  placeholder="Anything the host should know — it's a 40th, we'd want the patio for a toast around 9, and we're bringing our own DJ."
                  className="mt-1 w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
            </div>

            {(venue.rules.coiRequired || venue.rules.securityDepositRequired) && (
              <div className="space-y-2 rounded-lg bg-paper-dim px-3.5 py-3">
                <p className="text-xs font-semibold text-ink">This venue requires:</p>
                {venue.rules.coiRequired && (
                  /*
                    "Certificate of Insurance" is the single most alarming
                    phrase in this form for a first-time planner — it reads as
                    paperwork they've already failed to have. So the tooltip
                    leads with "not now" and promises help, rather than
                    explaining the document.
                    TODO: this promises a walkthrough that doesn't exist yet.
                    Build it (or soften the wording) before a real launch.
                  */
                  <div className="flex items-start gap-1.5">
                    <label className="flex items-start gap-2 text-xs text-ink">
                      <input
                        type="checkbox"
                        checked={coiAgreed}
                        onChange={(event) => setCoiAgreed(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                      />
                      I&apos;ll provide a Certificate of Insurance
                    </label>
                    <span className="mt-0.5">
                      <InfoTooltip label="About the Certificate of Insurance">
                        Don&apos;t worry about getting your certificate of insurance now — we&apos;ll show you
                        the quickest and cheapest way to get one.
                      </InfoTooltip>
                    </span>
                  </div>
                )}
                {venue.rules.securityDepositRequired && (
                  <label className="flex items-start gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={depositAgreed}
                      onChange={(event) => setDepositAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                    />
                    I agree to pay the required security deposit
                  </label>
                )}
              </div>
            )}

            {error && <p className="text-xs text-wine">{error}</p>}

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Send booking request
            </button>
            <p className="text-center text-xs text-ink-soft">
              The host accepts or declines from their dashboard — no quote step yet.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        labelledBy="booking-constraint-title"
        panelClassName="w-full max-w-md p-6"
      >
        <h2 id="booking-constraint-title" className="font-display text-xl font-semibold text-ink">
          {pendingViolations[0]?.confirmTitle ?? "Outside the venue's preferences"}
        </h2>
        <div className="mt-3 space-y-2 text-sm text-ink-soft">
          {pendingViolations.map((violation) => (
            <p key={violation.code}>{violation.confirmBody}</p>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmDialogOpen(false)}
            className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Change my details
          </button>
          <button
            type="button"
            onClick={() => {
              // Hands off to the review step rather than submitting outright —
              // accepting the venue's caveat isn't the same as confirming the
              // whole request.
              setConfirmDialogOpen(false);
              setReviewOpen(true);
            }}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Continue
          </button>
        </div>
      </Dialog>

      {/*
        The last look before anything is sent. A booking request is a real ask
        of a real host, and until now the only summary of one appeared *after*
        it had already gone out.
      */}
      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        labelledBy="booking-review-title"
        panelClassName="w-full max-w-md p-6"
      >
        <h2 id="booking-review-title" className="font-display text-xl font-semibold text-ink">
          Does this look right?
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          This is what {venue.name} will receive. Nothing has been sent yet.
        </p>

        <dl className="mt-4 space-y-2.5 rounded-xl bg-paper-dim px-4 py-3.5 text-sm">
          {eventName.trim() && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Event</dt>
              <dd className="text-right font-medium text-ink">{eventName.trim()}</dd>
            </div>
          )}
          {eventType && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Type</dt>
              <dd className="text-right font-medium text-ink">{EVENT_TYPE_LABELS[eventType]}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Date</dt>
            <dd className="text-right font-medium text-ink">{formatEventDate(eventDate)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Time</dt>
            <dd className="text-right font-medium text-ink">{formatTimeRange(startTime, endTime)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Guests</dt>
            <dd className="text-right font-medium text-ink">{attendees}</dd>
          </div>
          {organizerNote.trim() && (
            <div className="border-t border-line pt-2.5">
              <dt className="text-ink-soft">Notes for the host</dt>
              <dd className="mt-1 whitespace-pre-wrap text-ink">{organizerNote.trim()}</dd>
            </div>
          )}
          {(venue.rules.coiRequired || venue.rules.securityDepositRequired) && (
            <div className="border-t border-line pt-2.5 text-xs text-ink-soft">
              You&apos;ve agreed to
              {venue.rules.coiRequired && " provide a Certificate of Insurance"}
              {venue.rules.coiRequired && venue.rules.securityDepositRequired && " and"}
              {venue.rules.securityDepositRequired && " pay the required security deposit"}.
            </div>
          )}
        </dl>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setReviewOpen(false)}
            className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Edit details
          </button>
          <button
            type="button"
            onClick={submitBooking}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Confirm &amp; send
          </button>
        </div>
      </Dialog>

      <Dialog
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        labelledBy="booking-success-title"
        panelClassName="w-full max-w-md p-7 text-center"
      >
        {/*
          "First" is checked against the planner's own bookings rather than
          hardcoded — congratulating someone on their first request when it's
          their fourth reads as a form letter, which is the opposite of what
          this moment is for.
        */}
        <h2
          id="booking-success-title"
          className="font-display text-2xl font-semibold leading-snug text-green-700 sm:text-3xl"
        >
          {wasFirstRequest
            ? "Congratulations, you've sent your first booking request!"
            : "Your booking request is on its way!"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Once the booking request is accepted, rates and other details can be confirmed directly with the
          venue.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/dashboard/organizer")}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Go see event details
          </button>
          <button
            type="button"
            onClick={() => router.push("/spaces")}
            className="flex-1 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Continue browsing
          </button>
        </div>
      </Dialog>
    </div>
  );
}
