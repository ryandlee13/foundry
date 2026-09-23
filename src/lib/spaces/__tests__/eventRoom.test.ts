import { describe, expect, it } from "vitest";
import {
  computeEventRoomParticipants,
  evaluateAssignment,
  evaluateEventRoomReadiness,
  selectAssignableBookings,
} from "../eventRoom";

describe("computeEventRoomParticipants", () => {
  it("puts the venue host and every vendor in the room", () => {
    expect(
      computeEventRoomParticipants({
        venueOwnerId: "venue-1",
        vendorOwnerIds: ["dj-1", "photo-1"],
        organizerId: "planner-1",
      })
    ).toEqual(["venue-1", "dj-1", "photo-1"]);
  });

  it("never lists the organizer as a participant — they're the thread owner", () => {
    expect(
      computeEventRoomParticipants({
        venueOwnerId: "planner-1",
        vendorOwnerIds: ["planner-1", "dj-1"],
        organizerId: "planner-1",
      })
    ).toEqual(["dj-1"]);
  });

  it("dedupes an account that is both the host and a vendor", () => {
    expect(
      computeEventRoomParticipants({
        venueOwnerId: "venue-1",
        vendorOwnerIds: ["venue-1", "dj-1"],
        organizerId: "planner-1",
      })
    ).toEqual(["venue-1", "dj-1"]);
  });

  it("omits a venue with no host account", () => {
    expect(
      computeEventRoomParticipants({ venueOwnerId: null, vendorOwnerIds: ["dj-1"], organizerId: "planner-1" })
    ).toEqual(["dj-1"]);
  });
});

describe("evaluateEventRoomReadiness", () => {
  const ready = {
    booking: { organizerId: "planner-1", status: "confirmed" as const },
    venueOwnerId: "venue-1",
    vendorOwnerIds: ["dj-1"],
    actorAccountId: "planner-1",
  };

  it("lets the organizer open the room once a venue and a vendor are both locked in", () => {
    expect(evaluateEventRoomReadiness(ready)).toEqual({ ready: true, reason: null });
  });

  it("refuses anyone who isn't the organizer", () => {
    expect(evaluateEventRoomReadiness({ ...ready, actorAccountId: "venue-1" })).toEqual({
      ready: false,
      reason: "not_organizer",
    });
    expect(evaluateEventRoomReadiness({ ...ready, actorAccountId: "dj-1" }).reason).toBe("not_organizer");
  });

  it("refuses a pending booking", () => {
    expect(
      evaluateEventRoomReadiness({ ...ready, booking: { organizerId: "planner-1", status: "pending" } }).reason
    ).toBe("booking_not_confirmed");
  });

  it("refuses a declined booking", () => {
    expect(
      evaluateEventRoomReadiness({ ...ready, booking: { organizerId: "planner-1", status: "declined" } }).reason
    ).toBe("booking_not_confirmed");
  });

  it("refuses a seed venue with nobody to introduce", () => {
    expect(evaluateEventRoomReadiness({ ...ready, venueOwnerId: null }).reason).toBe("no_venue_host");
  });

  it("refuses until a vendor has actually confirmed", () => {
    // A room with only the venue in it duplicates the booking thread that
    // already exists — the three-way introduction is the whole point.
    expect(evaluateEventRoomReadiness({ ...ready, vendorOwnerIds: [] }).reason).toBe("no_confirmed_vendor");
  });

  it("checks the actor before anything else, so a non-organizer never learns the booking's state", () => {
    const result = evaluateEventRoomReadiness({
      ...ready,
      actorAccountId: "stranger",
      booking: { organizerId: "planner-1", status: "pending" },
    });
    expect(result.reason).toBe("not_organizer");
  });
});

describe("evaluateAssignment", () => {
  const ok = {
    engagement: { organizerId: "planner-1", bookingId: null, status: "confirmed" as const },
    booking: { organizerId: "planner-1", status: "confirmed" as const },
    actorAccountId: "planner-1",
  };

  it("lets the organizer attach a loose confirmed vendor to their confirmed event", () => {
    expect(evaluateAssignment(ok)).toEqual({ ok: true, reason: null });
  });

  it("accepts an in-progress or completed engagement too", () => {
    expect(evaluateAssignment({ ...ok, engagement: { ...ok.engagement, status: "in_progress" } }).ok).toBe(true);
    expect(evaluateAssignment({ ...ok, engagement: { ...ok.engagement, status: "completed" } }).ok).toBe(true);
  });

  it("refuses a vendor who hasn't confirmed yet", () => {
    expect(
      evaluateAssignment({
        ...ok,
        engagement: { ...ok.engagement, status: "pending_vendor_confirmation" },
      }).reason
    ).toBe("engagement_not_active");
  });

  it("refuses an engagement the vendor declined or cancelled", () => {
    expect(
      evaluateAssignment({ ...ok, engagement: { ...ok.engagement, status: "declined_by_vendor" } }).reason
    ).toBe("engagement_not_active");
    expect(
      evaluateAssignment({ ...ok, engagement: { ...ok.engagement, status: "canceled_by_vendor" } }).reason
    ).toBe("engagement_not_active");
  });

  it("refuses to move a vendor already attached to an event", () => {
    // Reassignment would change who is in an event room they've been talking
    // in — assignment is one-way on purpose.
    expect(
      evaluateAssignment({ ...ok, engagement: { ...ok.engagement, bookingId: "b-other" } }).reason
    ).toBe("already_assigned");
  });

  it("refuses an unconfirmed event", () => {
    expect(
      evaluateAssignment({ ...ok, booking: { organizerId: "planner-1", status: "pending" } }).reason
    ).toBe("booking_not_confirmed");
  });

  it("refuses anyone who isn't the organizer of both sides", () => {
    expect(evaluateAssignment({ ...ok, actorAccountId: "someone-else" }).reason).toBe("not_organizer");
    expect(
      evaluateAssignment({ ...ok, booking: { organizerId: "planner-2", status: "confirmed" } }).reason
    ).toBe("not_organizer");
    expect(
      evaluateAssignment({ ...ok, engagement: { ...ok.engagement, organizerId: "planner-2" } }).reason
    ).toBe("not_organizer");
  });

  it("checks the actor before anything else", () => {
    const result = evaluateAssignment({
      ...ok,
      actorAccountId: "stranger",
      engagement: { ...ok.engagement, bookingId: "b-other" },
    });
    expect(result.reason).toBe("not_organizer");
  });
});

describe("selectAssignableBookings", () => {
  const bookings = [
    { id: "b-1", organizerId: "planner-1", status: "confirmed" as const },
    { id: "b-2", organizerId: "planner-1", status: "pending" as const },
    { id: "b-3", organizerId: "planner-1", status: "declined" as const },
    { id: "b-4", organizerId: "planner-2", status: "confirmed" as const },
  ];

  it("offers only the organizer's own confirmed events", () => {
    expect(selectAssignableBookings(bookings, "planner-1").map((b) => b.id)).toEqual(["b-1"]);
  });

  it("returns nothing when the planner has no confirmed events yet", () => {
    expect(selectAssignableBookings(bookings, "planner-3")).toEqual([]);
  });
});
