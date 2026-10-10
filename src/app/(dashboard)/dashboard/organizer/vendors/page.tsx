import type { Metadata } from "next";
import OrganizerVendorsTab from "@/components/vendor/OrganizerVendorsTab";

export const metadata: Metadata = {
  title: "Vendors — Foundry",
};

/**
 * The planner's Vendors tab. Requests for an event that doesn't exist yet live
 * at `/dashboard/organizer/vendors/unassigned`, reached from the panel at the
 * top of this page.
 */
export default async function OrganizerVendorsRoute({
  searchParams,
}: {
  /** `?post=1` opens the post-a-request form on arrival — set by the homepage hero's "Create a posting" flow. */
  searchParams: Promise<{ post?: string }>;
}) {
  const { post } = await searchParams;
  return <OrganizerVendorsTab autoOpenBuilder={post === "1"} />;
}
