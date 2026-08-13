import type { VendorSkillDefinition, VendorSkillSlug } from "@/lib/types/vendors";

/**
 * Standardized skill catalog. Mirrors the VENDOR_CATEGORIES list already used
 * as marketing copy on the homepage (src/app/page.tsx), extended to the full
 * set from docs/PRD.md's vendor scope.
 */
export const VENDOR_SKILLS: VendorSkillDefinition[] = [
  { slug: "dj", name: "DJ", description: "Music and sets for parties, weddings, and brand events.", remoteEligible: false, exampleServiceTitle: "4-hour open-format DJ set" },
  { slug: "photographer", name: "Photographer", description: "Event and portrait photography.", remoteEligible: false, exampleServiceTitle: "Half-day event photo coverage" },
  { slug: "videographer", name: "Videographer", description: "Event filming and highlight reels.", remoteEligible: false, exampleServiceTitle: "Highlight reel with same-week edit" },
  { slug: "graphic_designer", name: "Graphic Designer", description: "Flyers, brand assets, and event collateral.", remoteEligible: true, exampleServiceTitle: "Event branding kit — invite, signage, social" },
  { slug: "event_producer", name: "Event Producer", description: "End-to-end event planning and day-of production.", remoteEligible: false, exampleServiceTitle: "Full run-of-show production" },
  { slug: "chef", name: "Chef", description: "On-site or private cooking for events.", remoteEligible: false, exampleServiceTitle: "Seasonal tasting menu for 20" },
  { slug: "caterer", name: "Caterer", description: "Full-service food and beverage catering.", remoteEligible: false, exampleServiceTitle: "Plated three-course dinner with staff" },
  { slug: "bartender", name: "Bartender", description: "Mobile bar service and mixology.", remoteEligible: false, exampleServiceTitle: "4-hour craft cocktail bar service" },
  { slug: "security", name: "Security", description: "Event security and door staff.", remoteEligible: false, exampleServiceTitle: "Two door staff for a 200-guest event" },
  { slug: "sound_engineer", name: "Sound Engineer", description: "PA systems, mixing, and live sound.", remoteEligible: false, exampleServiceTitle: "PA setup and live mix" },
  { slug: "lighting_technician", name: "Lighting Technician", description: "Stage and ambient lighting design.", remoteEligible: false, exampleServiceTitle: "Stage wash and ambient lighting design" },
  { slug: "decorator", name: "Decorator", description: "Event styling, decor, and installations.", remoteEligible: false, exampleServiceTitle: "Full room styling and tablescapes" },
  { slug: "florist", name: "Florist", description: "Floral arrangements and installations.", remoteEligible: false, exampleServiceTitle: "Centerpieces and entry installation" },
  { slug: "furniture_rental", name: "Furniture Rental", description: "Tables, seating, and lounge furniture rentals.", remoteEligible: false, exampleServiceTitle: "Lounge seating package for 100" },
  { slug: "equipment_rental", name: "Equipment Rental", description: "AV, staging, and general equipment rentals.", remoteEligible: false, exampleServiceTitle: "Staging, AV, and power package" },
  { slug: "influencer", name: "Influencer", description: "Social promotion and event attendance.", remoteEligible: true, exampleServiceTitle: "Event attendance with 3 story posts" },
  { slug: "content_creator", name: "Content Creator", description: "Social content capture and editing.", remoteEligible: true, exampleServiceTitle: "Same-day social capture, 5 edited reels" },
  { slug: "sponsor", name: "Sponsor", description: "Brand sponsorship for events.", remoteEligible: true, exampleServiceTitle: "Beverage sponsorship for a 150-guest event" },
  { slug: "brand_activation_agency", name: "Brand Activation Agency", description: "Experiential brand activations.", remoteEligible: true, exampleServiceTitle: "Turnkey brand activation booth" },
  { slug: "photo_booth", name: "Photo Booth", description: "Photo booth rental and staffing.", remoteEligible: false, exampleServiceTitle: "3-hour photo booth with attendant and props" },
  { slug: "performer", name: "Performer", description: "Live performers — musicians, dancers, entertainers.", remoteEligible: false, exampleServiceTitle: "45-minute live set" },
  { slug: "instructor", name: "Instructor", description: "Workshop or class facilitation.", remoteEligible: true, exampleServiceTitle: "90-minute hands-on workshop" },
  { slug: "other", name: "Other", description: "Another event service not listed above.", remoteEligible: true, exampleServiceTitle: "Describe the service you offer" },
];

const SKILLS_BY_SLUG = new Map(VENDOR_SKILLS.map((skill) => [skill.slug, skill]));

export function getSkillBySlug(slug: VendorSkillSlug): VendorSkillDefinition {
  const skill = SKILLS_BY_SLUG.get(slug);
  if (!skill) throw new Error(`Unknown vendor skill slug: ${slug}`);
  return skill;
}

export function getSkillName(slug: VendorSkillSlug): string {
  return SKILLS_BY_SLUG.get(slug)?.name ?? slug;
}

export function isRemoteEligible(slug: VendorSkillSlug): boolean {
  return SKILLS_BY_SLUG.get(slug)?.remoteEligible ?? false;
}

export function getSkillExampleTitle(slug: VendorSkillSlug): string {
  return SKILLS_BY_SLUG.get(slug)?.exampleServiceTitle ?? "";
}

/**
 * Alphabetical by display name, with "Other" pinned last — it's a catch-all,
 * not a peer of the named skills, so sorting it under O buries real options.
 */
export function getSkillsAlphabetical(): VendorSkillDefinition[] {
  const named = VENDOR_SKILLS.filter((skill) => skill.slug !== "other");
  const other = VENDOR_SKILLS.filter((skill) => skill.slug === "other");
  return [...named.sort((a, b) => a.name.localeCompare(b.name)), ...other];
}

/**
 * Pure: type-ahead filter over the alphabetical catalog, excluding anything
 * already picked. Matches on name or description so "music" finds DJ.
 */
export function searchSkills(query: string, excludeSlugs: VendorSkillSlug[]): VendorSkillDefinition[] {
  const normalized = query.trim().toLowerCase();
  return getSkillsAlphabetical().filter((skill) => {
    if (excludeSlugs.includes(skill.slug)) return false;
    if (!normalized) return true;
    return (
      skill.name.toLowerCase().includes(normalized) || skill.description.toLowerCase().includes(normalized)
    );
  });
}
