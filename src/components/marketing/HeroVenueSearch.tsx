"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCATION, DEFAULT_RADIUS_MILES } from "@/lib/spaces/locations";
import { EVENT_DESCRIPTION_MAX, EVENT_DESCRIPTION_PARAM } from "@/lib/spaces/bookingPrefill";
import EventTypeSelect from "@/components/spaces/EventTypeSelect";
import {
  FIELD_CLASS,
  FORM_STACK_CLASS,
  LABEL_CLASS,
  LocationField,
  SUBMIT_CLASS,
  TEXTAREA_CLASS,
} from "./HeroSearchFields";
import type { EventType } from "@/lib/types/spaces";

/**
 * The fastest path from the homepage into a pre-filtered Discover Spaces
 * result set. Every field maps onto a filter the spaces page already
 * understands (src/lib/spaces/urlState.ts), so this only builds a query
 * string — no filtering logic lives here.
 *
 * Deliberately does NOT ask about vendors. A planner looking for a room
 * should not have to declare a DJ budget to see rooms; the Find Vendors tab
 * is the entry point for that, and it stands on its own.
 */
export default function HeroVenueSearch() {
  const router = useRouter();
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      location: DEFAULT_LOCATION.label,
      lat: DEFAULT_LOCATION.coordinates.lat.toString(),
      lng: DEFAULT_LOCATION.coordinates.lng.toString(),
      radius: DEFAULT_RADIUS_MILES.toString(),
    });
    if (eventType) params.set("eventType", eventType);
    if (date) params.set("date", date);
    if (startTime) params.set("start", startTime);
    if (endTime) params.set("end", endTime);

    // "attendees" is the existing filter key — it drives filterByCapacity(),
    // which keeps venues whose maxCapacity clears the count.
    const guests = Number(guestCount);
    if (Number.isFinite(guests) && guests > 0) params.set("attendees", Math.floor(guests).toString());

    // Filters nothing — it rides along to seed "Notes for the host" on
    // whichever venue the planner ends up picking. See bookingPrefill.ts.
    const trimmedDescription = description.trim();
    if (trimmedDescription) params.set(EVENT_DESCRIPTION_PARAM, trimmedDescription);

    router.push(`/spaces?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_STACK_CLASS} aria-label="Search event spaces">
      <div>
        <label htmlFor="hero-event-type" className={LABEL_CLASS}>
          Event type
        </label>
        <div className="mt-1">
          <EventTypeSelect id="hero-event-type" value={eventType} onChange={setEventType} />
        </div>
      </div>

      <LocationField />

      {/*
        Date pairs with guest count, and start with end. Five full-width rows
        made this the tallest thing in the hero, and date/guests are both
        short values that don't need the width — the card is ~110px shorter
        for pairing them, which is height the vendor tab was left staring at.
      */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hero-date" className={LABEL_CLASS}>
            Date
          </label>
          <input
            id="hero-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </div>
        <div>
          <label htmlFor="hero-guests" className={LABEL_CLASS}>
            Guests
          </label>
          <input
            id="hero-guests"
            type="number"
            inputMode="numeric"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="How many?"
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hero-start" className={LABEL_CLASS}>
            Start
          </label>
          <input
            id="hero-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </div>
        <div>
          <label htmlFor="hero-end" className={LABEL_CLASS}>
            End
          </label>
          <input
            id="hero-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={`mt-1 ${FIELD_CLASS}`}
          />
        </div>
      </div>

      {/*
        Not a filter — no venue field could be matched against free text. It's
        collected here so that the moment a planner picks a room, the note to
        the host is already written, the same way the date and times are
        already filled in.
      */}
      <div>
        <label htmlFor="hero-venue-description" className={LABEL_CLASS}>
          About your event (optional)
        </label>
        <textarea
          id="hero-venue-description"
          rows={2}
          maxLength={EVENT_DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A 40th birthday dinner — we'd want a toast around nine and we're bringing our own DJ."
          className={`mt-1 resize-none ${TEXTAREA_CLASS}`}
        />
        <p className="mt-0.5 text-[11px] text-ink-soft">
          We&apos;ll pass this along to the venue you pick.
        </p>
      </div>

      <button type="submit" className={SUBMIT_CLASS}>
        Search spaces
      </button>
    </form>
  );
}
