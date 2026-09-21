import type { VendorSkillDefinition, VendorSkillSlug } from "@/lib/types/vendors";

/**
 * Standardized skill catalog, stored alphabetically by display name so the
 * array reads in the same order every picker renders it.
 *
 * Trimmed from an earlier 23 to these 13. The dropped categories (rentals,
 * sponsorship, instruction, performers, sound, production) were speculative
 * scope with nothing behind them yet. There is deliberately no "Other"
 * catch-all right now, which means a vendor outside these categories cannot
 * onboard at all — a real gap to reopen before launch, not an oversight.
 */
export const VENDOR_SKILLS: VendorSkillDefinition[] = [
  { slug: "bartender", name: "Bartender", description: "Mobile bar service and mixology.", remoteEligible: false, exampleServiceTitle: "4-hour craft cocktail bar service" },
  { slug: "caterer", name: "Caterer", description: "Full-service food and beverage catering.", remoteEligible: false, exampleServiceTitle: "Plated three-course dinner with staff" },
  { slug: "chef", name: "Chef", description: "On-site or private cooking for events.", remoteEligible: false, exampleServiceTitle: "Seasonal tasting menu for 20" },
  { slug: "content_creator", name: "Content Creator", description: "Social content capture and editing.", remoteEligible: true, exampleServiceTitle: "Same-day social capture, 5 edited reels" },
  { slug: "decorator", name: "Decorator", description: "Event styling, decor, and installations.", remoteEligible: false, exampleServiceTitle: "Full room styling and tablescapes" },
  { slug: "dj", name: "DJ", description: "Music and sets for parties, weddings, and brand events.", remoteEligible: false, exampleServiceTitle: "4-hour open-format DJ set" },
  { slug: "florist", name: "Florist", description: "Floral arrangements and installations.", remoteEligible: false, exampleServiceTitle: "Centerpieces and entry installation" },
  { slug: "graphic_designer", name: "Graphic Designer", description: "Flyers, brand assets, and event collateral.", remoteEligible: true, exampleServiceTitle: "Event branding kit — invite, signage, social" },
  { slug: "lighting_technician", name: "Lighting", description: "Stage and ambient lighting design.", remoteEligible: false, exampleServiceTitle: "Stage wash and ambient lighting design" },
  { slug: "photo_booth", name: "Photo Booth", description: "Photo booth rental and staffing.", remoteEligible: false, exampleServiceTitle: "3-hour photo booth with attendant and props" },
  { slug: "photographer", name: "Photographer", description: "Event and portrait photography.", remoteEligible: false, exampleServiceTitle: "Half-day event photo coverage" },
  { slug: "security", name: "Security", description: "Event security and door staff.", remoteEligible: false, exampleServiceTitle: "Two door staff for a 200-guest event" },
  { slug: "videographer", name: "Videographer", description: "Event filming and highlight reels.", remoteEligible: false, exampleServiceTitle: "Highlight reel with same-week edit" },
];

const SKILLS_BY_SLUG = new Map(VENDOR_SKILLS.map((skill) => [skill.slug, skill]));

export function getSkillBySlug(slug: VendorSkillSlug): VendorSkillDefinition {
  const skill = SKILLS_BY_SLUG.get(slug);
  if (!skill) throw new Error(`Unknown vendor skill slug: ${slug}`);
  return skill;
}

/**
 * Falls back to the raw slug rather than throwing, so a profile or event need
 * stored against a category that has since been removed still renders instead
 * of taking the page down.
 */
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
 * Alphabetical by display name. Sorts rather than trusting the array order so
 * the guarantee survives someone appending a skill to the end of the catalog.
 */
export function getSkillsAlphabetical(): VendorSkillDefinition[] {
  return [...VENDOR_SKILLS].sort((a, b) => a.name.localeCompare(b.name));
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
