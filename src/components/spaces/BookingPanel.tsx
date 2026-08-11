"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { addBooking } from "@/lib/spaces/bookings";
import { EVENT_TYPE_LABELS } from "@/lib/spaces/labels";
import {
  evaluateBookingRequest,
  toVenueBookingPolicy,
  getBlockingViolations,
  getConfirmableViolations,
  formatBookingWindow,
  formatBookingIncrement,
  type BookingConstraintViolation,
} from "@/lib/spaces/bookingConstraints";
import Dialog from "@/components/ui/Dialog";
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
  const [coiAgreed, setCoiAgreed] = useState(false);
  const [depositAgreed, setDepositAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const [pendingViolations, setPendingViolations] = useState<BookingConstraintViolation[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  function handleBookClick() {
    if (!isLoading && !user) {
      router.push(`/sign-in?next=${encodeURIComponent(`/spaces/${venue.slug}`)}`);
    }
  }

  function submitBooking() {
    if (!user) return;
    if (venue.rules.coiRequired && !coiAgreed) {
      setError("This venue requires a Certificate of Insurance — check the box to agree.");
      setConfirmDialogOpen(false);
      return;
    }
    if (venue.rules.securityDepositRequired && !depositAgreed) {
      setError("This venue requires a security deposit — check the box to agree.");
      setConfirmDialogOpen(false);
      return;
    }

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
    });
    setRequestedId(booking.id);
    setConfirmDialogOpen(false);
  }

  function handleConfirm() {
    if (!user) return;
    setError(null);

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

    submitBooking();
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
              {eventDate} · {startTime}–{endTime} · {attendees} guests
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Waiting on the host to accept — you&apos;ll see it confirmed on your dashboard.
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
            </div>

            {(venue.rules.coiRequired || venue.rules.securityDepositRequired) && (
              <div className="space-y-2 rounded-lg bg-paper-dim px-3.5 py-3">
                <p className="text-xs font-semibold text-ink">This venue requires:</p>
                {venue.rules.coiRequired && (
                  <label className="flex items-start gap-2 text-xs text-ink">
                    <input
                      type="checkbox"
                      checked={coiAgreed}
                      onChange={(event) => setCoiAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                    />
                    I&apos;ll provide a Certificate of Insurance
                  </label>
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
            onClick={submitBooking}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Submit anyway
          </button>
        </div>
      </Dialog>
    </div>
  );
}
