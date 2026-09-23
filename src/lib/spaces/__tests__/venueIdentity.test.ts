import { describe, expect, it } from "vitest";
import { publicTitleLeaksRealName, resolveVenueDisclosure } from "../venueIdentity";

const venue = {
  id: "v-1",
  name: "Sunlit Mission loft with a rooftop deck",
  realName: "The Green Room",
  exactAddress: "1234 Valencia St, San Francisco, CA",
  ownerId: "owner-1",
};

describe("resolveVenueDisclosure", () => {
  it("withholds everything from a signed-out visitor", () => {
    expect(resolveVenueDisclosure({ venue, viewerId: null, viewerBookings: [] })).toEqual({
      realName: null,
      exactAddress: null,
      reason: "withheld",
    });
  });

  it("withholds from a signed-in planner with no booking here", () => {
    const result = resolveVenueDisclosure({ venue, viewerId: "planner-1", viewerBookings: [] });
    expect(result.reason).toBe("withheld");
    expect(result.exactAddress).toBeNull();
  });

  it("withholds while the booking is still pending", () => {
    const result = resolveVenueDisclosure({
      venue,
      viewerId: "planner-1",
      viewerBookings: [{ organizerId: "planner-1", venueId: "v-1", status: "pending" }],
    });
    expect(result.reason).toBe("withheld");
  });

  it("withholds on a declined booking", () => {
    const result = resolveVenueDisclosure({
      venue,
      viewerId: "planner-1",
      viewerBookings: [{ organizerId: "planner-1", venueId: "v-1", status: "declined" }],
    });
    expect(result.reason).toBe("withheld");
  });

  it("discloses once the planner's booking is confirmed", () => {
    const result = resolveVenueDisclosure({
      venue,
      viewerId: "planner-1",
      viewerBookings: [{ organizerId: "planner-1", venueId: "v-1", status: "confirmed" }],
    });
    expect(result).toEqual({
      realName: "The Green Room",
      exactAddress: "1234 Valencia St, San Francisco, CA",
      reason: "confirmed_booking",
    });
  });

  it("ignores a confirmed booking at a different venue", () => {
    const result = resolveVenueDisclosure({
      venue,
      viewerId: "planner-1",
      viewerBookings: [{ organizerId: "planner-1", venueId: "v-other", status: "confirmed" }],
    });
    expect(result.reason).toBe("withheld");
  });

  it("ignores someone else's confirmed booking at this venue", () => {
    // The caller is expected to pass only the viewer's own bookings, but the
    // rule must not depend on that being true.
    const result = resolveVenueDisclosure({
      venue,
      viewerId: "planner-1",
      viewerBookings: [{ organizerId: "planner-2", venueId: "v-1", status: "confirmed" }],
    });
    expect(result.reason).toBe("withheld");
  });

  it("always discloses to the owner", () => {
    const result = resolveVenueDisclosure({ venue, viewerId: "owner-1", viewerBookings: [] });
    expect(result.reason).toBe("owner");
    expect(result.realName).toBe("The Green Room");
  });

  it("does not treat a null ownerId as matching a viewer", () => {
    const seed = { ...venue, ownerId: null, realName: undefined };
    const result = resolveVenueDisclosure({ venue: seed, viewerId: "planner-1", viewerBookings: [] });
    expect(result.reason).toBe("withheld");
  });

  it("returns a null realName for a listing that never had one", () => {
    const seed = { ...venue, realName: undefined };
    const result = resolveVenueDisclosure({
      venue: seed,
      viewerId: "planner-1",
      viewerBookings: [{ organizerId: "planner-1", venueId: "v-1", status: "confirmed" }],
    });
    expect(result.realName).toBeNull();
    expect(result.exactAddress).toBe(venue.exactAddress);
  });

  it("treats a whitespace-only realName as absent", () => {
    const result = resolveVenueDisclosure({
      venue: { ...venue, realName: "   " },
      viewerId: "owner-1",
      viewerBookings: [],
    });
    expect(result.realName).toBeNull();
  });
});

describe("publicTitleLeaksRealName", () => {
  it("catches the name verbatim", () => {
    expect(publicTitleLeaksRealName("The Green Room — a Mission loft", "The Green Room")).toBe(true);
  });

  it("ignores case and punctuation", () => {
    expect(publicTitleLeaksRealName("the green room, mission district", "The Green Room!")).toBe(true);
  });

  it("catches the distinctive words scattered through the title", () => {
    expect(publicTitleLeaksRealName("A green loft in the Mission with room for 80", "Green Room")).toBe(true);
  });

  it("allows a genuinely descriptive title", () => {
    expect(publicTitleLeaksRealName("Sunlit Mission loft with a rooftop deck", "The Green Room")).toBe(false);
  });

  it("does not fire on generic words alone", () => {
    // "The Mission Loft" is all generic/place words — flagging every title that
    // says "loft" would make the field unfillable.
    expect(publicTitleLeaksRealName("Bright loft in the Mission", "The Mission Loft")).toBe(false);
  });

  it("allows a partial overlap", () => {
    expect(publicTitleLeaksRealName("Green-walled photo studio", "Green Room Collective")).toBe(false);
  });

  it("returns false when either side is empty", () => {
    expect(publicTitleLeaksRealName("", "The Green Room")).toBe(false);
    expect(publicTitleLeaksRealName("Sunlit loft", "")).toBe(false);
  });
});
