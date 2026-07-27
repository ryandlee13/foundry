import type { EventNeed } from "@/lib/types/vendors";
import { publishEventNeed } from "./eventNeeds";
import { getPublishedVendorProfiles } from "./profiles";
import { isMatch } from "./matching";
import { createNotificationsForMany } from "./notifications";
import { getSkillName } from "./skills";

/**
 * Publishing orchestration for an organizer's vendor request: saves the
 * status change, matches eligible vendors by skill/location/remote
 * preference, and creates one in-app notification per eligible vendor who
 * opted into the relevant category — skipping anyone already notified for
 * this need (see createNotificationsForMany's de-dup) and anyone who opted
 * out. "Email" notification is a stored preference only in this prototype;
 * no email is actually sent (no server exists to send from — see CLAUDE.md).
 */
export function publishEventNeedAndNotifyVendors(needId: string): EventNeed | undefined {
  const need = publishEventNeed(needId);
  if (!need) return undefined;

  const eligibleVendors = getPublishedVendorProfiles().filter((profile) => {
    if (!isMatch(profile, need)) return false;
    if (!profile.notificationPreferences.inAppEnabled) return false;

    const category = need.locationType === "remote" ? "remote_gigs" : "matching_gigs";
    if (!profile.notificationPreferences.categories[category]) return false;

    const scope = profile.notificationPreferences.matchScope;
    if (scope === "all") return true;
    if (scope === "remote") return need.locationType === "remote";
    if (scope === "selected_cities") {
      return profile.location.citiesServed.some((city) => city.toLowerCase() === need.publicLocation.toLowerCase());
    }
    // "home_area": already guaranteed by isMatch()'s radius/remote check above.
    return true;
  });

  createNotificationsForMany(
    eligibleVendors.map((profile) => profile.ownerId),
    {
      type: "new_matching_gig",
      title: `New ${getSkillName(need.skillSlug)} opportunity`,
      body: `"${need.title}" in ${need.publicLocation} is looking for a ${getSkillName(need.skillSlug)}.`,
      link: `/dashboard/vendor/gigs/${need.id}`,
    }
  );

  return need;
}
