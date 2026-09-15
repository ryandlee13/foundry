"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCATION, DEFAULT_RADIUS_MILES } from "@/lib/spaces/locations";
import EventTypeSelect from "@/components/spaces/EventTypeSelect";
import { FIELD_CLASS, LABEL_CLASS, LocationField, SUBMIT_CLASS } from "./HeroSearchFields";
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

    router.push(`/spaces?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Search event spaces">
      <div>
        <label htmlFor="hero-event-type" className={LABEL_CLASS}>
          Event type
        </label>
        <div className="mt-1">
          <EventTypeSelect id="hero-event-type" value={eventType} onChange={setEventType} />
        </div>
      </div>

      <LocationField id="hero-venue-location" />

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

      <div>
        <label htmlFor="hero-guests" className={LABEL_CLASS}>
          Guest count
        </label>
        <input
          id="hero-guests"
          type="number"
          inputMode="numeric"
          min={1}
          value={guestCount}
          onChange={(e) => setGuestCount(e.target.value)}
          placeholder="How many people?"
          className={`mt-1 ${FIELD_CLASS}`}
        />
      </div>

      <button type="submit" className={SUBMIT_CLASS}>
        Search spaces
      </button>
    </form>
  );
}
