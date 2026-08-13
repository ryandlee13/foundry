import type { PortfolioLink, VendorProfile, VendorProfileStatus } from "@/lib/types/vendors";
import { slugify, uniqueSlug } from "@/lib/spaces/slug";
import { buildPortfolioLink } from "./portfolioLinks";

/**
 * Browser-local vendor profiles — same prototype caveat as
 * src/lib/auth/storage.ts and src/lib/spaces/submittedVenues.ts. Services,
 * portfolio links, location, and notification preferences are embedded
 * directly on the profile record (rather than split into separate tables as
 * docs/DATABASE.md's real-schema proposal does) since there's no relational
 * database here — this mirrors how Venue already embeds its own rules/
 * amenities/photos rather than normalizing them in this layer.
 */
const VENDOR_PROFILES_KEY = "foundry.vendors.profiles";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getVendorProfiles(): VendorProfile[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(VENDOR_PROFILES_KEY);
    return raw ? (JSON.parse(raw) as VendorProfile[]) : [];
  } catch {
    return [];
  }
}

function saveVendorProfiles(profiles: VendorProfile[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(VENDOR_PROFILES_KEY, JSON.stringify(profiles));
}

export function getVendorProfileById(id: string): VendorProfile | undefined {
  return getVendorProfiles().find((profile) => profile.id === id);
}

export function getVendorProfileByOwnerId(ownerId: string): VendorProfile | undefined {
  return getVendorProfiles().find((profile) => profile.ownerId === ownerId);
}

export function getVendorProfileBySlug(slug: string): VendorProfile | undefined {
  return getVendorProfiles().find((profile) => profile.slug === slug);
}

export function getPublishedVendorProfiles(): VendorProfile[] {
  return getVendorProfiles().filter((profile) => profile.status === "published");
}

export function getPendingVendorProfiles(): VendorProfile[] {
  return getVendorProfiles().filter((profile) => profile.status === "pending_review");
}

function nextSlug(displayName: string): string {
  const existing = getVendorProfiles().map((profile) => profile.slug);
  return uniqueSlug(displayName, existing) || slugify(displayName);
}

const DEFAULT_NOTIFICATION_CATEGORIES: VendorProfile["notificationPreferences"]["categories"] = {
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
};

export function createDraftVendorProfile(input: {
  ownerId: string;
  firstName: string;
  lastName: string;
  displayName: string;
}): VendorProfile {
  const now = new Date().toISOString();
  const profile: VendorProfile = {
    id: crypto.randomUUID(),
    ownerId: input.ownerId,
    slug: nextSlug(input.displayName),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    displayName: input.displayName.trim(),
    profilePhoto: null,
    coverImage: null,
    professionalDescription: "",
    yearsExperience: 0,
    websiteUrl: "",
    instagramUrl: "",
    skills: [],
    services: [],
    portfolioLinks: [],
    location: {
      homeCity: "San Francisco",
      homeRegion: "CA",
      homePostalCode: "",
      coordinates: { lat: 37.7749, lng: -122.4194 },
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
      categories: { ...DEFAULT_NOTIFICATION_CATEGORIES },
      skillSlugs: [],
      matchScope: "home_area",
    },
    status: "draft",
    rejectionReason: null,
    averageRating: null,
    reviewCount: 0,
    completedEventCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  saveVendorProfiles([...getVendorProfiles(), profile]);
  return profile;
}

export function updateVendorProfile(id: string, patch: Partial<VendorProfile>): VendorProfile | undefined {
  const profiles = getVendorProfiles();
  const index = profiles.findIndex((profile) => profile.id === id);
  if (index === -1) return undefined;

  const updated: VendorProfile = {
    ...profiles[index],
    ...patch,
    id: profiles[index].id,
    ownerId: profiles[index].ownerId,
    updatedAt: new Date().toISOString(),
  };
  const next = [...profiles];
  next[index] = updated;
  saveVendorProfiles(next);
  return updated;
}

export interface PublishReadiness {
  ready: boolean;
  missing: string[];
}

/**
 * Mirrors the "clearly explain missing requirements before publishing"
 * requirement. Portfolio links are NOT required — a vendor may publish with
 * only a description, at least one skill, and a display name (see CLAUDE.md
 * rule #8's scoped exception; website/Instagram/portfolio links are all
 * optional extras, not a publish gate).
 */
export function getPublishReadiness(profile: VendorProfile): PublishReadiness {
  const missing: string[] = [];
  if (!profile.professionalDescription.trim()) missing.push("Professional description");
  if (profile.skills.length === 0) missing.push("At least one skill");
  if (!profile.displayName.trim()) missing.push("Professional display name");
  return { ready: missing.length === 0, missing };
}

/**
 * Publishes a draft/rejected profile immediately — no admin review step (see
 * CLAUDE.md rule #8's scoped exception, reversed for vendor profiles by
 * explicit user direction). Admin retains the ability to reject/suspend an
 * already-published profile via rejectVendorProfile()/suspendVendorProfile().
 */
export function publishVendorProfile(id: string): VendorProfile | undefined {
  const profile = getVendorProfileById(id);
  if (!profile) return undefined;
  const readiness = getPublishReadiness(profile);
  if (!readiness.ready) {
    throw new Error(`Profile is missing required fields: ${readiness.missing.join(", ")}`);
  }
  return updateVendorProfile(id, { status: "published", rejectionReason: null });
}

export function saveVendorProfileDraft(id: string, patch: Partial<VendorProfile>): VendorProfile | undefined {
  return updateVendorProfile(id, patch);
}

/**
 * The vendor's own "make me private" control — back to `draft`, so the
 * profile stops appearing in Discover Vendors.
 *
 * Deliberately refuses to touch a `rejected`/`suspended` profile: those are
 * admin moderation states, and letting a vendor flip out of one and back to
 * `published` via unhide/publish would be a way to self-clear a suspension.
 */
export function unpublishVendorProfile(id: string): VendorProfile | undefined {
  const profile = getVendorProfileById(id);
  if (!profile) return undefined;
  if (profile.status !== "published") return profile;
  return updateVendorProfile(id, { status: "draft" });
}

/** Whether the vendor may flip their own visibility (moderated profiles may not). */
export function canToggleOwnVisibility(profile: VendorProfile): boolean {
  return profile.status === "published" || profile.status === "draft";
}

function setStatus(id: string, status: VendorProfileStatus, rejectionReason: string | null = null): VendorProfile | undefined {
  return updateVendorProfile(id, { status, rejectionReason });
}

export function approveVendorProfile(id: string): VendorProfile | undefined {
  return setStatus(id, "published", null);
}

export function rejectVendorProfile(id: string, reason: string): VendorProfile | undefined {
  return setStatus(id, "rejected", reason);
}

export function suspendVendorProfile(id: string, reason: string): VendorProfile | undefined {
  return setStatus(id, "suspended", reason);
}

/**
 * Adds a portfolio link "just for this bid" — saved to the vendor's profile
 * (not a bid-scoped fork) so it's reusable on future bids too, per the
 * codebase's "every vendor entity lives in one profile" convention.
 */
export function addPortfolioLinkToProfile(
  vendorProfileId: string,
  link: Pick<PortfolioLink, "url" | "title" | "description">
): PortfolioLink | undefined {
  const profile = getVendorProfileById(vendorProfileId);
  if (!profile) return undefined;

  const newLink = buildPortfolioLink({ ...link, displayOrder: profile.portfolioLinks.length });
  updateVendorProfile(vendorProfileId, { portfolioLinks: [...profile.portfolioLinks, newLink] });
  return newLink;
}
