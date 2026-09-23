import { describe, expect, it } from "vitest";
import { computeEventRoomParticipants, evaluateEventRoomReadiness } from "../eventRoom";

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
