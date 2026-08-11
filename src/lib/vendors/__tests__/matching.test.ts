import { describe, expect, it } from "vitest";
import { matchesSkill, matchesLocation, isMatch, getMatchReason, computeCompetitiveBidSummary } from "../matching";
import type { EventNeed, VendorProfile, VendorProposal } from "@/lib/types/vendors";

function makeProfile(overrides: Partial<VendorProfile> = {}): VendorProfile {
  return {
    id: "profile-1",
    ownerId: "account-1",
    slug: "dj-jane",
    firstName: "Jane",
    lastName: "Doe",
    displayName: "DJ Jane",
    profilePhoto: null,
    coverImage: null,
    professionalDescription: "DJ for parties.",
    yearsExperience: 5,
    websiteUrl: "",
    instagramUrl: "",
    skills: ["dj"],
    services: [],
    portfolioLinks: [],
    location: {
      homeCity: "San Francisco",
      homeRegion: "CA",
      homePostalCode: "94110",
      coordinates: { lat: 37.7509, lng: -122.4153 },
      radiusMode: 10,
      radiusMiles: 10,
      willingToTravel: false,
      remoteAvailable: false,
      remoteOnly: false,
      serviceAddress: "",
      citiesServed: [],
      typicalAvailability: "",
      leadTimeDays: 3,
    },
    notificationPreferences: {
      inAppEnabled: true,
      emailEnabled: true,
      categories: {
        matching_gigs: true,
        selected_locations: true,
        remote_gigs: true,
        bid_accepted: true,
        bid_declined: true,
        bid_expiring: true,
        new_message: true,
        event_updated: true,
        event_canceled: true,
        review_received: true,
      },
      skillSlugs: ["dj"],
      matchScope: "home_area",
    },
    status: "published",
    rejectionReason: null,
    averageRating: null,
    reviewCount: 0,
    completedEventCount: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeNeed(overrides: Partial<EventNeed> = {}): EventNeed {
  return {
    id: "need-1",
    bookingId: "booking-1",
    organizerId: "organizer-1",
    skillSlug: "dj",
    title: "Looking for a DJ",
    description: "Need a DJ for a birthday party.",
    deliverables: "4-hour set",
    locationType: "in_person",
    publicLocation: "Mission District",
    coordinates: { lat: 37.7509, lng: -122.4153 },
    eventDate: "2026-08-01",
    startTime: "20:00",
    endTime: "23:00",
    setupTime: null,
    estimatedAttendance: 80,
    positionsAvailable: 1,
    positionsFilled: 0,
    budgetMin: 300,
    budgetMax: 600,
    preferredPricingModel: null,
    equipmentRequirements: "",
    experiencePreference: null,
    portfolioRequired: false,
    proposalDeadline: "2026-07-25",
    allowQuestions: true,
    additionalNotes: "",
    status: "published",
    publishedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("matchesSkill", () => {
  it("matches when the vendor has the requested skill", () => {
    expect(matchesSkill(makeProfile({ skills: ["dj", "photographer"] }), makeNeed({ skillSlug: "dj" }))).toBe(true);
  });

  it("does not match when the vendor lacks the requested skill", () => {
    expect(matchesSkill(makeProfile({ skills: ["photographer"] }), makeNeed({ skillSlug: "dj" }))).toBe(false);
  });
});

describe("matchesLocation", () => {
  it("matches when the need is within the vendor's radius", () => {
    const profile = makeProfile({
      location: { ...makeProfile().location, coordinates: { lat: 37.7509, lng: -122.4153 }, radiusMiles: 10, radiusMode: 10 },
    });
    const need = makeNeed({ coordinates: { lat: 37.7509, lng: -122.4153 } });
    expect(matchesLocation(profile, need)).toBe(true);
  });

  it("does not match when the need is outside the vendor's radius", () => {
    const profile = makeProfile({
      location: { ...makeProfile().location, coordinates: { lat: 37.7509, lng: -122.4153 }, radiusMiles: 1, radiusMode: 5 },
    });
    // Financial District is several miles from the Mission.
    const need = makeNeed({ coordinates: { lat: 37.7946, lng: -122.3999 } });
    expect(matchesLocation(profile, need)).toBe(false);
  });

  it("matches anywhere when radiusMode is 'anywhere'", () => {
    const profile = makeProfile({ location: { ...makeProfile().location, radiusMode: "anywhere" } });
    const need = makeNeed({ coordinates: { lat: 40.7128, lng: -74.006 } }); // NYC
    expect(matchesLocation(profile, need)).toBe(true);
  });

  it("matches via a selected service city regardless of distance", () => {
    const profile = makeProfile({
      location: { ...makeProfile().location, radiusMiles: 1, citiesServed: ["Mission District"] },
    });
    const need = makeNeed({ publicLocation: "Mission District", coordinates: { lat: 40.7128, lng: -74.006 } });
    expect(matchesLocation(profile, need)).toBe(true);
  });

  it("requires remoteAvailable for remote needs regardless of radius", () => {
    const need = makeNeed({ locationType: "remote" });
    expect(matchesLocation(makeProfile({ location: { ...makeProfile().location, remoteAvailable: false } }), need)).toBe(false);
    expect(matchesLocation(makeProfile({ location: { ...makeProfile().location, remoteAvailable: true } }), need)).toBe(true);
  });

  it("a remote-only vendor only matches remote needs, ignoring proximity entirely", () => {
    const remoteOnlyProfile = makeProfile({ location: { ...makeProfile().location, remoteOnly: true, radiusMode: "anywhere" } });
    expect(matchesLocation(remoteOnlyProfile, makeNeed({ locationType: "remote" }))).toBe(true);
    expect(matchesLocation(remoteOnlyProfile, makeNeed({ locationType: "in_person", coordinates: { lat: 37.7509, lng: -122.4153 } }))).toBe(
      false
    );
  });
});

describe("isMatch / getMatchReason", () => {
  it("requires both skill and location to match", () => {
    const profile = makeProfile({ skills: ["photographer"] });
    const need = makeNeed({ skillSlug: "dj" });
    expect(isMatch(profile, need)).toBe(false);
    expect(getMatchReason(profile, need)).toBeNull();
  });

  it("gives a human-readable reason on match", () => {
    const profile = makeProfile();
    const need = makeNeed();
    const reason = getMatchReason(profile, need);
    expect(reason).toContain("DJ");
    expect(reason).toContain("San Francisco");
  });

  it("returns null reason when skill doesn't match even if location would", () => {
    const profile = makeProfile({ skills: ["photographer"] });
    expect(getMatchReason(profile, makeNeed())).toBeNull();
  });
});

function makeBid(overrides: Partial<Pick<VendorProposal, "proposedAmount" | "pricingModel" | "status">>) {
  return { proposedAmount: 500, pricingModel: "flat_fee" as const, status: "submitted" as const, ...overrides };
}

describe("computeCompetitiveBidSummary", () => {
  it("returns nulls and zero bids for no proposals", () => {
    const summary = computeCompetitiveBidSummary([]);
    expect(summary).toEqual({
      totalBids: 0,
      lowestActiveAmount: null,
      highestActiveAmount: null,
      medianActiveAmount: null,
      pricingModelsRepresented: [],
    });
  });

  it("ignores withdrawn/declined/expired proposals", () => {
    const summary = computeCompetitiveBidSummary([
      makeBid({ proposedAmount: 100, status: "withdrawn" }),
      makeBid({ proposedAmount: 200, status: "declined" }),
      makeBid({ proposedAmount: 300, status: "expired" }),
      makeBid({ proposedAmount: 400, status: "submitted" }),
    ]);
    expect(summary.totalBids).toBe(1);
    expect(summary.lowestActiveAmount).toBe(400);
  });

  it("counts in_discussion proposals as active", () => {
    const summary = computeCompetitiveBidSummary([
      makeBid({ proposedAmount: 400, status: "in_discussion" }),
      makeBid({ proposedAmount: 600, status: "submitted" }),
    ]);
    expect(summary.totalBids).toBe(2);
    expect(summary.lowestActiveAmount).toBe(400);
  });

  it("computes lowest/highest for two active bids", () => {
    const summary = computeCompetitiveBidSummary([
      makeBid({ proposedAmount: 300 }),
      makeBid({ proposedAmount: 700 }),
    ]);
    expect(summary.lowestActiveAmount).toBe(300);
    expect(summary.highestActiveAmount).toBe(700);
    expect(summary.medianActiveAmount).toBeNull(); // fewer than 3, withheld for anonymity
  });

  it("computes median once there are 3+ active bids", () => {
    const summary = computeCompetitiveBidSummary([
      makeBid({ proposedAmount: 300 }),
      makeBid({ proposedAmount: 500 }),
      makeBid({ proposedAmount: 700 }),
    ]);
    expect(summary.medianActiveAmount).toBe(500);
  });

  it("lists distinct pricing models represented", () => {
    const summary = computeCompetitiveBidSummary([
      makeBid({ pricingModel: "flat_fee" }),
      makeBid({ pricingModel: "hourly" }),
      makeBid({ pricingModel: "flat_fee" }),
    ]);
    expect(summary.pricingModelsRepresented.sort()).toEqual(["flat_fee", "hourly"]);
  });

  it("never includes vendor-identifying fields in its output shape", () => {
    const summary = computeCompetitiveBidSummary([makeBid({})]);
    expect(Object.keys(summary)).toEqual([
      "totalBids",
      "lowestActiveAmount",
      "highestActiveAmount",
      "medianActiveAmount",
      "pricingModelsRepresented",
    ]);
  });
});
