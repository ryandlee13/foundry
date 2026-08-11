import type { VendorSkillSlug } from "@/lib/types/vendors";
import { getSkillName, isRemoteEligible } from "./skills";

/**
 * A vendor may only claim "I work solely remotely" when every one of their
 * selected skills can reasonably be delivered off-site (skills.ts's
 * remoteEligible flag) — a DJ or bartender must not be able to claim this.
 */
export function canOfferRemoteOnly(skills: VendorSkillSlug[]): boolean {
  return skills.length > 0 && skills.every((skill) => isRemoteEligible(skill));
}

/** Human-readable names of the skills currently blocking remote-only, for inline UI copy. */
export function getRemoteBlockingSkillNames(skills: VendorSkillSlug[]): string[] {
  return skills.filter((skill) => !isRemoteEligible(skill)).map((skill) => getSkillName(skill));
}

/**
 * If the vendor's skill selection changes to include a non-remote-eligible
 * skill while remoteOnly was true, turn it back off rather than leaving a
 * stale, now-invalid claim. Call this whenever `skills` changes.
 */
export function reconcileRemoteOnly(skills: VendorSkillSlug[], remoteOnly: boolean): boolean {
  return remoteOnly && canOfferRemoteOnly(skills);
}
