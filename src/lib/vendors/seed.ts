import * as authStorage from "@/lib/auth/storage";
import { VENUES } from "@/lib/spaces/venues";
import { addBooking, updateBookingStatus } from "@/lib/spaces/bookings";
import { SF_LOCATIONS } from "@/lib/spaces/locations";
import {
  createDraftVendorProfile,
  updateVendorProfile,
  getVendorProfileByOwnerId,
  approveVendorProfile,
} from "./profiles";
import { createDraftEventNeed, publishEventNeed, getEventNeedsForOrganizer } from "./eventNeeds";
import { createProposal, getProposalsForVendor, declineProposal } from "./proposals";
import { acceptProposal, completeEngagement } from "./engagements";
import { createReview } from "./reviews";
import { computeExpiresAt } from "./expiration";
import type {
  ExperienceLevel,
  PricingModel,
  VendorProfile,
  VendorProposal,
  VendorSkillSlug,
} from "@/lib/types/vendors";

/**
 * Development-only fictional demo data for the vendor marketplace — clearly
 * invented names/events, not real people or businesses. Never call this
 * automatically or in production; it's wired to a manually-triggered dev
 * page (src/app/dev/seed-vendors/page.tsx) that itself checks
 * NODE_ENV !== "production" before rendering.
 */

const PROPOSALS_KEY = "foundry.vendors.proposals";

function neighborhood(label: string) {
  const loc = SF_LOCATIONS.find((l) => l.label === label);
  if (!loc) throw new Error(`Unknown seed neighborhood: ${label}`);
  return loc;
}

interface VendorSeed {
  name: string;
  email: string;
  skill: VendorSkillSlug;
  neighborhood: string;
  description: string;
  years: number;
  portfolioUrl: string;
  portfolioProviderHint: string;
  remote: boolean;
  pricingModel: PricingModel;
  price: number;
  experience: ExperienceLevel;
}

const VENDOR_SEEDS: VendorSeed[] = [
  { name: "Marcus Alvarez", email: "demo-vendor-1@example.com", skill: "dj", neighborhood: "Mission District", description: "Open-format DJ known for reading a room fast — warehouse parties to rooftop weddings.", years: 6, portfolioUrl: "https://soundcloud.com/demo-marcus-sets", portfolioProviderHint: "Recent set", remote: false, pricingModel: "flat_fee", price: 500, experience: "experienced" },
  { name: "Priya Chandra", email: "demo-vendor-2@example.com", skill: "photographer", neighborhood: "Dogpatch", description: "Documentary-style event photography for brand launches and private parties.", years: 8, portfolioUrl: "https://priyachandraphoto.example.com", portfolioProviderHint: "Portfolio site", remote: false, pricingModel: "hourly", price: 150, experience: "veteran" },
  { name: "Devon Lee", email: "demo-vendor-3@example.com", skill: "videographer", neighborhood: "SoMa", description: "Highlight reels and same-day edits for corporate and nightlife events.", years: 5, portfolioUrl: "https://vimeo.com/demo-devon-reel", portfolioProviderHint: "Highlight reel", remote: false, pricingModel: "day_rate", price: 900, experience: "experienced" },
  { name: "Sasha Kim", email: "demo-vendor-4@example.com", skill: "graphic_designer", neighborhood: "Hayes Valley", description: "Brand identity and event collateral — flyers, signage, social kits.", years: 4, portfolioUrl: "https://dribbble.com/demo-sasha", portfolioProviderHint: "Dribbble shots", remote: true, pricingModel: "package", price: 600, experience: "intermediate" },
  { name: "Jordan Ellis", email: "demo-vendor-5@example.com", skill: "event_producer", neighborhood: "Financial District", description: "Full-service production for brand activations, from vendor coordination to run-of-show.", years: 10, portfolioUrl: "https://jordanellisproduction.example.com", portfolioProviderHint: "Case studies", remote: false, pricingModel: "flat_fee", price: 2200, experience: "veteran" },
  { name: "Camila Torres", email: "demo-vendor-6@example.com", skill: "chef", neighborhood: "North Beach", description: "Private chef for intimate dinners and tasting menus, seasonal California cuisine.", years: 7, portfolioUrl: "https://instagram.com/demo-chef-camila", portfolioProviderHint: "Menu photos", remote: false, pricingModel: "flat_fee", price: 1200, experience: "experienced" },
  { name: "Anthony Ricci", email: "demo-vendor-7@example.com", skill: "caterer", neighborhood: "Potrero Hill", description: "Full-service catering for corporate and social events, 20 to 300 guests.", years: 12, portfolioUrl: "https://riccicatering.example.com", portfolioProviderHint: "Sample menus", remote: false, pricingModel: "package", price: 3500, experience: "veteran" },
  { name: "Nia Robinson", email: "demo-vendor-8@example.com", skill: "bartender", neighborhood: "Marina", description: "Craft cocktail service and mobile bar setup for private events.", years: 5, portfolioUrl: "https://instagram.com/demo-bartender-nia", portfolioProviderHint: "Cocktail menu", remote: false, pricingModel: "hourly", price: 65, experience: "experienced" },
  { name: "Ben Foster", email: "demo-vendor-9@example.com", skill: "bartender", neighborhood: "Tenderloin", description: "Full-bar mobile service with a focus on classic cocktails and fast, friendly pours.", years: 9, portfolioUrl: "https://instagram.com/demo-bartender-ben", portfolioProviderHint: "Bar setups", remote: false, pricingModel: "hourly", price: 60, experience: "veteran" },
  { name: "Yuki Tanaka", email: "demo-vendor-10@example.com", skill: "sound_engineer", neighborhood: "Japantown", description: "Live sound mixing and PA setup for concerts, panels, and corporate events.", years: 6, portfolioUrl: "https://youtube.com/demo-yuki-mixes", portfolioProviderHint: "Live mixes", remote: false, pricingModel: "day_rate", price: 700, experience: "experienced" },
  { name: "Grace Whitfield", email: "demo-vendor-11@example.com", skill: "decorator", neighborhood: "Pacific Heights", description: "Event styling and installations — balloon arches, backdrops, tablescapes.", years: 4, portfolioUrl: "https://instagram.com/demo-decor-grace", portfolioProviderHint: "Recent installs", remote: false, pricingModel: "package", price: 800, experience: "intermediate" },
  { name: "Owen Baptiste", email: "demo-vendor-12@example.com", skill: "dj", neighborhood: "Castro", description: "High-energy DJ for nightlife and brand events, blends genres to keep floors full.", years: 4, portfolioUrl: "https://soundcloud.com/demo-owen-mixes", portfolioProviderHint: "Recent mix", remote: false, pricingModel: "flat_fee", price: 550, experience: "intermediate" },
];

interface NeedSeed {
  organizerEmail: string;
  organizerName: string;
  venueSlug: string;
  skill: VendorSkillSlug;
  title: string;
  description: string;
  deliverables: string;
  remote: boolean;
  daysFromNow: number;
  budgetMin: number;
  budgetMax: number;
  positions: number;
}

const NEED_SEEDS: NeedSeed[] = [
  { organizerEmail: "demo-organizer-1@example.com", organizerName: "Renee Park", venueSlug: "neon-foundry", skill: "dj", title: "Looking for a DJ — rooftop launch party", description: "Product launch party for 150 guests, need 4 hours of open-format music.", deliverables: "4-hour DJ set, own equipment", remote: false, daysFromNow: 30, budgetMin: 400, budgetMax: 650, positions: 1 },
  { organizerEmail: "demo-organizer-1@example.com", organizerName: "Renee Park", venueSlug: "concrete-garden", skill: "photographer", title: "Looking for a photographer — brand activation", description: "Half-day photo coverage of a brand activation event.", deliverables: "150+ edited photos within 5 business days", remote: false, daysFromNow: 21, budgetMin: 500, budgetMax: 900, positions: 1 },
  { organizerEmail: "demo-organizer-2@example.com", organizerName: "Marcus Webb", venueSlug: "skyline-atrium", skill: "caterer", title: "Looking for a caterer — corporate dinner", description: "Seated dinner for 80 guests, need full-service catering.", deliverables: "Plated 3-course dinner, service staff included", remote: false, daysFromNow: 45, budgetMin: 3000, budgetMax: 4500, positions: 1 },
  { organizerEmail: "demo-organizer-2@example.com", organizerName: "Marcus Webb", venueSlug: "redline-loft", skill: "sound_engineer", title: "Looking for a sound engineer — panel discussion", description: "Live sound for a 3-hour panel discussion with Q&A.", deliverables: "PA setup, 4 wireless mics, live mix", remote: false, daysFromNow: 14, budgetMin: 500, budgetMax: 800, positions: 1 },
  { organizerEmail: "demo-organizer-1@example.com", organizerName: "Renee Park", venueSlug: "glasshouse-social", skill: "bartender", title: "Looking for a bartender — engagement party", description: "Craft cocktail service for 60 guests.", deliverables: "4-hour bar service, 2 bartenders", remote: false, daysFromNow: 38, budgetMin: 400, budgetMax: 600, positions: 2 },
  { organizerEmail: "demo-organizer-2@example.com", organizerName: "Marcus Webb", venueSlug: "sanctuary-hall", skill: "decorator", title: "Looking for a decorator — gala dinner", description: "Full room styling for a nonprofit gala, 120 guests.", deliverables: "Tablescapes, stage backdrop, floral accents", remote: false, daysFromNow: 52, budgetMin: 700, budgetMax: 1100, positions: 1 },
  { organizerEmail: "demo-organizer-1@example.com", organizerName: "Renee Park", venueSlug: "harbor-room", skill: "graphic_designer", title: "Looking for a graphic designer — event branding", description: "Full event branding kit: invite, signage templates, social assets. Remote work is fine.", deliverables: "Brand kit delivered as source files + PDFs", remote: true, daysFromNow: 25, budgetMin: 400, budgetMax: 700, positions: 1 },
  { organizerEmail: "demo-organizer-2@example.com", organizerName: "Marcus Webb", venueSlug: "the-green-room", skill: "content_creator", title: "Looking for a content creator — product seeding event", description: "Same-day social content capture and same-week edited reels. Editing can be done remotely.", deliverables: "5 short-form videos, edited and captioned", remote: true, daysFromNow: 18, budgetMin: 350, budgetMax: 550, positions: 1 },
];

function getOrCreateAccount(name: string, email: string, role: "organizer" | "vendor") {
  const existing = authStorage.findAccountByEmail(email);
  if (existing) return existing;
  return authStorage.createAccount({ name, email, role });
}

function seedVendorProfile(seed: VendorSeed): VendorProfile {
  const account = getOrCreateAccount(seed.name, seed.email, "vendor");
  authStorage.addRoleToAccount(account.id, "vendor");

  const existing = getVendorProfileByOwnerId(account.id);
  const loc = neighborhood(seed.neighborhood);
  const [firstName, ...rest] = seed.name.split(" ");

  const base = existing ?? createDraftVendorProfile({ ownerId: account.id, firstName, lastName: rest.join(" "), displayName: seed.name });

  const updated = updateVendorProfile(base.id, {
    professionalDescription: seed.description,
    yearsExperience: seed.years,
    skills: [seed.skill],
    services: [
      {
        id: crypto.randomUUID(),
        skillSlug: seed.skill,
        title: "",
        description: "",
        pricingModel: seed.pricingModel,
        startingPrice: seed.price,
        pricingVisible: true,
        equipmentIncluded: "",
        experienceLevel: seed.experience,
        eventTypesServed: ["party", "corporate", "brand_activation"],
      },
    ],
    portfolioLinks: [
      { id: crypto.randomUUID(), url: seed.portfolioUrl, title: seed.portfolioProviderHint, description: "", provider: "other", displayOrder: 0 },
    ],
    location: {
      homeCity: seed.neighborhood,
      homeRegion: "CA",
      homePostalCode: "",
      coordinates: loc.coordinates,
      radiusMode: 25,
      radiusMiles: 25,
      willingToTravel: true,
      remoteAvailable: seed.remote,
      citiesServed: [],
      typicalAvailability: "Weekends, some weeknights",
      leadTimeDays: 5,
    },
  })!;

  approveVendorProfile(updated.id);
  return updated;
}

function seedEventNeed(seed: NeedSeed) {
  const organizer = getOrCreateAccount(seed.organizerName, seed.organizerEmail, "organizer");
  authStorage.addRoleToAccount(organizer.id, "organizer");

  const venue = VENUES.find((v) => v.slug === seed.venueSlug);
  if (!venue) throw new Error(`Unknown seed venue: ${seed.venueSlug}`);

  const eventDate = new Date(Date.now() + seed.daysFromNow * 24 * 60 * 60 * 1000);
  const eventDateStr = eventDate.toISOString().slice(0, 10);

  const existingNeeds = getEventNeedsForOrganizer(organizer.id).filter((n) => n.title === seed.title);
  if (existingNeeds.length > 0) return { need: existingNeeds[0], organizer, venue };

  const booking = addBooking({
    venueId: venue.id,
    venueName: venue.name,
    venueSlug: venue.slug,
    organizerId: organizer.id,
    organizerName: organizer.name,
    eventDate: eventDateStr,
    startTime: "18:00",
    endTime: "22:00",
    attendees: 100,
    coiAgreed: true,
    depositAgreed: true,
  });
  updateBookingStatus(booking.id, "confirmed");

  const need = createDraftEventNeed({
    bookingId: booking.id,
    organizerId: organizer.id,
    skillSlug: seed.skill,
    title: seed.title,
    description: seed.description,
    deliverables: seed.deliverables,
    locationType: seed.remote ? "remote" : "in_person",
    publicLocation: venue.neighborhood,
    coordinates: venue.coordinates,
    eventDate: eventDateStr,
    startTime: "18:00",
    endTime: "22:00",
    setupTime: null,
    estimatedAttendance: 100,
    positionsAvailable: seed.positions,
    budgetMin: seed.budgetMin,
    budgetMax: seed.budgetMax,
    preferredPricingModel: null,
    equipmentRequirements: "",
    experiencePreference: null,
    portfolioRequired: false,
    proposalDeadline: new Date(eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    allowQuestions: true,
    additionalNotes: "",
  });
  publishEventNeed(need.id);

  return { need, organizer, venue };
}

function backdateProposalExpiry(proposalId: string, daysAgo: number) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(PROPOSALS_KEY);
  if (!raw) return;
  const proposals = JSON.parse(raw) as VendorProposal[];
  const next = proposals.map((p) =>
    p.id === proposalId ? { ...p, expiresAt: computeExpiresAt(new Date(Date.now() - daysAgo * 86400000).toISOString(), 1) } : p
  );
  window.localStorage.setItem(PROPOSALS_KEY, JSON.stringify(next));
}

export interface SeedResult {
  vendorsCreated: number;
  needsCreated: number;
  proposalsCreated: number;
  engagementsCompleted: number;
}

/** Populates the browser's localStorage with fictional demo data. Idempotent-ish: re-running mostly reuses existing accounts/profiles rather than duplicating them. */
export function seedVendorMarketplaceDemoData(): SeedResult {
  const vendors = VENDOR_SEEDS.map(seedVendorProfile);
  const bySkill = new Map<VendorSkillSlug, VendorProfile[]>();
  for (const v of vendors) {
    for (const skill of v.skills) {
      bySkill.set(skill, [...(bySkill.get(skill) ?? []), v]);
    }
  }

  let proposalsCreated = 0;
  let engagementsCompleted = 0;

  NEED_SEEDS.forEach((seed, index) => {
    const { need } = seedEventNeed(seed);
    const matchingVendors = bySkill.get(seed.skill) ?? [];
    if (matchingVendors.length === 0) return;

    const existingProposals = getProposalsForVendor(matchingVendors[0].id).filter((p) => p.eventNeedId === need.id);
    if (existingProposals.length > 0) return; // already seeded this need

    // Rotate through a fixed pattern of outcomes across the 8 needs so every status is represented.
    const pattern = index % 4; // 0: accepted+completed+reviewed, 1: accepted (confirmed), 2: declined, 3: submitted (some backdated to expired)
    const vendor = matchingVendors[0];

    const proposal = createProposal({
      eventNeedId: need.id,
      vendorProfileId: vendor.id,
      proposedAmount: Math.round((seed.budgetMin + seed.budgetMax) / 2),
      pricingModel: vendor.services[0]?.pricingModel ?? "flat_fee",
      message: `I'd love to help with "${seed.title}" — this is exactly the kind of event I specialize in.`,
      deliverables: seed.deliverables,
      equipmentIncluded: "",
      availabilityConfirmed: true,
      setupRequirements: "",
      portfolioLinkIds: vendor.portfolioLinks.map((l) => l.id),
      questionsForOrganizer: "",
      expirationDays: 5,
    });
    proposalsCreated += 1;

    if (pattern === 0) {
      const { engagement } = acceptProposal(proposal.id);
      completeEngagement(engagement.id);
      engagementsCompleted += 1;
      createReview({
        engagementId: engagement.id,
        organizerId: need.organizerId,
        vendorProfileId: vendor.id,
        overallRating: 5,
        qualityRating: 5,
        communicationRating: 5,
        reliabilityRating: 4,
        professionalismRating: 5,
        valueRating: 4,
        reviewText: `${vendor.displayName.split(" ")[0]} was fantastic to work with — professional, on time, and the results exceeded expectations.`,
        wouldWorkWithAgain: true,
      });
    } else if (pattern === 1) {
      acceptProposal(proposal.id);
    } else if (pattern === 2) {
      declineProposal(proposal.id, "Went with another vendor for this event.");
    } else {
      backdateProposalExpiry(proposal.id, 2);
    }

    // Add a second, still-active competing bid on a couple of needs so the competitive bid summary has something to show.
    if (matchingVendors.length > 1 && (index === 0 || index === 4)) {
      createProposal({
        eventNeedId: need.id,
        vendorProfileId: matchingVendors[1].id,
        proposedAmount: Math.round((seed.budgetMin + seed.budgetMax) / 2) + 75,
        pricingModel: matchingVendors[1].services[0]?.pricingModel ?? "flat_fee",
        message: "Happy to bring my full setup for this one — available on the requested date.",
        deliverables: seed.deliverables,
        equipmentIncluded: "",
        availabilityConfirmed: true,
        setupRequirements: "",
        portfolioLinkIds: [],
        questionsForOrganizer: "",
        expirationDays: 7,
      });
      proposalsCreated += 1;
    }
  });

  return {
    vendorsCreated: vendors.length,
    needsCreated: NEED_SEEDS.length,
    proposalsCreated,
    engagementsCompleted,
  };
}
