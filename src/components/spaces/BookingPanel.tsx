"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { addBooking } from "@/lib/spaces/bookings";
import type { Venue } from "@/lib/types/spaces";

function formatPriceRange(min: number, max: number): string {
  return min === max ? `$${min}/hr` : `$${min}–$${max}/hr`;
}

export default function BookingPanel({ venue }: { venue: Venue }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [attendees, setAttendees] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  function handleBookClick() {
    if (!isLoading && !user) {
      router.push(`/sign-in?next=${encodeURIComponent(`/spaces/${venue.slug}`)}`);
    }
  }

  function handleConfirm() {
    if (!user) return;
    setError(null);

    if (!eventDate || !startTime || !endTime || !attendees) {
      setError("Fill in a date, start/end time, and guest count.");
      return;
    }
    if (Number(attendees) > venue.maxCapacity) {
      setError(`This space holds up to ${venue.maxCapacity} guests.`);
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
    });
    setConfirmedId(booking.id);
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

      <div className="mt-5 border-t border-line pt-5">
        {confirmedId ? (
          <div className="text-center">
            <p className="font-display text-base font-semibold text-ink">Booking confirmed</p>
            <p className="mt-1 text-xs text-ink-soft">
              {eventDate} · {startTime}–{endTime} · {attendees} guests
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

            {error && <p className="text-xs text-wine">{error}</p>}

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Confirm booking
            </button>
            <p className="text-center text-xs text-ink-soft">
              Booking confirms instantly in this prototype — no quote step yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
