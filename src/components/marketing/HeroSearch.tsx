"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCATION, DEFAULT_RADIUS_MILES } from "@/lib/spaces/locations";
import EventTypeSelect from "@/components/spaces/EventTypeSelect";
import type { EventType } from "@/lib/types/spaces";

const FIELD_CLASS =
  "w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";
const LABEL_CLASS = "block text-xs font-semibold uppercase tracking-wide text-ink-soft";

/**
 * Hero search: the fastest path from the homepage into a pre-filtered
 * Discover Spaces result set. Every field maps onto a filter the spaces page
 * already understands (see src/lib/spaces/urlState.ts), so this only builds
 * a query string — no filtering logic lives here.
 *
 * Location is fixed to San Francisco for now: it's the only market, and
 * offering a free-text city field would imply coverage that doesn't exist.
 */
export default function HeroSearch() {
  const router = useRouter();
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

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
    router.push(`/spaces?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6"
      aria-label="Search event spaces"
    >
      <div>
        <label htmlFor="hero-event-type" className={LABEL_CLASS}>
          Event type
        </label>
        <div className="mt-1.5">
          <EventTypeSelect id="hero-event-type" value={eventType} onChange={setEventType} />
        </div>
      </div>

      <div>
        <label htmlFor="hero-location" className={LABEL_CLASS}>
          Location
        </label>
        <input
          id="hero-location"
          type="text"
          value="San Francisco, CA"
          readOnly
          aria-describedby="hero-location-note"
          className={`mt-1.5 cursor-not-allowed ${FIELD_CLASS} text-ink-soft`}
        />
        <p id="hero-location-note" className="mt-1 text-xs text-ink-soft">
          San Francisco only for now.
        </p>
      </div>

      <div>
        <label htmlFor="hero-date" className={LABEL_CLASS}>
          Date
        </label>
        <input
          id="hero-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`mt-1.5 ${FIELD_CLASS}`}
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
            className={`mt-1.5 ${FIELD_CLASS}`}
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
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-1 w-full rounded-full bg-wine px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
      >
        Search spaces
      </button>
    </form>
  );
}
