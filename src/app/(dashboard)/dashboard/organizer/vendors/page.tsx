import type { Metadata } from "next";
import OrganizerVendorsTab from "@/components/vendor/OrganizerVendorsTab";

export const metadata: Metadata = {
  title: "Vendors — Foundry",
};

/**
 * The planner's Vendors tab. Requests for an event that doesn't exist yet live
 * at `/dashboard/organizer/vendors/unassigned` — still built, still unlinked
 * (see CLAUDE.md's "hide vendors without an event" note).
 */
export default function OrganizerVendorsRoute() {
  return <OrganizerVendorsTab />;
}
