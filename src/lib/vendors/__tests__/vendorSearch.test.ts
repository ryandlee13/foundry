import { describe, expect, it } from "vitest";
import {
  assessBudgetFit,
  briefToSearchParams,
  daysUntil,
  filterVendorsByBrief,
  getEmptyBrief,
  hasBriefContext,
  matchesCategory,
  meetsLeadTime,
  searchParamsToBrief,
} from "../vendorSearch";
import type { PricingModel, VendorProfile, VendorService } from "@/lib/types/vendors";

function makeService(overrides: Partial<VendorService> = {}): VendorService {
  return {
    id: "service-1",
    skillSlug: "dj",
    title: "Open-format set",
    description: "",
    pricingModel: "flat_fee",
    startingPrice: 1000,
    pricingVisible: true,
    equipmentIncluded: "",
    experienceLevel: "experienced",
    eventTypesServed: [],
    ...overrides,
  };
}

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

describe("brief URL round-trip", () => {
  it("survives a full round-trip through search params", () => {
    const brief = {
      skillSlug: "photographer" as const,
      eventDate: "2026-11-14",
      location: "San Francisco, CA",
      guestCount: 120,
      budget: 2500,
      description: "Four hours of candid coverage, gallery within two weeks.",
    };

    expect(searchParamsToBrief(briefToSearchParams(brief))).toEqual(brief);
  });

  it("omits empty fields from the query string", () => {
    const params = briefToSearchParams(getEmptyBrief());
    expect(params.get("category")).toBeNull();
    expect(params.get("guests")).toBeNull();
    expect(params.get("budget")).toBeNull();
    expect(params.get("needs")).toBeNull();
  });

  it("rejects an unknown category rather than trusting the URL", () => {
    const brief = searchParamsToBrief(new URLSearchParams("category=alchemist"));
    expect(brief.skillSlug).toBeNull();
  });

  it("rejects non-positive and non-numeric guest counts and budgets", () => {
    const brief = searchParamsToBrief(new URLSearchParams("guests=0&budget=-50"));
    expect(brief.guestCount).toBeNull();
    expect(brief.budget).toBeNull();

    const junk = searchParamsToBrief(new URLSearchParams("guests=lots&budget=cheap"));
    expect(junk.guestCount).toBeNull();
    expect(junk.budget).toBeNull();
  });

  it("does not treat the default location alone as context", () => {
    expect(hasBriefContext(getEmptyBrief())).toBe(false);
    expect(hasBriefContext({ ...getEmptyBrief(), skillSlug: "florist" })).toBe(true);
    expect(hasBriefContext({ ...getEmptyBrief(), description: "  " })).toBe(false);
  });
});

describe("matchesCategory", () => {
  it("keeps everyone when no category is chosen", () => {
    expect(matchesCategory(makeProfile(), null)).toBe(true);
  });

  it("matches on any of the vendor's skills", () => {
    const vendor = makeProfile({ skills: ["dj", "photographer"] });
    expect(matchesCategory(vendor, "photographer")).toBe(true);
    expect(matchesCategory(vendor, "florist")).toBe(false);
  });
});

describe("assessBudgetFit", () => {
  const rateModels: PricingModel[] = ["hourly", "day_rate"];

  it("compares flat-fee and package prices against the budget", () => {
    const vendor = makeProfile({ services: [makeService({ startingPrice: 800 })] });
    expect(assessBudgetFit(vendor, "dj", 1000)).toBe("within");
    expect(assessBudgetFit(vendor, "dj", 500)).toBe("over");
  });

  it("uses the cheapest comparable service, not the first", () => {
    const vendor = makeProfile({
      services: [
        makeService({ id: "a", startingPrice: 3000 }),
        makeService({ id: "b", startingPrice: 600, pricingModel: "package" }),
      ],
    });
    expect(assessBudgetFit(vendor, "dj", 1000)).toBe("within");
  });

  it.each(rateModels)("treats a %s price as unknown, never as over budget", (pricingModel) => {
    // A rate is not a total — the same trap computeRosterSpend() guards against.
    const vendor = makeProfile({
      services: [makeService({ pricingModel, startingPrice: 400 })],
    });
    expect(assessBudgetFit(vendor, "dj", 100)).toBe("unknown");
  });

  it("treats contact-for-quote and unset prices as unknown", () => {
    const quote = makeProfile({
      services: [makeService({ pricingModel: "contact_for_quote", startingPrice: null })],
    });
    expect(assessBudgetFit(quote, "dj", 100)).toBe("unknown");

    const unpriced = makeProfile({ services: [makeService({ startingPrice: null })] });
    expect(assessBudgetFit(unpriced, "dj", 100)).toBe("unknown");
  });

  it("ignores services outside the chosen category", () => {
    const vendor = makeProfile({
      skills: ["dj", "photographer"],
      services: [
        makeService({ id: "dj", skillSlug: "dj", startingPrice: 5000 }),
        makeService({ id: "photo", skillSlug: "photographer", startingPrice: 900 }),
      ],
    });
    expect(assessBudgetFit(vendor, "photographer", 1000)).toBe("within");
    expect(assessBudgetFit(vendor, "dj", 1000)).toBe("over");
  });

  it("is unknown when no budget was given", () => {
    const vendor = makeProfile({ services: [makeService({ startingPrice: 9999 })] });
    expect(assessBudgetFit(vendor, "dj", null)).toBe("unknown");
  });
});

describe("daysUntil", () => {
  it("counts whole days forward", () => {
    expect(daysUntil("2026-09-14", "2026-09-21")).toBe(7);
    expect(daysUntil("2026-09-14", "2026-09-14")).toBe(0);
    expect(daysUntil("2026-09-21", "2026-09-14")).toBe(-7);
  });

  it("is not thrown off by a DST boundary", () => {
    // US DST ends 2026-11-01; a naive midnight-based diff reports 0 or 2 here.
    expect(daysUntil("2026-10-31", "2026-11-01")).toBe(1);
    expect(daysUntil("2026-10-25", "2026-11-05")).toBe(11);
  });

  it("returns null for an unparseable date", () => {
    expect(daysUntil("2026-09-14", "not-a-date")).toBeNull();
  });
});

describe("meetsLeadTime", () => {
  const today = "2026-09-14";

  it("excludes a vendor whose notice period is longer than the runway", () => {
    const vendor = makeProfile({
      location: { ...makeProfile().location, leadTimeDays: 14 },
    });
    expect(meetsLeadTime(vendor, "2026-09-20", today)).toBe(false);
    expect(meetsLeadTime(vendor, "2026-09-28", today)).toBe(true);
  });

  it("includes everyone when no date was given", () => {
    const vendor = makeProfile({
      location: { ...makeProfile().location, leadTimeDays: 30 },
    });
    expect(meetsLeadTime(vendor, null, today)).toBe(true);
  });

  it("does not empty the results for a past date", () => {
    const vendor = makeProfile({
      location: { ...makeProfile().location, leadTimeDays: 30 },
    });
    expect(meetsLeadTime(vendor, "2026-01-01", today)).toBe(true);
  });
});

describe("filterVendorsByBrief", () => {
  const today = "2026-09-14";

  it("applies category, budget, and lead time together", () => {
    const cheapDj = makeProfile({
      id: "cheap-dj",
      services: [makeService({ startingPrice: 800 })],
    });
    const pricyDj = makeProfile({
      id: "pricy-dj",
      services: [makeService({ startingPrice: 4000 })],
    });
    const slowDj = makeProfile({
      id: "slow-dj",
      services: [makeService({ startingPrice: 800 })],
      location: { ...makeProfile().location, leadTimeDays: 60 },
    });
    const florist = makeProfile({ id: "florist", skills: ["florist"] });

    const results = filterVendorsByBrief([cheapDj, pricyDj, slowDj, florist], {
      ...getEmptyBrief(),
      skillSlug: "dj",
      eventDate: "2026-10-01",
      budget: 1500,
    }, today);

    expect(results.map((vendor) => vendor.id)).toEqual(["cheap-dj"]);
  });

  it("does not filter on guest count or description", () => {
    const vendor = makeProfile();
    const results = filterVendorsByBrief([vendor], {
      ...getEmptyBrief(),
      guestCount: 5000,
      description: "something no vendor profile mentions anywhere",
    }, today);

    expect(results).toHaveLength(1);
  });
});
