import { describe, expect, it } from "vitest";
import {
  contextFromBooking,
  contextFromStandaloneDetails,
  getEmptyStandaloneDetails,
  validateStandaloneDetails,
  type StandaloneRequestDetails,
} from "../requestContext";
import type { Booking } from "@/lib/types/spaces";

const booking: Booking = {
  id: "b-1",
  venueId: "v-1",
  venueName: "Sunlit Mission loft",
  venueSlug: "sunlit-mission-loft",
  organizerId: "planner-1",
  organizerName: "Ryan",
  eventDate: "2026-08-23",
  startTime: "18:00",
  endTime: "23:00",
  attendees: 80,
  status: "confirmed",
  coiAgreed: true,
  depositAgreed: true,
  eventName: "Summer Social",
  eventType: "party",
  createdAt: "2026-06-01T00:00:00.000Z",
};

const cityCoordinates = { lat: 37.788, lng: -122.4075 };

const validDetails: StandaloneRequestDetails = {
  eventDate: "2026-09-12",
  startTime: "19:00",
  endTime: "23:00",
  attendees: "60",
  publicLocation: "Mission District",
};

describe("contextFromBooking", () => {
  it("carries the booking's anchor and details through", () => {
    const context = contextFromBooking(booking, "Mission District", cityCoordinates);
    expect(context).toMatchObject({
      bookingId: "b-1",
      eventDate: "2026-08-23",
      startTime: "18:00",
      endTime: "23:00",
      attendees: 80,
      publicLocation: "Mission District",
      eventLabel: "Summer Social",
    });
  });

  it("never renders a raw ISO date in the note a planner reads", () => {
    const context = contextFromBooking(booking, "Mission District", cityCoordinates);
    expect(context.sourceNote).not.toContain("2026-08-23");
    expect(context.sourceNote).toContain("80 guests");
  });
});

describe("validateStandaloneDetails", () => {
  it("accepts complete details", () => {
    expect(validateStandaloneDetails(validDetails)).toEqual({});
  });

  it("requires a date", () => {
    expect(validateStandaloneDetails({ ...validDetails, eventDate: "" }).eventDate).toBeTruthy();
  });

  it("requires both times", () => {
    expect(validateStandaloneDetails({ ...validDetails, startTime: "" }).startTime).toBeTruthy();
    expect(validateStandaloneDetails({ ...validDetails, endTime: "" }).startTime).toBeTruthy();
  });

  it("requires a rough location", () => {
    expect(validateStandaloneDetails({ ...validDetails, publicLocation: "   " }).publicLocation).toBeTruthy();
  });

  it("allows a blank guest count — the planner may not know yet", () => {
    expect(validateStandaloneDetails({ ...validDetails, attendees: "" })).toEqual({});
  });

  it("rejects a zero or negative guest count", () => {
    expect(validateStandaloneDetails({ ...validDetails, attendees: "0" }).attendees).toBeTruthy();
    expect(validateStandaloneDetails({ ...validDetails, attendees: "-5" }).attendees).toBeTruthy();
  });

  it("starts empty except for the only city Foundry serves", () => {
    const empty = getEmptyStandaloneDetails();
    expect(empty.eventDate).toBe("");
    expect(empty.publicLocation).toBe("San Francisco");
  });
});

describe("contextFromStandaloneDetails", () => {
  it("produces an unanchored context", () => {
    const context = contextFromStandaloneDetails(validDetails, cityCoordinates);
    expect(context.bookingId).toBeNull();
    expect(context.attendees).toBe(60);
    expect(context.coordinates).toEqual(cityCoordinates);
    expect(context.publicLocation).toBe("Mission District");
  });

  it("stores an absent guest count as null, not zero", () => {
    const context = contextFromStandaloneDetails({ ...validDetails, attendees: "" }, cityCoordinates);
    expect(context.attendees).toBeNull();
  });

  it("labels itself as unassigned so it can't be mistaken for an event", () => {
    const context = contextFromStandaloneDetails(validDetails, cityCoordinates);
    expect(context.eventLabel).toMatch(/not assigned/i);
    expect(context.sourceNote).toMatch(/assign this vendor/i);
  });

  it("never renders a raw ISO date in the label", () => {
    const context = contextFromStandaloneDetails(validDetails, cityCoordinates);
    expect(context.eventLabel).not.toContain("2026-09-12");
  });
});
