import { describe, expect, it } from "vitest";
import {
  bookingPrefillFromFilters,
  bookingPrefillToQuery,
  hasBookingPrefill,
  readBookingPrefill,
  EVENT_DESCRIPTION_MAX,
} from "../bookingPrefill";
import { getDefaultFilters } from "../urlState";

function read(query: string) {
  return readBookingPrefill(new URLSearchParams(query));
}

describe("readBookingPrefill", () => {
  it("reads a full search brief off the query string", () => {
    expect(
      read("date=2026-08-23&start=18:00&end=23:00&attendees=80&eventType=party&eventDesc=A+40th")
    ).toEqual({
      eventDate: "2026-08-23",
      startTime: "18:00",
      endTime: "23:00",
      attendees: 80,
      eventType: "party",
      eventDescription: "A 40th",
    });
  });

  it("is empty when nothing was carried", () => {
    expect(hasBookingPrefill(read(""))).toBe(false);
  });

  it("ignores malformed dates and times rather than putting junk in the form", () => {
    const prefill = read("date=08/23/2026&start=6pm&end=25:00");
    expect(prefill.eventDate).toBeNull();
    expect(prefill.startTime).toBeNull();
    expect(prefill.endTime).toBeNull();
  });

  it("ignores a guest count that isn't a positive number", () => {
    expect(read("attendees=0").attendees).toBeNull();
    expect(read("attendees=-5").attendees).toBeNull();
    expect(read("attendees=lots").attendees).toBeNull();
    expect(read("attendees=80.6").attendees).toBe(80);
  });

  it("ignores an unknown event type", () => {
    expect(read("eventType=funeral").eventType).toBeNull();
  });

  it("does not guess when the planner filtered on several event types", () => {
    expect(read("eventType=party,wedding").eventType).toBeNull();
    expect(read("eventType=party").eventType).toBe("party");
  });

  it("treats a blank event description as nothing carried", () => {
    expect(read("eventDesc=").eventDescription).toBeNull();
    expect(read("eventDesc=%20%20").eventDescription).toBeNull();
    expect(hasBookingPrefill(read("eventDesc=Rehearsal+dinner"))).toBe(true);
  });

  it("caps the event description so a pasted essay can't become the URL", () => {
    const long = "x".repeat(EVENT_DESCRIPTION_MAX + 50);
    expect(read(`eventDesc=${long}`).eventDescription).toHaveLength(EVENT_DESCRIPTION_MAX);
  });
});

describe("bookingPrefillFromFilters", () => {
  it("carries nothing from an untouched filter set", () => {
    expect(hasBookingPrefill(bookingPrefillFromFilters(getDefaultFilters()))).toBe(false);
  });

  it("carries the fields a planner actually filled in", () => {
    const prefill = bookingPrefillFromFilters({
      ...getDefaultFilters(),
      eventDate: "2026-08-23",
      startTime: "18:00",
      endTime: "23:00",
      attendees: 80,
      eventTypes: ["party"],
    });
    expect(prefill).toEqual({
      eventDate: "2026-08-23",
      startTime: "18:00",
      endTime: "23:00",
      attendees: 80,
      eventType: "party",
      eventDescription: null,
    });
  });

  it("takes the event description separately — it isn't a filter", () => {
    const prefill = bookingPrefillFromFilters(getDefaultFilters(), "  Rehearsal dinner  ");
    expect(prefill.eventDescription).toBe("Rehearsal dinner");
    expect(hasBookingPrefill(prefill)).toBe(true);
  });
});

describe("bookingPrefillToQuery", () => {
  it("round-trips through the query string", () => {
    const prefill = bookingPrefillFromFilters(
      {
        ...getDefaultFilters(),
        eventDate: "2026-08-23",
        startTime: "18:00",
        attendees: 80,
        eventTypes: ["party"],
      },
      "A 40th birthday — toast around nine."
    );
    expect(read(bookingPrefillToQuery(prefill))).toEqual(prefill);
  });

  it("produces an empty string when there is nothing to carry", () => {
    expect(bookingPrefillToQuery(bookingPrefillFromFilters(getDefaultFilters()))).toBe("");
  });
});
