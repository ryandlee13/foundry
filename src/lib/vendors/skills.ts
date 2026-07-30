import type { VendorSkillDefinition, VendorSkillSlug } from "@/lib/types/vendors";

/**
 * Standardized skill catalog. Mirrors the VENDOR_CATEGORIES list already used
 * as marketing copy on the homepage (src/app/page.tsx), extended to the full
 * set from docs/PRD.md's vendor scope.
 */
export const VENDOR_SKILLS: VendorSkillDefinition[] = [
  { slug: "dj", name: "DJ", description: "Music and sets for parties, weddings, and brand events.", remoteEligible: false },
  { slug: "photographer", name: "Photographer", description: "Event and portrait photography.", remoteEligible: false },
  { slug: "videographer", name: "Videographer", description: "Event filming and highlight reels.", remoteEligible: false },
  { slug: "graphic_designer", name: "Graphic Designer", description: "Flyers, brand assets, and event collateral.", remoteEligible: true },
  { slug: "event_producer", name: "Event Producer", description: "End-to-end event planning and day-of production.", remoteEligible: false },
  { slug: "chef", name: "Chef", description: "On-site or private cooking for events.", remoteEligible: false },
  { slug: "caterer", name: "Caterer", description: "Full-service food and beverage catering.", remoteEligible: false },
  { slug: "bartender", name: "Bartender", description: "Mobile bar service and mixology.", remoteEligible: false },
  { slug: "security", name: "Security", description: "Event security and door staff.", remoteEligible: false },
  { slug: "sound_engineer", name: "Sound Engineer", description: "PA systems, mixing, and live sound.", remoteEligible: false },
  { slug: "lighting_technician", name: "Lighting Technician", description: "Stage and ambient lighting design.", remoteEligible: false },
  { slug: "decorator", name: "Decorator", description: "Event styling, decor, and installations.", remoteEligible: false },
  { slug: "florist", name: "Florist", description: "Floral arrangements and installations.", remoteEligible: false },
  { slug: "furniture_rental", name: "Furniture Rental", description: "Tables, seating, and lounge furniture rentals.", remoteEligible: false },
  { slug: "equipment_rental", name: "Equipment Rental", description: "AV, staging, and general equipment rentals.", remoteEligible: false },
  { slug: "influencer", name: "Influencer", description: "Social promotion and event attendance.", remoteEligible: true },
  { slug: "content_creator", name: "Content Creator", description: "Social content capture and editing.", remoteEligible: true },
  { slug: "sponsor", name: "Sponsor", description: "Brand sponsorship for events.", remoteEligible: true },
  { slug: "brand_activation_agency", name: "Brand Activation Agency", description: "Experiential brand activations.", remoteEligible: true },
  { slug: "photo_booth", name: "Photo Booth", description: "Photo booth rental and staffing.", remoteEligible: false },
  { slug: "performer", name: "Performer", description: "Live performers — musicians, dancers, entertainers.", remoteEligible: false },
  { slug: "instructor", name: "Instructor", description: "Workshop or class facilitation.", remoteEligible: true },
  { slug: "other", name: "Other", description: "Another event service not listed above.", remoteEligible: true },
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
